import fs from "node:fs";
import path from "node:path";
import notesJson from "@/data/notes.json";

const CONTENT_DIR = path.join(process.cwd(), "content");
const DEFAULT_DOMAIN = process.env.NEXT_PUBLIC_SITE_URL || "https://gardenx.qzz.io";

export interface NoteItem {
  title: string;
  filename: string;
  slug: string;
  url: string;
  description?: string;
  wordCount?: number;
  tags?: string[];
  updatedAt?: string;
}

// In-memory cache for dynamic uploaded notes on serverless instances
const dynamicNotesMap = new Map<string, NoteItem>();

/**
 * Escapes HTML characters so Telegram's HTML parser doesn't break.
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Ensures the target filename is safe and strictly restricted to the content directory.
 */
export function sanitizeFilename(rawFileName: string): string {
  let fileName = path.basename(rawFileName).trim();
  fileName = fileName.replace(/[^a-zA-Z0-9_\-\. ]/g, "_");
  if (!fileName.endsWith(".md") && !fileName.endsWith(".markdown")) {
    fileName += ".md";
  }
  return fileName;
}

/**
 * Commits uploaded file directly to GitHub repository to trigger Vercel site rebuild.
 */
export async function commitNoteToGitHub(
  fileName: string,
  content: string
): Promise<{ success: boolean; message: string }> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return { success: false, message: "No GITHUB_TOKEN configured" };
  }

  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "xnocode/garden";
  const filePath = `content/${fileName}`;
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  try {
    let sha: string | undefined;
    const getRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DigitalGardenBot",
      },
    });

    if (getRes.ok) {
      const existingData = await getRes.json();
      sha = existingData.sha;
    }

    const base64Content = Buffer.from(content).toString("base64");
    const putBody: any = {
      message: `publish note via Telegram: ${fileName}`,
      content: base64Content,
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "DigitalGardenBot",
      },
      body: JSON.stringify(putBody),
    });

    if (putRes.ok) {
      return { success: true, message: "Committed to GitHub & Vercel deployment triggered" };
    } else {
      const errData = await putRes.json();
      return { success: false, message: errData.message || "GitHub commit failed" };
    }
  } catch (err: any) {
    return { success: false, message: err.message || "GitHub API error" };
  }
}

/**
 * Saves markdown content sent via Telegram to the content/ folder & in-memory cache.
 */
export async function saveTelegramNote(
  fileName: string,
  content: string
): Promise<{ success: boolean; filePath: string; fileName: string; isUpdate: boolean; githubStatus?: string }> {
  const safeName = sanitizeFilename(fileName);
  const targetPath = path.join(CONTENT_DIR, safeName);

  if (!targetPath.startsWith(CONTENT_DIR)) {
    throw new Error("Invalid file path destination");
  }

  const isUpdate = fs.existsSync(targetPath);
  try {
    await fs.promises.mkdir(CONTENT_DIR, { recursive: true });
    await fs.promises.writeFile(targetPath, content, "utf-8");
  } catch {
    // Ephemeral disk write fallback
  }

  const slug = safeName.replace(/\.md$/, "").replace(/\.markdown$/, "");
  const url = `${DEFAULT_DOMAIN.replace(/\/$/, "")}/?p=${encodeURIComponent(slug)}`;
  const wordCount = content.trim().split(/\s+/).length || 0;

  // Save to in-memory dynamic cache for immediate search/list
  dynamicNotesMap.set(safeName.toLowerCase(), {
    title: slug.replace(/-/g, " "),
    filename: safeName,
    slug,
    url,
    description: content.slice(0, 120).replace(/[\n\r]+/g, " "),
    wordCount,
    tags: [],
    updatedAt: new Date().toISOString(),
  });

  // Try committing to GitHub
  let githubStatus = "Saved locally";
  try {
    const ghRes = await commitNoteToGitHub(safeName, content);
    if (ghRes.success) {
      githubStatus = "Committed to GitHub (Vercel deployment triggered)";
    }
  } catch {
    // Ignore GitHub commit failure
  }

  return {
    success: true,
    filePath: targetPath,
    fileName: safeName,
    isUpdate,
    githubStatus,
  };
}

/**
 * Deletes a note file from content/ folder by filename or slug.
 */
export async function deleteTelegramNote(
  nameOrSlug: string
): Promise<{ success: boolean; deletedFile?: string; message: string }> {
  let cleanName = path.basename(nameOrSlug).trim();
  if (!cleanName.endsWith(".md") && !cleanName.endsWith(".markdown")) {
    cleanName += ".md";
  }

  dynamicNotesMap.delete(cleanName.toLowerCase());

  const targetPath = path.join(CONTENT_DIR, cleanName);

  if (!fs.existsSync(targetPath)) {
    const altPath = path.join(CONTENT_DIR, `${cleanName.replace(/\.md$/, "")}.md`);
    if (!fs.existsSync(altPath)) {
      return { success: false, message: `Note file "${cleanName}" not found in content/` };
    }
    try {
      await fs.promises.unlink(altPath);
    } catch {}
    return { success: true, deletedFile: path.basename(altPath), message: "Note deleted successfully." };
  }

  try {
    await fs.promises.unlink(targetPath);
  } catch {}
  return { success: true, deletedFile: cleanName, message: "Note deleted successfully." };
}

