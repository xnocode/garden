import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { parseFrontmatter } from "../src/lib/markdown";

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, "content");

async function walkMarkdown(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".obsidian") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkMarkdown(full)));
    } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const files = await walkMarkdown(CONTENT_DIR);
  let publicCount = 0;
  let privateCount = 0;

  for (const fullPath of files) {
    if (fullPath.includes("Templates")) continue;

    const raw = await readFile(fullPath, "utf8");
    const rel = relative(CONTENT_DIR, fullPath).replace(/\\/g, "/");
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!match) {
      // Missing frontmatter entirely -> add with visibility: private
      const title = basename(fullPath, ".md").replace(/-/g, " ");
      const newContent = `---\ntitle: "${title}"\nauthor: Ridoy\nvisibility: private\n---\n\n${raw}`;
      await writeFile(fullPath, newContent, "utf8");
      privateCount++;
      console.log(`  🔒 Added private frontmatter: ${rel}`);
      continue;
    }

    let fm = match[1];
    const isDraftTrue = /draft:\s*true/i.test(fm);
    const isDraftFalse = /draft:\s*false/i.test(fm);
    const visMatch = fm.match(/visibility:\s*(\w+)/i);

    let targetVisibility = "public";
    if (visMatch) {
      targetVisibility = visMatch[1].toLowerCase();
    } else if (isDraftTrue) {
      targetVisibility = "private";
    } else if (isDraftFalse) {
      targetVisibility = "public";
    }

    // Filter out draft line
    const lines = fm.split(/\r?\n/).filter((l) => !l.trim().startsWith("draft:"));

    // Check if visibility line exists
    const visIndex = lines.findIndex((l) => l.trim().startsWith("visibility:"));
    if (visIndex !== -1) {
      lines[visIndex] = `visibility: ${targetVisibility}`;
    } else {
      // Place visibility right after author or title
      const authorIndex = lines.findIndex((l) => l.trim().startsWith("author:"));
      const titleIndex = lines.findIndex((l) => l.trim().startsWith("title:"));
      const insertAt = authorIndex !== -1 ? authorIndex + 1 : titleIndex !== -1 ? titleIndex + 1 : 0;
      lines.splice(insertAt, 0, `visibility: ${targetVisibility}`);
    }

    const newFrontmatter = lines.join("\n");
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
    const updatedRaw = `---\n${newFrontmatter}\n---${body}`;

    await writeFile(fullPath, updatedRaw, "utf8");

    if (targetVisibility === "private") {
      privateCount++;
      console.log(`  🔒 Private note: ${rel}`);
    } else {
      publicCount++;
    }
  }

  console.log(`\n🎉 Done! ${publicCount} public notes, ${privateCount} private notes.`);
}

main().catch(console.error);
