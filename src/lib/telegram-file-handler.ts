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
 * Saves markdown content sent via Telegram to the content/ folder.
 */
export async function saveTelegramNote(
  fileName: string,
  content: string
): Promise<{ success: boolean; filePath: string; fileName: string; isUpdate: boolean }> {
  const safeName = sanitizeFilename(fileName);
  const targetPath = path.join(CONTENT_DIR, safeName);

  // Prevent directory traversal
  if (!targetPath.startsWith(CONTENT_DIR)) {
    throw new Error("Invalid file path destination");
  }

  const isUpdate = fs.existsSync(targetPath);
  await fs.promises.mkdir(CONTENT_DIR, { recursive: true });
  await fs.promises.writeFile(targetPath, content, "utf-8");

  return {
    success: true,
    filePath: targetPath,
    fileName: safeName,
    isUpdate,
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

  const targetPath = path.join(CONTENT_DIR, cleanName);

  if (!fs.existsSync(targetPath)) {
    // Try matching without extension
    const altPath = path.join(CONTENT_DIR, `${cleanName.replace(/\.md$/, "")}.md`);
    if (!fs.existsSync(altPath)) {
      return { success: false, message: `Note file "${cleanName}" not found in content/` };
    }
    await fs.promises.unlink(altPath);
    return { success: true, deletedFile: path.basename(altPath), message: "Note deleted successfully." };
  }

  await fs.promises.unlink(targetPath);
  return { success: true, deletedFile: cleanName, message: "Note deleted successfully." };
}

/**
 * Gets all note items in content/ directory and notes.json database with website URLs.
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

  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Paginated list of notes for large collections (100s or 1000s of notes).
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
 * Searches note titles, filenames, tags, and content for a given keyword query.
 */
export function searchTelegramNotes(query: string, limit: number = 15): { title: string; fileName: string; url: string; snippet: string }[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  const results: { title: string; fileName: string; url: string; snippet: string }[] = [];
  const seen = new Set<string>();

  // 1. Search in compiled notes.json database
  if (Array.isArray(notesJson)) {
    for (const note of notesJson as any[]) {
      if (results.length >= limit) break;

      const title = note.title || "";
      const desc = note.description || "";
      const content = note.content || "";
      const raw = note.raw || "";
      const filename = note.path || `${note.slug}.md`;
      const tags = Array.isArray(note.tags) ? note.tags.join(" ") : "";
      const url = `${DEFAULT_DOMAIN.replace(/\/$/, "")}/?p=${encodeURIComponent(note.slug)}`;

      const fullText = `${title} ${desc} ${tags} ${content} ${raw}`.toLowerCase();
      const matchIndex = fullText.indexOf(cleanQuery);

      if (matchIndex !== -1) {
        let snippet = desc;
        if (!snippet && content) {
          const start = Math.max(0, matchIndex - 30);
          const end = Math.min(content.length, matchIndex + cleanQuery.length + 40);
          snippet = content.slice(start, end).replace(/[\n\r]+/g, " ");
        }
        if (!snippet) snippet = "Match found in note";

        results.push({
          title: escapeHtml(title),
          fileName: escapeHtml(filename),
          url,
          snippet: escapeHtml(snippet),
        });
        seen.add(filename.toLowerCase());
      }
    }
  }

  // 2. Search raw markdown files in content/ directory
  if (fs.existsSync(CONTENT_DIR) && results.length < limit) {
    try {
      const files = fs.readdirSync(CONTENT_DIR);
      for (const file of files) {
        if (results.length >= limit) break;
        if (!file.endsWith(".md") && !file.endsWith(".markdown")) continue;
        if (seen.has(file.toLowerCase())) continue;

        const slug = file.replace(/\.md$/, "").replace(/\.markdown$/, "");
        const url = `${DEFAULT_DOMAIN.replace(/\/$/, "")}/?p=${encodeURIComponent(slug)}`;

        if (file.toLowerCase().includes(cleanQuery)) {
          results.push({
            title: escapeHtml(slug),
            fileName: escapeHtml(file),
            url,
            snippet: "Match in filename",
          });
          seen.add(file.toLowerCase());
          continue;
        }

        try {
          const fullPath = path.join(CONTENT_DIR, file);
          const content = fs.readFileSync(fullPath, "utf-8");
          const lowerContent = content.toLowerCase();
          const matchIndex = lowerContent.indexOf(cleanQuery);

          if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 30);
            const end = Math.min(content.length, matchIndex + cleanQuery.length + 40);
            const snippet = content.slice(start, end).replace(/[\n\r]+/g, " ");

            results.push({
              title: escapeHtml(slug),
              fileName: escapeHtml(file),
              url,
              snippet: escapeHtml(snippet),
            });
            seen.add(file.toLowerCase());
          }
        } catch {
          // Ignore read errors
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  return results;
}

/**
 * Calculates live Garden statistics metrics.
 */
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

/**
 * Gets all tags in the garden with note counts.
 */
export function getGardenTags(): { tag: string; count: number }[] {
  const { topTags } = getGardenStats();
  return topTags;
}

/**
 * Gets all notes under a specific tag.
 */
export function getNotesByTag(tagName: string): NoteItem[] {
  const cleanTag = tagName.replace(/^#/, "").trim().toLowerCase();
  if (!cleanTag) return [];

  const notes = getAllTelegramNotes();
  return notes.filter((n) =>
    Array.isArray(n.tags) &&
    n.tags.some((t) => t.replace(/^#/, "").trim().toLowerCase() === cleanTag)
  );
}
