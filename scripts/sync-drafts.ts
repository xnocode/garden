/**
 * sync-drafts.ts — Keeps draft:true notes local-only by untracking them
 * from Git index and adding them to .git/info/exclude.
 *
 * Notes with `draft: true` remain safely in content/ on your disk,
 * but are excluded from Git commits and pushed repos.
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
      const s = await readdir(full); // check if dir
      out.push(...(await walkMarkdown(full, base)));
    } catch {
      if (/\.md$/i.test(entry)) {
        out.push(relative(base, full).replace(/\\/g, "/"));
      }
    }
  }
  return out;
}

export async function syncDraftExclusions(): Promise<{ drafts: string[]; publishedCount: number }> {
  const mdFiles = await walkMarkdown(CONTENT_DIR, CONTENT_DIR);
  const draftPaths: string[] = [];
  let publishedCount = 0;

  for (const relPath of mdFiles) {
    const fullPath = join(CONTENT_DIR, relPath);
    try {
      const raw = await readFile(fullPath, "utf8");
      const { data } = parseFrontmatter(raw);
      const isDraft = data.draft !== false && data.draft !== "false";
      const gitRelPath = `content/${relPath}`;

      if (isDraft) {
        draftPaths.push(gitRelPath);
      } else {
        publishedCount++;
      }
    } catch {
      // Ignore read errors
    }
  }

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

  // Filter out any previous content/ entries that are no longer drafts
  const nonContentLines = existingLines.filter(
    (line) => !line.trim().startsWith("content/")
  );

  // Combine non-content lines with current draft paths
  const draftLines = draftPaths.map((p) => p);
  const newExcludeContent = [
    ...nonContentLines,
    "# Auto-generated draft exclusions (Digital Garden)",
    ...draftLines,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  await writeFile(EXCLUDE_PATH, newExcludeContent, "utf8");

  // Untrack draft files from Git index if they were previously tracked
  for (const draftPath of draftPaths) {
    try {
      execSync(`git rm --cached -f "${draftPath}"`, {
        stdio: "pipe",
      });
      console.log(`    🔒 Untracked draft note from Git: ${draftPath}`);
    } catch {
      // File was not currently tracked in Git index, which is expected for new drafts
    }
  }

  return { drafts: draftPaths, publishedCount };
}

// Run directly if invoked from CLI
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  syncDraftExclusions().then(({ drafts, publishedCount }) => {
    console.log(`\n  ✅ Draft sync complete: ${drafts.length} drafts excluded, ${publishedCount} published notes active.\n`);
  }).catch((err) => {
    console.error("  ✗ Error syncing draft exclusions:", err);
  });
}
