/**
 * sync-drafts.ts — Keeps draft:true and visibility:private notes local-only
 * by untracking them from the Git index and adding to .git/info/exclude.
 *
 * Rules:
 *   - draft: true        → excluded from Git (stays local only, not published)
 *   - visibility: private → excluded from Git (published to DB only, not to GitHub)
 *   - everything else    → committed to GitHub as normal
 *
 * This means private notes are visible on your website (only to you as admin)
 * but their markdown source never appears in your GitHub repo.
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { parseFrontmatter } from "../src/lib/markdown";

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, "content");
const EXCLUDE_PATH = join(ROOT, ".git", "info", "exclude");

async function walkMarkdown(dir: string, base: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === ".git" || entry === "node_modules" || entry === ".obsidian") continue;
    const full = join(dir, entry);
    try {
      await readdir(full); // check if dir — throws if file
      out.push(...(await walkMarkdown(full, base)));
    } catch {
      if (/\.md$/i.test(entry)) {
        out.push(relative(base, full).replace(/\\/g, "/"));
      }
    }
  }
  return out;
}

export async function syncDraftExclusions(): Promise<{
  drafts: string[];
  privateNotes: string[];
  publishedCount: number;
}> {
  const mdFiles = await walkMarkdown(CONTENT_DIR, CONTENT_DIR);
  const draftPaths: string[] = [];
  const privatePaths: string[] = [];
  let publishedCount = 0;

  for (const relPath of mdFiles) {
    const fullPath = join(CONTENT_DIR, relPath);
    try {
      const raw = await readFile(fullPath, "utf8");
      const { data } = parseFrontmatter(raw);
      const gitRelPath = `content/${relPath}`;

      // Check if it's a draft (draft: true means not published at all)
      const isDraft =
        data.draft === true ||
        data.draft === "true" ||
        (!("draft" in data) && false); // only explicit draft:true

      // Check if it's a private note (visible on website to admin only, but not on GitHub)
      const isPrivate =
        data.visibility === "private" ||
        data.access === "private" ||
        data.private === true;

      if (isDraft) {
        draftPaths.push(gitRelPath);
      } else if (isPrivate) {
        privatePaths.push(gitRelPath);
      } else {
        publishedCount++;
      }
    } catch {
      // Ignore read errors
    }
  }

  // All paths to exclude from Git (drafts + private notes)
  const allExcluded = [...draftPaths, ...privatePaths];

  // Ensure .git/info directory exists
  const infoDir = dirname(EXCLUDE_PATH);
  if (!existsSync(infoDir)) {
    await mkdir(infoDir, { recursive: true });
  }

  // Read existing .git/info/exclude lines
  let existingLines: string[] = [];
  if (existsSync(EXCLUDE_PATH)) {
    const content = await readFile(EXCLUDE_PATH, "utf8");
    existingLines = content.split(/\r?\n/);
  }

  // Remove all previous content/ entries managed by this script
  const nonContentLines = existingLines.filter(
    (line) =>
      !line.trim().startsWith("content/") &&
      !line.trim().startsWith("# Auto-generated")
  );

  // Write new exclude file
  const newExcludeContent = [
    ...nonContentLines,
    "# Auto-generated exclusions (Digital Garden) — DO NOT EDIT",
    "# draft:true notes (not published anywhere)",
    ...draftPaths,
    "# visibility:private notes (in DB only — not on GitHub)",
    ...privatePaths,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  await writeFile(EXCLUDE_PATH, newExcludeContent, "utf8");

  // Untrack all excluded files from Git index if they were previously tracked
  for (const excludedPath of allExcluded) {
    try {
      execSync(`git rm --cached -f "${excludedPath}"`, { stdio: "pipe" });
      const kind = privatePaths.includes(excludedPath) ? "private note" : "draft";
      console.log(`    🔒 Untracked ${kind} from Git: ${excludedPath}`);
    } catch {
      // Not currently tracked — that's fine
    }
  }

  return { drafts: draftPaths, privateNotes: privatePaths, publishedCount };
}

// Run directly if invoked from CLI
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  syncDraftExclusions()
    .then(({ drafts, privateNotes, publishedCount }) => {
      console.log(
        `\n  ✅ Sync complete:\n` +
          `     ${drafts.length} draft(s) excluded (local only)\n` +
          `     ${privateNotes.length} private note(s) excluded from GitHub (in DB only)\n` +
          `     ${publishedCount} note(s) published to GitHub\n`
      );
    })
    .catch((err) => {
      console.error("  ✗ Error syncing exclusions:", err);
    });
}
