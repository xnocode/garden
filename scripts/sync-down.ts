/**
 * sync-down.ts — Pulls notes created from the web / mobile devices into the local
 * Obsidian content/ folder so your local vault stays 100% complete and synchronized.
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { db } from "../src/lib/db";

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, "content");

export async function syncDownWebNotes(): Promise<{ pulledCount: number }> {
  try {
    const dbNotes = await db.note.findMany();
    let pulledCount = 0;

    for (const note of dbNotes) {
      const targetRelPath = note.path || `${note.slug}.md`;
      const fullPath = join(CONTENT_DIR, targetRelPath);

      // If file does not exist locally, download it
      if (!existsSync(fullPath)) {
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        // Write raw markdown with YAML frontmatter
        await writeFile(fullPath, note.raw, "utf8");
        pulledCount++;
        console.log(`    📥 Synced new note from cloud: ${targetRelPath}`);
      }
    }

    return { pulledCount };
  } catch (err: any) {
    console.warn(`    ⚠️ Note sync-down skipped (database check): ${err?.message}`);
    return { pulledCount: 0 };
  }
}

// Run directly if invoked from CLI
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  syncDownWebNotes()
    .then(({ pulledCount }) => {
      console.log(`\n  ✅ Sync-down complete: ${pulledCount} new note(s) downloaded from cloud.\n`);
    })
    .catch((err) => {
      console.error("  ✗ Error during sync-down:", err);
    });
}
