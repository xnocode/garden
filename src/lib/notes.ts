import type { WikiLinkTarget } from "@/lib/markdown";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";

// --- Types ---

interface NoteRecord {
  slug: string;
  title: string;
  description: string | null;
  author: string | null;
  content: string;
  html: string;
  raw: string;
  tags: string[];
  aliases: string[];
  links: WikiLinkTarget[];
  wordCount: number;
  draft: boolean;
  visibility?: "public" | "members" | "private";
  publishDate: string | null;
  createdAt: string;
  updatedAt: string;
  path: string;
  folder: string | null;
  /** Optional frontmatter: slug of the previous note (overrides date-based). */
  prevSlug?: string | null;
  /** Optional frontmatter: slug of the next note (overrides date-based). */
  nextSlug?: string | null;
}

export interface NoteSummary {
  slug: string;
  title: string;
  description: string | null;
  author: string | null;
  tags: string[];
  aliases: string[];
  wordCount: number;
  visibility?: "public" | "members" | "private";
  publishDate: string | null;
  createdAt: string;
  updatedAt: string;
  path: string;
  folder: string | null;
}

export interface RelatedNote extends NoteSummary {
  reason: "shared-tags" | "2-hop" | "shared-links";
  score: number;
}

export interface BacklinkNote extends NoteSummary {
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

export interface ExplorerNode {
  name: string;
  path: string;
  type: "folder" | "file";
  slug?: string;
  children?: ExplorerNode[];
}

// --- Data loading ---

// Static JSON bundled at build time (used as fallback / for graph/tags/stats)
import notesData from "@/data/notes.json";
const STATIC_NOTES: NoteRecord[] = notesData as NoteRecord[];

/** Convert a raw DB row to NoteRecord shape */
function dbRowToRecord(row: any): NoteRecord {
  let tags: string[] = [];
  let aliases: string[] = [];
  let links: WikiLinkTarget[] = [];
  try { tags = JSON.parse(row.tags || "[]"); } catch { tags = []; }
  try { aliases = JSON.parse(row.aliases || "[]"); } catch { aliases = []; }
  try { links = JSON.parse(row.links || "[]"); } catch { links = []; }
  return {
    slug: row.slug,
    title: row.title,
    description: row.description ?? null,
    author: row.author ?? null,
    content: row.content ?? "",
    html: row.html ?? "",
    raw: row.raw ?? "",
    tags,
    aliases,
    links,
    wordCount: row.wordCount ?? 0,
    draft: row.draft ?? false,
    visibility: (row.visibility as any) ?? "public",
    publishDate: row.publishDate ? new Date(row.publishDate).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    path: row.path ?? `${row.slug}.md`,
    folder: row.folder ?? null,
  };
}

   // Load summaries only (no heavy content) for fast list operations
   // This function is used by listNotes and other summary‑only queries.
   async function loadSummaries(): Promise<NoteRecord[]> {
     try {
       const rows = await db.note.findMany({
         select: {
           slug: true,
           title: true,
           description: true,
           tags: true,
           aliases: true,
           wordCount: true,
           visibility: true,
           publishDate: true,
           createdAt: true,
           updatedAt: true,
           path: true,
           folder: true,
           draft: true,
         },
         orderBy: { publishDate: "desc" },
       });
       if (!rows || rows.length === 0) return STATIC_NOTES;
       
       // Map DB rows to NoteRecord shape
       const dbRecords: NoteRecord[] = rows.map((r) => {
         let tags: string[] = [];
         let aliases: string[] = [];
         try { tags = JSON.parse(r.tags || "[]"); } catch { tags = []; }
         try { aliases = JSON.parse(r.aliases || "[]"); } catch { aliases = []; }
         return {
           slug: r.slug,
           title: r.title,
           description: r.description ?? null,
           author: "Ridoy",
           content: "",
           html: "",
           raw: "",
           tags,
           aliases,
           links: [],
           wordCount: r.wordCount ?? 0,
           draft: r.draft ?? false,
           visibility: (r.visibility as any) ?? "public",
           publishDate: r.publishDate ? new Date(r.publishDate).toISOString() : null,
           createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
           updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
           path: r.path ?? `${r.slug}.md`,
           folder: r.folder ?? null,
         };
       });

       // Merge with static notes (DB overrides static notes if matching slug)
       const dbSlugSet = new Set(dbRecords.map((d) => d.slug));
       const merged = [...dbRecords, ...STATIC_NOTES.filter((s) => !dbSlugSet.has(s.slug))];
       return merged;
     } catch {
       // If DB query fails or is unreachable, fallback to instant static JSON
       return STATIC_NOTES;
     }
   }

   // Fast in‑memory cache for summaries (60 seconds TTL)
   let summaryCache: { data: NoteRecord[]; ts: number } | null = null;
   async function getSummaries(): Promise<NoteRecord[]> {
     const now = Date.now();
     if (summaryCache && now - summaryCache.ts < 60_000) {
       return summaryCache.data;
     }
     const data = await loadSummaries();
     summaryCache = { data, ts: now };
     return data;
   }

