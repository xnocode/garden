/**
 * publish.ts — Digital Garden publish CLI.
 *
 * Scans the Obsidian vault (content/), imports every note whose frontmatter
 * has `draft: false`, renders it to HTML, computes outgoing links, copies
 * assets, and syncs everything into the SQLite database.
 *
 * Usage:
 *   bun run publish            # publish + preview summary
 *   bun run publish --watch    # re-publish on file change (for local dev)
 *
 * Only notes with `draft: false` in their frontmatter are published. All
 * others (draft: true, or missing the field) are kept private and removed
 * from the site.
 */

import {
  readdir,
  readFile,
  stat,
  copyFile,
  mkdir,
  unlink,
  watch,
  writeFile,
} from "node:fs/promises";
import { join, relative, dirname, basename, extname } from "node:path";
import { existsSync } from "node:fs";
import {
  renderMarkdown,
  parseFrontmatter,
  slugify,
  coerceTags,
  coerceStringArray,
  type RenderContext,
  type WikiLinkTarget,
} from "../src/lib/markdown";
import { fetchUrlPreviews, findUrlsInMarkdown } from "../src/lib/url-preview";

// Database is optional — only used for local dev with watch mode.
// On Vercel/build servers we skip DB entirely and use JSON files.
const isVercel = !!process.env.VERCEL || !!process.env.CI;
let db: any = null;
if (!isVercel && process.env.DATABASE_URL) {
  try {
    const { db: dbClient } = await import("../src/lib/db");
    db = dbClient;
  } catch {
    /* DB not available — JSON-only mode */
  }
}

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, "content");
const ASSETS_SRC = join(CONTENT_DIR, "assets");
const ASSETS_DST = join(ROOT, "public", "content-assets");
const IGNORE_DIRS = new Set([
  ".obsidian",
  "templates",
  "private",
  "node_modules",
  ".git",
]);
const IGNORE_FILES = new Set([".DS_Store"]);

interface ParsedFile {
  path: string; // relative to content/
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  aliases: string[];
  date?: Date;
  draft: boolean;
  content: string;
  raw: string;
  prevSlug?: string | null;
  nextSlug?: string | null;
}

// ----------------------------------------------------------------------------
// File walking
// ----------------------------------------------------------------------------

