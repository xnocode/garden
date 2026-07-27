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
 * Checks if a note file with the given filename or slug already exists in the garden.
 */
export async function checkDuplicateNote(rawFileName: string): Promise<NoteItem | null> {
  const safeName = sanitizeFilename(rawFileName);
  const slug = safeName.replace(/\.md$/, "").replace(/\.markdown$/, "");
  const allNotes = await getAllTelegramNotes();

  return (
    allNotes.find(
      (n) =>
        n.filename.toLowerCase() === safeName.toLowerCase() ||
        n.slug.toLowerCase() === slug.toLowerCase()
    ) || null
  );
}

/**
 * Commits uploaded file directly to GitHub repository to trigger Vercel site rebuild.
 */
export async function commitNoteToGitHub(
  fileName: string,
  content: string,
  skipCi: boolean = false
): Promise<{ success: boolean; message: string }> {
  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
  if (!token) {
    return { success: false, message: "No GITHUB_TOKEN environment variable found on server" };
  }

  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "xnocode/garden";
  const filePath = `content/${fileName}`;
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const authHeader = token.startsWith("github_pat_") || token.startsWith("ghp_") ? `Bearer ${token}` : `token ${token}`;

  try {
    let sha: string | undefined;

    // 1. GET existing SHA (2.0s timeout)
    const getController = new AbortController();
    const getId = setTimeout(() => getController.abort(), 2000);
    try {
      const getRes = await fetch(url, {
        signal: getController.signal,
        headers: {
          Authorization: authHeader,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DigitalGardenBot",
        },
      });
      clearTimeout(getId);

      if (getRes.ok) {
        const existingData = await getRes.json();
        sha = existingData.sha;
      }
    } catch {
      clearTimeout(getId);
    }

    // 2. PUT file content (2.5s timeout)
    const base64Content = Buffer.from(content).toString("base64");
    const commitMsg = skipCi 
      ? `publish note via Telegram: ${fileName} [skip ci]`
      : `publish note via Telegram: ${fileName}`;
      
    const putBody: any = {
      message: commitMsg,
      content: base64Content,
    };
    if (sha) putBody.sha = sha;

    const putController = new AbortController();
    const putId = setTimeout(() => putController.abort(), 2500);

    const putRes = await fetch(url, {
      method: "PUT",
      signal: putController.signal,
      headers: {
        Authorization: authHeader,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "DigitalGardenBot",
      },
      body: JSON.stringify(putBody),
    });
    clearTimeout(putId);

    if (putRes.ok) {
      return { success: true, message: "Committed to GitHub successfully" };
    } else {
      const errData = await putRes.json().catch(() => ({}));
      const reason = errData.message || `GitHub API HTTP ${putRes.status}`;
      return { success: false, message: reason };
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { success: false, message: "GitHub API request timed out (3.5s limit)" };
    }
    return { success: false, message: err.message || "GitHub API network error" };
  }
}

/**
 * Deletes a note file directly from GitHub repository to trigger Vercel rebuild.
 */
export async function deleteNoteFromGitHub(
  fileName: string
): Promise<{ success: boolean; message: string }> {
  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
  if (!token) {
    return { success: false, message: "No GITHUB_TOKEN configured" };
  }

  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "xnocode/garden";
  const filePath = `content/${fileName}`;
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const authHeader = token.startsWith("github_pat_") || token.startsWith("ghp_") ? `Bearer ${token}` : `token ${token}`;

  try {
    // 1. GET file SHA (2.0s timeout)
    const getController = new AbortController();
    const getId = setTimeout(() => getController.abort(), 2000);
    const getRes = await fetch(url, {
      signal: getController.signal,
      headers: {
        Authorization: authHeader,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DigitalGardenBot",
      },
    });
    clearTimeout(getId);

    if (!getRes.ok) {
      return { success: false, message: `File "${fileName}" not found on GitHub` };
    }

    const fileData = await getRes.json();
    const sha = fileData.sha;

    // 2. DELETE file from GitHub (2.5s timeout)
    const delController = new AbortController();
    const delId = setTimeout(() => delController.abort(), 2500);

    const delRes = await fetch(url, {
      method: "DELETE",
      signal: delController.signal,
      headers: {
        Authorization: authHeader,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "DigitalGardenBot",
      },
      body: JSON.stringify({
        message: `delete note via Telegram: ${fileName}`,
        sha,
      }),
    });
    clearTimeout(delId);

    if (delRes.ok) {
      return { success: true, message: `Deleted "${fileName}" from GitHub & triggered Vercel rebuild` };
    } else {
      const errData = await delRes.json().catch(() => ({}));
      return { success: false, message: errData.message || `GitHub HTTP ${delRes.status}` };
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { success: false, message: "GitHub API request timed out (3.5s limit)" };
    }
    return { success: false, message: err?.message || "GitHub API delete error" };
  }
}