   // For functions that need the full list synchronously (graph, stats, tags)
   const NOTES: NoteRecord[] = STATIC_NOTES;
   const STATIC_MAP = new Map<string, NoteRecord>(STATIC_NOTES.map((n) => [n.slug, n]));

// --- Helpers ---

function toSummary(n: NoteRecord): NoteSummary {
  return {
    slug: n.slug,
    title: n.title,
    description: n.description,
    author: n.author ?? null,
    tags: n.tags,
    aliases: n.aliases,
    wordCount: n.wordCount,
    visibility: n.visibility || "public",
    publishDate: n.publishDate,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    path: n.path,
    folder: n.folder,
  };
}

/**
 * Extract the sentence context around a wikilink reference.
 */
function extractBacklinkContext(
  content: string,
  targetTitle: string,
  targetAliases: string[] = []
): string | null {
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const names = [targetTitle, ...targetAliases].filter(Boolean).map(escapeRe);
  if (names.length === 0) return null;
  const patterns = names.map(
    (n) => new RegExp(`\\[\\[\\s*${n}\\s*[|#\\]]`, "i")
  );
  const sentences = content
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
  for (const pattern of patterns) {
    for (const sentence of sentences) {
      if (pattern.test(sentence)) {
        const cleaned = sentence
          .replace(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g, "$1")
          .replace(/\s+/g, " ")
          .trim();
        return cleaned.length > 180 ? cleaned.slice(0, 177) + "…" : cleaned;
      }
    }
  }
  return null;
}

function buildNoteDetail(n: NoteRecord, allNotes: NoteRecord[]): NoteDetail {
  const slug = n.slug;
  const summary = toSummary(n);
  const links = n.links;

  // Backlinks
  const backlinks: BacklinkNote[] = allNotes
    .filter((b) => b.slug !== slug && b.links.some((l) => l.slug === slug))
    .map((b) => ({
      ...toSummary(b),
      context: extractBacklinkContext(b.content, n.title, n.aliases),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Prev/next handling
  let prev: NoteSummary | null = null;
  let next: NoteSummary | null = null;
  if (n.prevSlug) {
    const prevNote = allNotes.find((x) => x.slug === n.prevSlug);
    if (prevNote) prev = toSummary(prevNote);
  }
  if (n.nextSlug) {
    const nextNote = allNotes.find((x) => x.slug === n.nextSlug);
    if (nextNote) next = toSummary(nextNote);
  }
  if (!prev && !next) {
    const sorted = [...allNotes].sort((a, b) =>
      (a.publishDate ?? a.createdAt).localeCompare(b.publishDate ?? b.createdAt)
    );
    const idx = sorted.findIndex((x) => x.slug === slug);
    prev = idx > 0 ? toSummary(sorted[idx - 1]) : null;
    next = idx >= 0 && idx < sorted.length - 1 ? toSummary(sorted[idx + 1]) : null;
  }

  // Related notes
  const currentTags = new Set(summary.tags);
  const currentLinkSlugs = new Set(
    links.filter((l) => l.exists).map((l) => l.slug)
  );
  const backlinkSlugs = new Set(backlinks.map((b) => b.slug));
  const related: RelatedNote[] = [];
  for (const other of allNotes) {
    if (other.slug === slug) continue;
    const otherLinkSlugs = new Set(
      other.links.filter((l) => l.exists).map((l) => l.slug)
    );
    let score = 0;
    let reason: RelatedNote["reason"] | null = null;
    const sharedTags = other.tags.filter((t) => currentTags.has(t)).length;
    if (sharedTags > 0) {
      score += sharedTags * 2;
      reason = "shared-tags";
    }
    if (!currentLinkSlugs.has(other.slug) && !backlinkSlugs.has(other.slug)) {
      let twoHop = false;
      for (const nSlug of currentLinkSlugs) {
        const neighbor = allNotes.find((x) => x.slug === nSlug);
        if (neighbor && neighbor.links.some((l) => l.slug === other.slug && l.exists)) {
          twoHop = true;
          break;
        }
      }
      if (twoHop) {
        score += 3;
        reason = "2-hop";
      }
    }
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
    prev,
    next,
  };
}

// --- Queries ---

export async function listNotes(opts?: {
  tag?: string;
  folder?: string;
  limit?: number;
  sort?: "newest" | "oldest" | "alpha" | "updated";
}): Promise<NoteSummary[]> {
  const { tag, folder, limit, sort = "newest" } = opts ?? {};
  // Fast in-memory summaries
  const allNotes = await getSummaries();
  // Exclude private or draft notes from public view
  let filtered = allNotes.filter((n) => n.visibility !== "private" && !n.draft);
  if (folder) filtered = filtered.filter((n) => n.folder === folder);
  if (tag) filtered = filtered.filter((n) => n.tags.includes(tag));
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "alpha") return a.title.localeCompare(b.title);
    if (sort === "oldest")
      return (
        (a.publishDate ?? a.createdAt).localeCompare(b.publishDate ?? b.createdAt)
      );
    if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
    // default newest
    return (b.publishDate ?? b.createdAt).localeCompare(
      a.publishDate ?? a.createdAt
    );
  });
  const result = sorted.map(toSummary);
  return limit ? result.slice(0, limit) : result;
}

export async function getNote(slug: string): Promise<NoteDetail | null> {
  // 1. Instant check from bundled static notes (0ms response time!)
  const staticNote = STATIC_MAP.get(slug);
  if (staticNote) {
    return buildNoteDetail(staticNote, STATIC_NOTES);
  }

  // 2. If not found in static notes, check dynamic notes in Neon DB
  try {
    const row = await db.note.findUnique({
      where: { slug },
    });
    if (row) {
      const n = dbRowToRecord(row);
      return buildNoteDetail(n, STATIC_NOTES);
    }
  } catch {
    // DB error – fallback to filesystem
  }
  // Dynamic filesystem fallback for notes that exist only as markdown files
  try {
    const contentDir = path.join(process.cwd(), "content");
    const filePath = path.join(contentDir, `${slug}.md`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const html = `<div class="prose max-w-none dark:prose-invert"><h1>${title}</h1><div class="whitespace-pre-wrap">${raw.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div></div>`;
      return {
        slug,
        title,
        description: raw.slice(0, 120),
        author: null,
        tags: [],
        aliases: [],
        wordCount: raw.split(/\s+/).length,
        publishDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        path: `${slug}.md`,
        folder: null,
        content: raw,
        html,
        links: [],
        backlinks: [],
        related: [],
        prev: null,
        next: null,
      };
    }
  } catch {
    // ignore errors
  }
  return null;
}


export async function getGraph(): Promise<GraphData> {
  const nodes: GraphNode[] = NOTES.map((n) => ({
    id: n.slug,
    title: n.title,
    tags: n.tags,
    folder: n.folder,
  }));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const n of NOTES) {
    for (const l of n.links) {
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
  const counts = new Map<string, number>();
  for (const n of NOTES) {
    for (const t of n.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
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

export async function searchNotes(
  query: string
): Promise<(NoteSummary & { snippet: string })[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: (NoteSummary & { snippet: string })[] = [];
  for (const n of NOTES) {
    const titleLower = n.title.toLowerCase();
    const descLower = (n.description ?? "").toLowerCase();
    const contentLower = n.content.toLowerCase();
    const inTitle = titleLower.includes(q);
    const inDesc = descLower.includes(q);
    const inContent = contentLower.includes(q);
    const inTags = n.tags.some((t) => t.toLowerCase().includes(q));
    if (!inTitle && !inDesc && !inContent && !inTags) continue;
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
    results.push({ ...toSummary(n), snippet });
  }
  results.sort((a, b) => {
    const at = a.title.toLowerCase().includes(q) ? 0 : 1;
    const bt = b.title.toLowerCase().includes(q) ? 0 : 1;
    if (at !== bt) return at - bt;
    return b.updatedAt > a.updatedAt ? 1 : -1;
  });
  return results;
}

export async function getExplorer(): Promise<ExplorerNode[]> {
  const sorted = [...NOTES].sort((a, b) => {
    if (a.folder !== b.folder) return (a.folder ?? "").localeCompare(b.folder ?? "");
    return a.title.localeCompare(b.title);
  });
  const root: ExplorerNode = {
    name: "garden",
    path: "",
    type: "folder",
    children: [],
  };
  for (const n of sorted) {
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
  const tagSet = new Set<string>();
  let totalWords = 0;
  let totalLinks = 0;
  let lastUpdated: string | null = null;
  for (const n of NOTES) {
    totalWords += n.wordCount;
    totalLinks += n.links.length;
    for (const t of n.tags) tagSet.add(t);
    if (!lastUpdated || n.updatedAt > lastUpdated) lastUpdated = n.updatedAt;
  }
  return {
    totalNotes: NOTES.length,
    totalWords,
    totalLinks,
    totalTags: tagSet.size,
    lastUpdated,
  };
}

export async function getOnThisDay(): Promise<NoteSummary[]> {
  const dhakaStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  const [year, month, day] = dhakaStr.split("-").map(Number);
  return NOTES.filter((n) => {
    if (!n.publishDate) return false;
    const d = new Date(n.publishDate);
    return (
      d.getMonth() + 1 === month &&
      d.getDate() === day &&
      d.getFullYear() < year
    );
  })
    .map(toSummary)
    .sort((a, b) =>
      (b.publishDate ?? "").localeCompare(a.publishDate ?? "")
    );
}