async function walkMarkdown(dir: string, base: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry) || IGNORE_FILES.has(entry)) continue;
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      out.push(...(await walkMarkdown(full, base)));
    } else if (s.isFile() && /\.md$/i.test(entry)) {
      out.push(relative(base, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

function titleFromFilename(name: string): string {
  return basename(name, extname(name))
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstH1(md: string): string | undefined {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : undefined;
}

// ----------------------------------------------------------------------------
// Parse pass
// ----------------------------------------------------------------------------

async function parsePass(files: string[]): Promise<ParsedFile[]> {
  const parsed: ParsedFile[] = [];
  for (const relPath of files) {
    const full = join(CONTENT_DIR, relPath);
    const raw = await readFile(full, "utf8");
    const { data, content } = parseFrontmatter(raw);
    const draft = data.draft === true || data.draft === "true";
    const title =
      (typeof data.title === "string" && data.title) ||
      firstH1(content) ||
      titleFromFilename(relPath);
    const slug =
      typeof data.permalink === "string" && data.permalink
        ? slugify(data.permalink)
        : slugify(basename(relPath, extname(relPath)));
    parsed.push({
      path: relPath,
      slug,
      title,
      description:
        typeof data.description === "string" ? data.description : undefined,
      tags: coerceTags(data.tags),
      aliases: coerceStringArray(data.aliases),
      date: todate(data.date ?? data.publish),
      draft,
      content,
      raw,
      prevSlug: typeof data.prev === "string" ? slugify(data.prev) : null,
      nextSlug: typeof data.next === "string" ? slugify(data.next) : null,
    });
  }
  return parsed;
}

function todate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

// ----------------------------------------------------------------------------
// Asset copy
// ----------------------------------------------------------------------------

async function copyAssets(): Promise<{ copied: number; list: string[] }> {
  const list: string[] = [];
  if (!existsSync(ASSETS_SRC)) return { copied: 0, list };
  await mkdir(ASSETS_DST, { recursive: true });
  let existing: string[] = [];
  try {
    existing = await readdir(ASSETS_DST);
  } catch {
    /* ignore */
  }
  for (const f of existing) {
    try {
      await unlink(join(ASSETS_DST, f));
    } catch {
      /* ignore */
    }
  }
  const walk = async (dir: string) => {
    const entries = await readdir(dir);
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry) || IGNORE_FILES.has(entry)) continue;
      const full = join(dir, entry);
      const s = await stat(full);
      if (s.isDirectory()) {
        await walk(full);
      } else if (!/\.md$/i.test(entry)) {
        // Copy all non-markdown files (images, video, audio, PDF, etc.)
        const rel = relative(CONTENT_DIR, full).replace(/\\/g, "/");
        const dstName = rel.replace(/[\\/]/g, "-");
        await copyFile(full, join(ASSETS_DST, dstName));
        list.push(dstName);
      }
    }
  };
  await walk(CONTENT_DIR);
  return { copied: list.length, list };
}

// ----------------------------------------------------------------------------
// Main publish
// ----------------------------------------------------------------------------

async function publish() {
  const startedAt = Date.now();
  console.log("\n  🌱  Digital Garden — publish\n");
  console.log(`  vault: ${relative(ROOT, CONTENT_DIR)}/`);

  const files = await walkMarkdown(CONTENT_DIR, CONTENT_DIR);
  console.log(`  discovered ${files.length} markdown file(s)`);

  const parsed = await parsePass(files);
  const publishable = parsed.filter((p) => !p.draft);
  const skipped = parsed.filter((p) => p.draft);

  console.log(
    `  publishing ${publishable.length} (draft:false), skipping ${skipped.length} (draft)\n`
  );

  // Build registry for wikilink resolution
  const slugs = new Set(publishable.map((p) => p.slug));
  const aliasToSlug = new Map<string, string>();
  const noteMeta = new Map<string, { title: string; description?: string }>();
  for (const p of publishable) {
    aliasToSlug.set(p.slug, p.slug);
    aliasToSlug.set(p.title.toLowerCase(), p.slug);
    for (const a of p.aliases) aliasToSlug.set(a.toLowerCase(), p.slug);
    noteMeta.set(p.slug, { title: p.title, description: p.description });
  }

  // Build notes data for contribution graph (real data, not random)
  const notesForGraph = publishable.map((p) => ({
    slug: p.slug,
    tags: p.tags,
    publishDate: p.date ? p.date.toISOString() : null,
    createdAt: (p.date ?? new Date()).toISOString(),
  }));

  // Copy assets FIRST so we can build the assetNames map and pass it to pass 1
  const assetResult = await copyAssets();
  console.log(`  copied ${assetResult.copied} asset(s)`);

  // Build assetNames map: original filename → copied name
  const assetNames = new Map<string, string>();
  for (const copiedName of assetResult.list) {
    assetNames.set(copiedName.toLowerCase(), copiedName);
    const parts = copiedName.split("-");
    if (parts.length > 1) {
      const withoutFirstFolder = parts.slice(1).join("-");
      assetNames.set(withoutFirstFolder.toLowerCase(), copiedName);
    }
  }

  const ctx: RenderContext = { slugs, aliasToSlug, noteMeta, assetBase: "", vaultPath: CONTENT_DIR, notesForGraph, assetNames };

  // --- Fetch URL previews for all bare URLs in all notes ---
  const allUrls = new Set<string>();
  for (const p of publishable) {
    const urls = findUrlsInMarkdown(p.content);
    urls.forEach((u) => allUrls.add(u));
  }
  let urlPreviews: Map<string, any> = new Map();
  if (allUrls.size > 0) {
    urlPreviews = await fetchUrlPreviews(Array.from(allUrls));
  }
  ctx.urlPreviews = urlPreviews;

  interface RenderedNote extends ParsedFile {
    html: string;
    links: WikiLinkTarget[];
    inlineTags: string[];
    wordCount: number;
  }

  // --- Pass 1: render all notes without transclusion inlining ---
  // This produces the base HTML bodies we'll inline in pass 2.
  const pass1: RenderedNote[] = [];
  let i = 0;
  for (const p of publishable) {
    i++;
    process.stdout.write(
      `\r  pass 1 [${i}/${publishable.length}] ${p.slug.padEnd(30)}`
    );
    try {
      const result = await renderMarkdown(p.content, ctx);
      pass1.push({
        ...p,
        html: result.html,
        links: result.links,
        inlineTags: result.tags,
        wordCount: result.wordCount,
      });
    } catch (err) {
      console.error(
        `\n  ✗ failed to render ${p.slug}: ${(err as Error).message}`
      );
    }
  }
  process.stdout.write("\n");

  // --- Build the bodies map for pass 2 (strip leading h1) ---
  const noteBodies = new Map<string, string>();
  for (const r of pass1) {
    const trimmed = r.html.trimStart();
    const m = trimmed.match(/^<h1[^>]*>[\s\S]*?<\/h1>/i);
    const body = m ? trimmed.slice(m[0].length).trimStart() : r.html;
    noteBodies.set(r.slug, body);
  }

  // --- Pass 2: re-render notes that contain note-embeds, with bodies available ---
  const ctx2: RenderContext = { ...ctx, noteBodies };
  const rendered: RenderedNote[] = [];
  let j = 0;
  for (const r of pass1) {
    j++;
    // Only re-render if this note has actual NOTE embeds (![[NoteName]]).
    // Check raw content for ![[...]] where the target is NOT a media file
    // and IS a known note slug.
    const slugSet = new Set(publishable.map((p) => p.slug));
    let hasNoteEmbed = false;
    const embedRegex = /!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
    let em: RegExpExecArray | null;
    while ((em = embedRegex.exec(r.content)) !== null) {
      const target = em[1].trim();
      // Skip media files
      if (/\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|mp4|webm|ogv|mov|m4v|avi|mkv|mp3|wav|ogg|oga|flac|m4a|aac|opus|pdf)$/i.test(target)) continue;
      // Check if target resolves to a known note
      const targetSlug = slugify(target);
      if (slugSet.has(targetSlug)) {
        hasNoteEmbed = true;
        break;
      }
    }
    if (!hasNoteEmbed) {
      rendered.push(r);
      continue;
    }
    process.stdout.write(
      `\r  pass 2 [${j}/${pass1.length}] ${r.slug.padEnd(30)}`
    );
    try {
      const result = await renderMarkdown(r.content, ctx2);
      rendered.push({
        ...r,
        html: result.html,
        links: result.links,
        inlineTags: result.tags,
        wordCount: result.wordCount,
      });
    } catch {
      rendered.push(r); // fall back to pass 1
    }
  }
  process.stdout.write("\n");

  // --- Export JSON data files (for serverless deployment without DB) ---
  await exportJsonData(rendered);
  console.log(`  exported JSON data files`);

  // Sync DB (only if database is available — local dev only)
  if (db) {
    try {
      const newSlugs = new Set(rendered.map((r) => r.slug));
      const existing = await db.note.findMany({ select: { slug: true } });
      const toDelete = existing
        .filter((e) => !newSlugs.has(e.slug))
        .map((e) => e.slug);
      if (toDelete.length) {
        await db.note.deleteMany({ where: { slug: { in: toDelete } } });
        console.log(`  removed ${toDelete.length} stale note(s)`);
      }

      let upserted = 0;
      for (const r of rendered) {
        const tags = Array.from(new Set([...r.tags, ...r.inlineTags])).sort();
        const now = new Date();
        const created = r.date ?? now;
        await db.note.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            title: r.title,
            description: r.description,
            content: r.content,
            html: r.html,
            raw: r.raw,
            tags: JSON.stringify(tags),
            aliases: JSON.stringify(r.aliases),
            links: JSON.stringify(r.links),
            wordCount: r.wordCount,
            draft: false,
            publishDate: r.date ?? null,
            createdAt: created,
            updatedAt: now,
            path: r.path,
            folder: dirname(r.path) === "." ? null : dirname(r.path),
          },
          update: {
            title: r.title,
            description: r.description,
            content: r.content,
            html: r.html,
            raw: r.raw,
            tags: JSON.stringify(tags),
            aliases: JSON.stringify(r.aliases),
            links: JSON.stringify(r.links),
            wordCount: r.wordCount,
            draft: false,
            publishDate: r.date ?? null,
            updatedAt: now,
            path: r.path,
            folder: dirname(r.path) === "." ? null : dirname(r.path),
          },
        });
        upserted++;
      }
      console.log(`  synced ${upserted} note(s) to database`);
    } catch (e) {
      console.log(`  (db sync skipped: ${(e as Error).message})`);
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
  console.log(`\n  ✓ published ${rendered.length} note(s) in ${elapsed}s`);

  for (const r of rendered) {
    const tagStr = r.tags.length ? `  #${r.tags.slice(0, 3).join(" #")}` : "";
    console.log(
      `    ${r.slug.padEnd(38)} ${String(r.wordCount).padStart(5)}w${tagStr}`
    );
  }
  if (skipped.length) {
    console.log(`\n  private (not published):`);
    for (const s of skipped) console.log(`    ${s.slug}`);
  }
  console.log("");
}

