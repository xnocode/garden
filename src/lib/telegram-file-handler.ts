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
 * Lists current note files in content/ directory.
 */
export function listTelegramNotes(limit: number = 10): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR);
  return files
    .filter((f) => f.endsWith(".md") || f.endsWith(".markdown"))
    .slice(0, limit);
}
