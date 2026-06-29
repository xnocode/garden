/**
 * Data access layer for the digital garden.
 *
 * All functions read from the Prisma database (populated by `bun run publish`).
 * Used by both the server-rendered page (src/app/page.tsx) and the API routes.
 */

import { db } from "@/lib/db";
import type { WikiLinkTarget } from "@/lib/markdown";

export interface NoteSummary {
  slug: string;
  title: string;
  description: string | null;
  tags: string[];
  aliases: string[];
  wordCount: number;
  publishDate: string | null;
  createdAt: string;
  updatedAt: string;
  path: string;
  folder: string | null;
}

export interface RelatedNote extends NoteSummary {
  /** Reason for the relation: "shared-tags", "2-hop", or "shared-links". */
  reason: "shared-tags" | "2-hop" | "shared-links";
  /** Score used for ranking (higher = more related). */
  score: number;
}

export interface BacklinkNote extends NoteSummary {
  /** The sentence(s) in the backlink note that reference the current note. */
  context: string | null;
}

export interface NoteDetail extends NoteSummary {
  content: string;
  html: string;
  links: WikiLinkTarget[];
  backlinks: BacklinkNote[];
  related: RelatedNote[];
  prev: NoteSummary | null;
  next: NoteSummary | null;
}

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  folder: string | null;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TagInfo {
  tag: string;
  count: number;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function parseJSON<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function toSummary(n: any): NoteSummary {
  return {
    slug: n.slug,
    title: n.title,
    description: n.description,
    tags: parseJSON<string[]>(n.tags, []),
    aliases: parseJSON<string[]>(n.aliases, []),
    wordCount: n.wordCount,
    publishDate: n.publishDate ? n.publishDate.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    path: n.path,
    folder: n.folder,
  };
}

/**
 * Extract the sentence context around a wikilink reference to `targetSlug`
 * from the backlink note's markdown content. Tries multiple forms:
 * [[Target Title]], [[Target Title|alias]], and falls back to the first
 * sentence containing any reference. Returns a trimmed snippet (max ~180 chars)
 * or null if nothing useful is found.
 */
function extractBacklinkContext(
  content: string,
  targetSlug: string,
  backlinkTitle: string,
  targetTitle: string,
  targetAliases: string[] = []
): string | null {
  // Build candidate search patterns from the target title AND all aliases.
  // The wikilink could be [[Target Title]], [[Alias]], [[Target Title|alias]],
  // [[Target Title#heading]], etc.
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const names = [targetTitle, ...targetAliases]
    .filter(Boolean)
    .map(escapeRe);
  if (names.length === 0) return null;
  const patterns = names.map(
    (n) => new RegExp(`\\[\\[\\s*${n}\\s*[|#\\]]`, "i")
  );
  // Split content into sentences (rough — on . ! ? followed by space/newline)
  const sentences = content
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
  for (const pattern of patterns) {
    for (const sentence of sentences) {
      if (pattern.test(sentence)) {
        // Strip wikilink markers for display, keep the text
        const cleaned = sentence
          .replace(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g, "$1")
          .replace(/\s+/g, " ")
          .trim();
        return cleaned.length > 180
          ? cleaned.slice(0, 177) + "…"
          : cleaned;
      }
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Queries
// ----------------------------------------------------------------------------

export async function listNotes(opts?: {
  tag?: string;
  folder?: string;
  limit?: number;
  sort?: "newest" | "oldest" | "alpha" | "updated";
}): Promise<NoteSummary[]> {
  const { tag, folder, limit, sort = "newest" } = opts ?? {};
  const where: any = {};
  if (folder) where.folder = folder;
  if (tag) {
    // SQLite JSON LIKE match — tags stored as ["tag1","tag2"]
    where.tags = { contains: `"${tag}"` };
  }
  const notes = await db.note.findMany({
    where,
    orderBy:
      sort === "alpha"
        ? { title: "asc" }
        : sort === "oldest"
          ? { publishDate: "asc" }
          : sort === "updated"
            ? { updatedAt: "desc" }
            : { publishDate: "desc" },
    take: limit,
  });
  return notes.map(toSummary);
}

export async function getNote(slug: string): Promise<NoteDetail | null> {
  const n = await db.note.findUnique({ where: { slug } });
  if (!n) return null;
  const summary = toSummary(n);
  const links = parseJSON<WikiLinkTarget[]>(n.links, []);

  // Backlinks: notes whose links JSON references this slug.
  // For each, extract the sentence context around the reference.
  const all = await db.note.findMany({
    where: { links: { contains: `"slug":"${slug}"` } },
  });
  const backlinks: BacklinkNote[] = all
    .filter((b) => b.slug !== slug)
    .map((b) => {
      const summary = toSummary(b);
      const targetAliases = parseJSON<string[]>(n.aliases, []);
      const context = extractBacklinkContext(
        b.content,
        slug,
        b.title,
        n.title,
        targetAliases
      );
      return { ...summary, context };
    })
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));

  // Prev/next by publish date
  const prev =
    (await db.note.findFirst({
      where: {
        publishDate: { lt: n.publishDate ?? n.createdAt },
        slug: { not: slug },
      },
      orderBy: { publishDate: "desc" },
    })) ?? null;
  const next =
    (await db.note.findFirst({
      where: {
        publishDate: { gt: n.publishDate ?? n.createdAt },
        slug: { not: slug },
      },
      orderBy: { publishDate: "asc" },
    })) ?? null;

  // Related notes: shared tags + 2-hop links. Compute a score and rank.
  const allNotes = await db.note.findMany();
  const currentTags = new Set(summary.tags);
  const currentLinkSlugs = new Set(
    links.filter((l) => l.exists).map((l) => l.slug)
  );
  const backlinkSlugs = new Set(backlinks.map((b) => b.slug));
  const related: RelatedNote[] = [];
  for (const other of allNotes) {
    if (other.slug === slug) continue;
    const otherTags = parseJSON<string[]>(other.tags, []);
    const otherLinks = parseJSON<WikiLinkTarget[]>(other.links, []);
    const otherLinkSlugs = new Set(
      otherLinks.filter((l) => l.exists).map((l) => l.slug)
    );
    let score = 0;
    let reason: RelatedNote["reason"] | null = null;
    // Shared tags (weight 2 each)
    const sharedTags = otherTags.filter((t) => currentTags.has(t)).length;
    if (sharedTags > 0) {
      score += sharedTags * 2;
      reason = "shared-tags";
    }
    // 2-hop: this note's links link to the other, or other links to this note's links
    if (currentLinkSlugs.has(other.slug) || backlinkSlugs.has(other.slug)) {
      // Direct link — skip (that's backlinks/links, not "related")
    } else {
      // 2-hop: do this note's neighbors link to `other`?
      let twoHop = false;
      for (const nSlug of currentLinkSlugs) {
        const neighbor = allNotes.find((x) => x.slug === nSlug);
        if (!neighbor) continue;
        const neighborLinks = parseJSON<WikiLinkTarget[]>(
          neighbor.links,
          []
        );
        if (neighborLinks.some((l) => l.slug === other.slug && l.exists)) {
          twoHop = true;
          break;
        }
      }
      if (twoHop) {
        score += 3;
        reason = "2-hop";
      }
    }
    // Shared links: both link to a common third note
    let sharedLinks = 0;
    for (const sl of otherLinkSlugs) {
      if (currentLinkSlugs.has(sl) && sl !== other.slug && sl !== slug) {
        sharedLinks++;
      }
    }
    if (sharedLinks > 0) {
      score += sharedLinks;
      if (!reason) reason = "shared-links";
    }
    if (score > 0 && reason) {
      related.push({ ...toSummary(other), reason, score });
    }
  }
  related.sort((a, b) => b.score - a.score);

  return {
    ...summary,
    content: n.content,
    html: n.html,
    links,
    backlinks,
    related: related.slice(0, 6),
    prev: prev ? toSummary(prev) : null,
    next: next ? toSummary(next) : null,
  };
}

export async function getGraph(): Promise<GraphData> {
  const notes = await db.note.findMany();
  const nodes: GraphNode[] = notes.map((n) => ({
    id: n.slug,
    title: n.title,
    tags: parseJSON<string[]>(n.tags, []),
    folder: n.folder,
  }));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const n of notes) {
    const links = parseJSON<WikiLinkTarget[]>(n.links, []);
    for (const l of links) {
      if (!nodeIds.has(l.slug) || l.slug === n.slug) continue;
      const key = `${n.slug}->${l.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: n.slug, target: l.slug });
    }
  }
  return { nodes, edges };
}

export async function getTags(): Promise<TagInfo[]> {
  const notes = await db.note.findMany({ select: { tags: true } });
  const counts = new Map<string, number>();
  for (const n of notes) {
    const tags = parseJSON<string[]>(n.tags, []);
    for (const t of tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
      // Count parent tags too (for nested tags like "thinking/notes")
      const parts = t.split("/");
      for (let i = 1; i < parts.length; i++) {
        const parent = parts.slice(0, i).join("/");
        counts.set(parent, (counts.get(parent) ?? 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function searchNotes(query: string): Promise<
  (NoteSummary & { snippet: string })[]
> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const notes = await db.note.findMany();
  const results: (NoteSummary & { snippet: string })[] = [];
  for (const n of notes) {
    const titleLower = n.title.toLowerCase();
    const descLower = (n.description ?? "").toLowerCase();
    const contentLower = n.content.toLowerCase();
    const tags = parseJSON<string[]>(n.tags, []);
    const inTitle = titleLower.includes(q);
    const inDesc = descLower.includes(q);
    const inContent = contentLower.includes(q);
    const inTags = tags.some((t) => t.toLowerCase().includes(q));
    if (!inTitle && !inDesc && !inContent && !inTags) continue;
    // Build a snippet around the first match in content
    let snippet = "";
    const idx = contentLower.indexOf(q);
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(n.content.length, idx + q.length + 80);
      snippet =
        (start > 0 ? "…" : "") +
        n.content.slice(start, end).replace(/\s+/g, " ").trim() +
        (end < n.content.length ? "…" : "");
    } else if (n.description) {
      snippet = n.description;
    }
    results.push({
      ...toSummary(n),
      snippet,
      // boost title matches
    });
  }
  // Sort: title matches first
  results.sort((a, b) => {
    const at = a.title.toLowerCase().includes(q) ? 0 : 1;
    const bt = b.title.toLowerCase().includes(q) ? 0 : 1;
    if (at !== bt) return at - bt;
    return (b.updatedAt > a.updatedAt ? 1 : -1);
  });
  return results;
}

export interface ExplorerNode {
  name: string;
  path: string;
  type: "folder" | "file";
  slug?: string;
  children?: ExplorerNode[];
}

export async function getExplorer(): Promise<ExplorerNode[]> {
  const notes = await db.note.findMany({
    orderBy: [{ folder: "asc" }, { title: "asc" }],
  });
  const root: ExplorerNode = {
    name: "garden",
    path: "",
    type: "folder",
    children: [],
  };
  for (const n of notes) {
    const parts = n.path.split("/").filter(Boolean);
    let cursor = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) {
        cursor.children!.push({
          name: n.title,
          path: n.path,
          type: "file",
          slug: n.slug,
        });
      } else {
        let child = cursor.children!.find(
          (c) => c.type === "folder" && c.name === part
        );
        if (!child) {
          child = {
            name: part,
            path: parts.slice(0, i + 1).join("/"),
            type: "folder",
            children: [],
          };
          cursor.children!.push(child);
        }
        cursor = child;
      }
    }
  }
  // Sort: folders first, then files, alphabetically
  const sortTree = (node: ExplorerNode) => {
    node.children!.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of node.children!) if (c.type === "folder") sortTree(c);
  };
  sortTree(root);
  return root.children!;
}

export async function getStats(): Promise<{
  totalNotes: number;
  totalWords: number;
  totalLinks: number;
  totalTags: number;
  lastUpdated: string | null;
}> {
  const notes = await db.note.findMany({
    select: { wordCount: true, links: true, updatedAt: true, tags: true },
  });
  const tagSet = new Set<string>();
  let totalWords = 0;
  let totalLinks = 0;
  let lastUpdated: Date | null = null;
  for (const n of notes) {
    totalWords += n.wordCount;
    const links = parseJSON<WikiLinkTarget[]>(n.links, []);
    totalLinks += links.length;
    for (const t of parseJSON<string[]>(n.tags, [])) tagSet.add(t);
    if (!lastUpdated || n.updatedAt > lastUpdated) lastUpdated = n.updatedAt;
  }
  return {
    totalNotes: notes.length,
    totalWords,
    totalLinks,
    totalTags: tagSet.size,
    lastUpdated: lastUpdated?.toISOString() ?? null,
  };
}

/**
 * Returns notes published on the same month-day as today (in any year),
 * excluding the current year. Used by the "On this day" discovery widget.
 */
export async function getOnThisDay(): Promise<NoteSummary[]> {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const year = now.getFullYear();
  const notes = await db.note.findMany({
    where: { publishDate: { not: null } },
  });
  return notes
    .filter((n) => {
      if (!n.publishDate) return false;
      const d = new Date(n.publishDate);
      return (
        d.getMonth() + 1 === month &&
        d.getDate() === day &&
        d.getFullYear() < year
      );
    })
    .map(toSummary)
    .sort((a, b) => (b.publishDate ?? "") > (a.publishDate ?? "") ? 1 : -1);
}