/**
 * Saves markdown content sent via Telegram to the content/ folder & in-memory cache.
 */
export async function saveTelegramNote(
  fileName: string,
  content: string,
  skipCi: boolean = false
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

  let githubStatus = "Saved locally";
  let committed = false;
  try {
    const ghRes = await commitNoteToGitHub(safeName, content, skipCi);
    if (ghRes.success) {
      githubStatus = "Committed to GitHub (Vercel deployment triggered)";
      committed = true;
    } else {
      githubStatus = `GitHub Error: ${ghRes.message}`;
    }
  } catch (err: any) {
    githubStatus = `GitHub Error: ${err?.message || "Unknown error"}`;
  }

  if (committed || isUpdate) {
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
 * Deletes a note file from content/ folder, in-memory cache, and GitHub repository.
 */
export async function deleteTelegramNote(
  nameOrSlug: string
): Promise<{ success: boolean; deletedFile?: string; message: string }> {
  let cleanName = path.basename(nameOrSlug).trim();
  if (!cleanName.endsWith(".md") && !cleanName.endsWith(".markdown")) {
    cleanName += ".md";
  }

  const existedInMap = dynamicNotesMap.delete(cleanName.toLowerCase());
  const targetPath = path.join(CONTENT_DIR, cleanName);

  let deletedDisk = false;
  if (fs.existsSync(targetPath)) {
    try {
      await fs.promises.unlink(targetPath);
      deletedDisk = true;
    } catch {}
  }

  // Delete from GitHub repository
  const ghRes = await deleteNoteFromGitHub(cleanName);

  if (ghRes.success) {
    return {
      success: true,
      deletedFile: cleanName,
      message: `Deleted "${cleanName}" from GitHub & website. Vercel rebuild triggered (~1-2 min).`,
    };
  }

  if (existedInMap || deletedDisk) {
    return {
      success: true,
      deletedFile: cleanName,
      message: `Deleted "${cleanName}" from memory, but GitHub note status: ${ghRes.message}`,
    };
  }

  return { success: false, message: ghRes.message || `Note file "${cleanName}" not found.` };
}

let gitHubContentsCache: { files: string[]; timestamp: number } | null = null;

async function getGitHubContents(): Promise<string[]> {
  const now = Date.now();
  if (gitHubContentsCache && now - gitHubContentsCache.timestamp < 5000) {
    return gitHubContentsCache.files;
  }

  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
  if (!token) return [];
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "xnocode/garden";
  const url = `https://api.github.com/repos/${repo}/contents/content`;
  const authHeader = token.startsWith("github_pat_") || token.startsWith("ghp_") ? `Bearer ${token}` : `token ${token}`;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: authHeader,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DigitalGardenBot",
      },
    });
    clearTimeout(id);
    if (!res.ok) return [];
    const files = await res.json();
    if (Array.isArray(files)) {
      const resultFiles = files
        .filter((f: any) => f.type === "file" && (f.name.endsWith(".md") || f.name.endsWith(".markdown")))
        .map((f: any) => f.name.toLowerCase());
      
      gitHubContentsCache = { files: resultFiles, timestamp: now };
      return resultFiles;
    }
  } catch (e) {
    console.error("Error fetching GitHub contents:", e);
  }
  return [];
}

/**
 * Gets all note items in content/ directory, notes.json database, and dynamic memory map.
 */