/**
 * Gets all note items in content/ directory, notes.json database, and dynamic memory map.
 */
export function getAllTelegramNotes(): NoteItem[] {
  const map = new Map<string, NoteItem>();

  // 1. Load from compiled notes.json
  if (Array.isArray(notesJson)) {
    for (const note of notesJson as any[]) {
      const slug = note.slug || "note";
      const filename = note.path || `${slug}.md`;
      const url = `${DEFAULT_DOMAIN.replace(/\/$/, "")}/?p=${encodeURIComponent(slug)}`;

      map.set(filename.toLowerCase(), {
        title: note.title || slug,
        filename,
        slug,
        url,
        description: note.description || "",
        wordCount: note.wordCount || 0,
        tags: Array.isArray(note.tags) ? note.tags : [],
        updatedAt: note.updatedAt || "",
      });
    }
  }

  // 2. Load from content/ directory if accessible
  if (fs.existsSync(CONTENT_DIR)) {
    try {
      const files = fs.readdirSync(CONTENT_DIR);
      for (const f of files) {
        if (f.endsWith(".md") || f.endsWith(".markdown")) {
          const lower = f.toLowerCase();
          if (!map.has(lower)) {
            const slug = f.replace(/\.md$/, "").replace(/\.markdown$/, "");
            const url = `${DEFAULT_DOMAIN.replace(/\/$/, "")}/?p=${encodeURIComponent(slug)}`;

            map.set(lower, {
              title: slug,
              filename: f,
              slug,
              url,
              description: "",
              wordCount: 0,
              tags: [],
            });
          }
        }
      }
    } catch {
      // Ignore filesystem read errors
    }
  }

  // 3. Load from in-memory dynamic cache
  for (const [key, item] of dynamicNotesMap.entries()) {
    map.set(key, item);
  }

  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Finds a specific note by slug or filename.
 */
export function getNoteBySlugOrName(query: string): NoteItem | null {
  const clean = query.trim().toLowerCase().replace(/\.md$/, "").replace(/\.markdown$/, "");
  if (!clean) return null;
  const all = getAllTelegramNotes();
  return (
    all.find(
      (n) =>
        n.slug.toLowerCase() === clean ||
        n.filename.toLowerCase() === clean ||
        n.filename.toLowerCase() === `${clean}.md` ||
        n.title.toLowerCase() === clean
    ) || null
  );
}

/**
 * Paginated list of notes for large collections.
 */
export function getPaginatedNotes(page: number = 1, pageSize: number = 25): {
  notes: NoteItem[];
  total: number;
  totalPages: number;
  page: number;
} {
  const all = getAllTelegramNotes();
  const total = all.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * pageSize;
  const notes = all.slice(start, start + pageSize);

  return {
    notes,
    total,
    totalPages,
    page: currentPage,
  };
}

/**
 * Searches note titles, filenames, tags, and content.
 */
export function searchTelegramNotes(query: string, limit: number = 15): { title: string; fileName: string; slug: string; url: string; snippet: string }[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  const results: { title: string; fileName: string; slug: string; url: string; snippet: string }[] = [];
  const seen = new Set<string>();

  const allNotes = getAllTelegramNotes();
  for (const note of allNotes) {
    if (results.length >= limit) break;
    const fullText = `${note.title} ${note.filename} ${note.slug} ${note.description} ${note.tags?.join(" ")}`.toLowerCase();
    if (fullText.includes(cleanQuery)) {
      results.push({
        title: escapeHtml(note.title),
        fileName: escapeHtml(note.filename),
        slug: note.slug,
        url: note.url,
        snippet: escapeHtml(note.description || "Matching note in garden"),
      });
      seen.add(note.filename.toLowerCase());
    }
  }

  return results;
}

export function getGardenStats(): {
  totalNotes: number;
  totalWords: number;
  topTags: { tag: string; count: number }[];
} {
  const notes = getAllTelegramNotes();
  const totalNotes = notes.length;
  let totalWords = 0;
  const tagMap = new Map<string, number>();

  for (const n of notes) {
    totalWords += n.wordCount || 0;
    if (Array.isArray(n.tags)) {
      for (const t of n.tags) {
        const cleanTag = t.replace(/^#/, "").trim().toLowerCase();
        if (cleanTag) {
          tagMap.set(cleanTag, (tagMap.get(cleanTag) || 0) + 1);
        }
      }
    }
  }

  const topTags = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalNotes,
    totalWords,
    topTags,
  };
}

export function getGardenTags(): { tag: string; count: number }[] {
  const { topTags } = getGardenStats();
  return topTags;
}

export function getNotesByTag(tagName: string): NoteItem[] {
  const cleanTag = tagName.replace(/^#/, "").trim().toLowerCase();
  if (!cleanTag) return [];

  const notes = getAllTelegramNotes();
  return notes.filter((n) =>
    Array.isArray(n.tags) &&
    n.tags.some((t) => t.replace(/^#/, "").trim().toLowerCase() === cleanTag)
  );
}
