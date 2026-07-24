import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "content");

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
 * Gets all note filenames in content/ directory.
 */
export function getAllTelegramNotes(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR);
  return files
    .filter((f) => f.endsWith(".md") || f.endsWith(".markdown"))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Paginated list of notes for large collections (100s or 1000s of notes).
 */
export function getPaginatedNotes(page: number = 1, pageSize: number = 30): {
  notes: string[];
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
 * Searches note filenames and content for a given keyword query.
 */
export function searchTelegramNotes(query: string, limit: number = 25): { fileName: string; snippet?: string }[] {
  const all = getAllTelegramNotes();
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  const results: { fileName: string; snippet?: string }[] = [];

  for (const file of all) {
    if (results.length >= limit) break;

    // Check if filename matches query
    if (file.toLowerCase().includes(cleanQuery)) {
      results.push({ fileName: file, snippet: "Matched filename" });
      continue;
    }

    // Check file content
    try {
      const fullPath = path.join(CONTENT_DIR, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      const lowerContent = content.toLowerCase();
      const matchIndex = lowerContent.indexOf(cleanQuery);

      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 30);
        const end = Math.min(content.length, matchIndex + cleanQuery.length + 30);
        const snippet = "..." + content.slice(start, end).replace(/\n/g, " ") + "...";
        results.push({ fileName: file, snippet });
      }
    } catch {
      // Ignore read errors for individual files
    }
  }

  return results;
}