export async function getAllTelegramNotes(): Promise<NoteItem[]> {
  const map = new Map<string, NoteItem>();

  // 1. Fetch live filenames from GitHub (source of truth)
  const liveFiles = await getGitHubContents();
  const hasLive = liveFiles.length > 0;

  // 2. Load from compiled notes.json
  if (Array.isArray(notesJson)) {
    for (const note of notesJson as any[]) {
      const slug = note.slug || "note";
      const filename = note.path || `${slug}.md`;
      const filenameLower = filename.toLowerCase();

      // If we have the live list from GitHub, filter out files that are no longer there
      if (hasLive && !liveFiles.includes(filenameLower)) {
        continue;
      }

      const url = `${DEFAULT_DOMAIN.replace(/\/$/, "")}/?p=${encodeURIComponent(slug)}`;

      map.set(filenameLower, {
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

  // 3. Load from content/ directory if accessible (fallback for local development)
  if (!hasLive && fs.existsSync(CONTENT_DIR)) {
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

  // 4. Add any new notes that are on GitHub but not yet in notes.json
  if (hasLive) {
    for (const name of liveFiles) {
      if (!map.has(name)) {
        const slug = name.replace(/\.md$/, "").replace(/\.markdown$/, "");
        const url = `${DEFAULT_DOMAIN.replace(/\/$/, "")}/?p=${encodeURIComponent(slug)}`;
        map.set(name, {
          title: slug.replace(/-/g, " "),
          filename: name,
          slug,
          url,
          description: "New note (syncing...)",
          wordCount: 0,
          tags: [],
        });
      }
    }
  }

  // 5. Load from in-memory dynamic cache (fallback for immediate updates)
  for (const [key, item] of dynamicNotesMap.entries()) {
    if (hasLive && !liveFiles.includes(key)) {
      continue;
    }
    map.set(key, item);
  }

  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Finds a specific note by slug or filename.
 */
export async function getNoteBySlugOrName(query: string): Promise<NoteItem | null> {
  const clean = query.trim().toLowerCase().replace(/\.md$/, "").replace(/\.markdown$/, "");
  if (!clean) return null;
  const all = await getAllTelegramNotes();
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
export async function getPaginatedNotes(page: number = 1, pageSize: number = 25): Promise<{
  notes: NoteItem[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const all = await getAllTelegramNotes();
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
export async function searchTelegramNotes(query: string, limit: number = 15): Promise<{ title: string; fileName: string; slug: string; url: string; snippet: string }[]> {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  const results: { title: string; fileName: string; slug: string; url: string; snippet: string }[] = [];
  const seen = new Set<string>();

  const allNotes = await getAllTelegramNotes();
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

export async function getGardenStats(): Promise<{
  totalNotes: number;
  totalWords: number;
  topTags: { tag: string; count: number }[];
}> {
  const notes = await getAllTelegramNotes();
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

export async function getGardenTags(): Promise<{ tag: string; count: number }[]> {
  const { topTags } = await getGardenStats();
  return topTags;
}

export async function getNotesByTag(tagName: string): Promise<NoteItem[]> {
  const cleanTag = tagName.replace(/^#/, "").trim().toLowerCase();
  if (!cleanTag) return [];

  const notes = await getAllTelegramNotes();
  return notes.filter((n) =>
    Array.isArray(n.tags) &&
    n.tags.some((t) => t.replace(/^#/, "").trim().toLowerCase() === cleanTag)
  );
}

export interface PendingTaskItem {
  raw: string;
  addedAt: string;
}

export async function addPendingTasksToGitHub(
  taskStrings: string[]
): Promise<{ success: boolean; count: number; message: string }> {
  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
  if (!token) {
    return { success: false, count: 0, message: "No GITHUB_TOKEN configured" };
  }

  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "xnocode/garden";
  const filePath = "src/data/pending-tasks.json";
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const authHeader = token.startsWith("github_pat_") || token.startsWith("ghp_") ? `Bearer ${token}` : `token ${token}`;

  try {
    let sha: string | undefined;
    let existingTasks: PendingTaskItem[] = [];

    try {
      const getRes = await fetch(url, {
        headers: {
          Authorization: authHeader,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DigitalGardenBot",
        },
      });
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
        const decoded = Buffer.from(data.content, "base64").toString("utf-8");
        existingTasks = JSON.parse(decoded);
      }
    } catch {
      // file might not exist yet
    }

    const newItems: PendingTaskItem[] = taskStrings
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => ({
        raw: t,
        addedAt: new Date().toISOString(),
      }));

    if (newItems.length === 0) {
      return { success: false, count: 0, message: "No valid task descriptions provided" };
    }

    const updatedTasks = [...existingTasks, ...newItems];
    const content = JSON.stringify(updatedTasks, null, 2);
    const base64Content = Buffer.from(content).toString("base64");

    const putBody: any = {
      message: `add ${newItems.length} task(s) via Telegram [skip ci]`,
      content: base64Content,
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "DigitalGardenBot",
      },
      body: JSON.stringify(putBody),
    });

    if (putRes.ok) {
      return { success: true, count: newItems.length, message: "Queued for WSL Taskwarrior" };
    } else {
      const errData = await putRes.json().catch(() => ({}));
      return { success: false, count: 0, message: errData.message || `GitHub HTTP ${putRes.status}` };
    }
  } catch (err: any) {
    return { success: false, count: 0, message: err.message || "Failed to queue tasks" };
  }
}

// ─── Task snapshot reader ───────────────────────────────────────────────────

export interface SnapshotTask {
  id: number;
  description: string;
  project: string | null;
  tags: string[];
  priority: string | null;
  due: string | null;
  urgency: number;
  overdue: boolean;
}

export interface TaskSnapshot {
  exportedAt: string;
  stats: { total: number; pending: number; completed: number; overdue: number };
  tasks: SnapshotTask[];
}

/**
 * Read the latest tasks.json snapshot from GitHub.
 * This reflects tasks as of the last `bun run deploy`.
 */
export async function getTasksFromGitHub(): Promise<TaskSnapshot | null> {
  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "xnocode/garden";
  const url = `https://api.github.com/repos/${repo}/contents/src/data/tasks.json`;
  const authHeader = token.startsWith("github_pat_") || token.startsWith("ghp_")
    ? `Bearer ${token}` : `token ${token}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DigitalGardenBot",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    return JSON.parse(decoded) as TaskSnapshot;
  } catch {
    return null;
  }
}

// ─── Pending-done queue ─────────────────────────────────────────────────────

/**
 * Queue task IDs to be marked done on next `bun run deploy`.
 * Writes/appends to src/data/pending-done.json on GitHub.
 */
export async function addPendingDoneToGitHub(
  taskIds: number[]
): Promise<{ success: boolean; count: number; message: string }> {
  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
  if (!token) return { success: false, count: 0, message: "No GITHUB_TOKEN configured" };

  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "xnocode/garden";
  const filePath = "src/data/pending-done.json";
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const authHeader = token.startsWith("github_pat_") || token.startsWith("ghp_")
    ? `Bearer ${token}` : `token ${token}`;

  try {
    let sha: string | undefined;
    let existingIds: number[] = [];

    try {
      const getRes = await fetch(url, {
        headers: {
          Authorization: authHeader,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DigitalGardenBot",
        },
      });
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
        const decoded = Buffer.from(data.content, "base64").toString("utf-8");
        existingIds = JSON.parse(decoded);
      }
    } catch { /* file may not exist yet */ }

    const updatedIds = [...new Set([...existingIds, ...taskIds])];
    const content = JSON.stringify(updatedIds, null, 2);
    const base64Content = Buffer.from(content).toString("base64");

    const putBody: any = {
      message: `mark ${taskIds.length} task(s) done via Telegram [skip ci]`,
      content: base64Content,
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "DigitalGardenBot",
      },
      body: JSON.stringify(putBody),
    });

    if (putRes.ok) {
      return { success: true, count: taskIds.length, message: "Queued for next deploy" };
    } else {
      const errData = await putRes.json().catch(() => ({}));
      return { success: false, count: 0, message: errData.message || `GitHub HTTP ${putRes.status}` };
    }
  } catch (err: any) {
    return { success: false, count: 0, message: err.message || "Failed to queue done" };
  }
}