/**
 * Export all note data as JSON files to src/data/.
 * This allows the site to run on serverless platforms (Vercel) without
 * a database — the data layer reads from these JSON files instead.
 */
async function exportJsonData(rendered: RenderedNote[]) {
  const dataDir = join(ROOT, "src", "data");
  await mkdir(dataDir, { recursive: true });

  // Build the full notes array with all fields
  const notesData = rendered.map((r) => {
    const tags = Array.from(new Set([...r.tags, ...r.inlineTags])).sort();
    const now = new Date().toISOString();
    return {
      slug: r.slug,
      title: r.title,
      description: r.description,
      content: r.content,
      html: r.html,
      raw: r.raw,
      tags,
      aliases: r.aliases,
      links: r.links,
      wordCount: r.wordCount,
      draft: false,
      publishDate: r.date ? r.date.toISOString() : null,
      createdAt: (r.date ?? new Date()).toISOString(),
      updatedAt: now,
      path: r.path,
      folder: dirname(r.path) === "." ? null : dirname(r.path),
      prevSlug: r.prevSlug ?? null,
      nextSlug: r.nextSlug ?? null,
    };
  });

  await writeFile(
    join(dataDir, "notes.json"),
    JSON.stringify(notesData, null, 2),
    "utf8"
  );
}

// ----------------------------------------------------------------------------
// Watch mode
// ----------------------------------------------------------------------------

async function watchMode() {
  await publish();
  console.log("  👀 watching for changes… (Ctrl+C to stop)\n");
  let timer: ReturnType<typeof setTimeout> | null = null;
  const rerun = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await publish();
        console.log("  👀 watching for changes… (Ctrl+C to stop)\n");
      } catch (e) {
        console.error("  publish error:", (e as Error).message);
      }
    }, 400);
  };
  try {
    const watcher = watch(CONTENT_DIR, { recursive: true });
    for await (const _evt of watcher) {
      rerun();
    }
  } catch {
    console.log("  (recursive watch unavailable on this platform)");
  }
}

// ----------------------------------------------------------------------------
// Entry
// ----------------------------------------------------------------------------

const args = process.argv.slice(2);
const watchFlag = args.includes("--watch") || args.includes("-w");

publish()
  .then(async () => {
    if (watchFlag) {
      await watchMode();
    } else {
      if (db) await db.$disconnect();
    }
  })
  .catch(async (e) => {
    console.error("\n  ✗ publish failed:", e);
    if (db) await db.$disconnect();
    process.exit(1);
  });
