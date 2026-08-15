/**
 * publish.ts — Digital Garden publish CLI.
 *
 * Scans the Obsidian vault (content/), renders every note to HTML, computes
 * outgoing links, copies assets, and exports static JSON + syncs the database.
 *
 * Usage:
 *   bun run publish            # publish + preview summary
 *   bun run publish --watch    # re-publish on file change (for local dev)
 *
 * Visibility rules (frontmatter `visibility`):
 *   - public (default) → static JSON on the site, everyone can read
 *   - members          → static JSON on the site, gated to signed-in members
 *   - private          → static JSON on the site, gated to signed-in admin
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

// Database sync — only used for private notes (admin-only via API).
// Public/members notes live in the static JSON; the DB mirror exists so the
// server can serve private notes to the admin session at runtime.
let db: any = null;
if (process.env.DATABASE_URL) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    db = new PrismaClient();
  } catch {
    db = null;
  }
}

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, "content");
const ASSETS_SRC = join(CONTENT_DIR, "assets");
const ASSETS_DST = join(ROOT, "public", "content-assets");
const IGNORE_DIRS = new Set([
  ".obsidian",
  "templates",
  "Templates",
  "Attachments/Templates",
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
  author?: string;
  tags: string[];
  aliases: string[];
  date?: Date;
  updatedAt?: Date;
  visibility: "public" | "members" | "private";
  content: string;
  raw: string;
  prevSlug?: string | null;
  nextSlug?: string | null;
  series?: string | null;
  seriesOrder?: number | null;
}

export interface RenderedNote extends ParsedFile {
  html: string;
  links: WikiLinkTarget[];
  inlineTags: string[];
  wordCount: number;
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
    const title =
      (typeof data.title === "string" && data.title) ||
      firstH1(content) ||
      titleFromFilename(relPath);
    const slug =
      typeof data.permalink === "string" && data.permalink
        ? slugify(data.permalink)
        : slugify(basename(relPath, extname(relPath)));

    // Parse created / published date (checking date, created, createdAt, publish)
    const dateVal = data.date ?? data.created ?? data.createdAt ?? data.publish ?? data.publishDate;

    // Parse Linter updated date (checking updatedAt, last_modified, updated, modified, lastmod)
    const updatedVal = data.updatedAt ?? data.last_modified ?? data.updated ?? data.modified ?? data.lastmod;

    // Parse visibility (public, members, private)
    const rawVis = (data.visibility ?? data.access ?? "").toString().toLowerCase().trim();
    const visibility: "public" | "members" | "private" =
      rawVis === "private" || data.private === true
        ? "private"
        : rawVis === "members" || rawVis === "member"
        ? "members"
        : "public";

    parsed.push({
      path: relPath,
      slug,
      title,
      description:
        typeof data.description === "string" ? data.description : undefined,
      author:
        typeof data.author === "string" && data.author.trim()
          ? data.author.trim()
          : undefined,
      tags: coerceTags(data.tags),
      aliases: coerceStringArray(data.aliases),
      date: todate(dateVal),
      updatedAt: todate(updatedVal),
      visibility,
      content,
      raw,
      prevSlug: typeof data.prev === "string" ? slugify(data.prev) : null,
      nextSlug: typeof data.next === "string" ? slugify(data.next) : null,
      series:
        typeof data.series === "string" && data.series.trim()
          ? data.series.trim()
          : null,
      seriesOrder: (() => {
        const rawOrder = data.seriesOrder ?? data.seriesNumber ?? data.series_order;
        if (typeof rawOrder === "number") return rawOrder;
        if (typeof rawOrder === "string" && rawOrder.trim() !== "") {
          const n = Number(rawOrder);
          return isNaN(n) ? null : n;
        }
        return null;
      })(),
    });
  }
  return parsed;
}

function todate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    // Remove ordinal suffixes (1st, 2nd, 3rd, 4th...) if present from Moment formatting
    const cleaned = v.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
    const d = new Date(cleaned);
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
  const publishable = parsed;
  const privateNotes = parsed.filter((p) => p.visibility === "private");

  console.log(
    `  publishing ${publishable.length} note(s) to site (${privateNotes.length} private, admin-gated)\n`
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
            visibility: r.visibility,
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
            visibility: r.visibility,
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
  if (privateNotes.length) {
    console.log(`\n  private (admin-only, served via DB):`);
    for (const s of privateNotes) console.log(`    ${s.slug}`);
  }
  console.log("");
}

/**
 * Export public, members, and private note data as JSON files to src/data/.
 * This allows the site to run on serverless platforms (Vercel) without
 * a database — the data layer reads from these JSON files instead.
 *
 * Private and members notes are gated via client and server auth checks.
 */
async function exportJsonData(rendered: RenderedNote[]) {
  const dataDir = join(ROOT, "src", "data");
  await mkdir(dataDir, { recursive: true });

  // Build the full notes array with all fields — all visibilities included
  const exportable = rendered;
  const notesData = exportable.map((r) => {
    const tags = Array.from(new Set([...r.tags, ...r.inlineTags])).sort();
    const now = new Date().toISOString();
    return {
      slug: r.slug,
      title: r.title,
      description: r.description,
      author: r.author ?? null,
      content: r.content,
      html: r.html,
      raw: r.raw,
      tags,
      aliases: r.aliases,
      links: r.links,
      wordCount: r.wordCount,
      visibility: r.visibility,
      publishDate: r.date ? r.date.toISOString() : null,
      createdAt: (r.date ?? new Date()).toISOString(),
      updatedAt: (r.updatedAt ?? new Date()).toISOString(),
      path: r.path,
      folder: dirname(r.path) === "." ? null : dirname(r.path),
      prevSlug: r.prevSlug ?? null,
      nextSlug: r.nextSlug ?? null,
      series: r.series ?? null,
      seriesOrder: r.seriesOrder ?? null,
    };
  });

  await writeFile(
    join(dataDir, "notes.json"),
    JSON.stringify(notesData, null, 2),
    "utf8"
  );

  // Copy keep-the-rhythm data to src/data/ keep-the-rhythm.json so stats work on Vercel
  const rhythmPath = join(CONTENT_DIR, ".obsidian", "plugins", "keep-the-rhythm", "data.json");
  if (existsSync(rhythmPath)) {
    try {
      const rhythmRaw = await readFile(rhythmPath, "utf8");
      await writeFile(join(dataDir, "keep-the-rhythm.json"), rhythmRaw, "utf8");
    } catch {
      /* ignore */
    }
  }
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
