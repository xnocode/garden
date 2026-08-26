/**
 * notebook-pipeline.ts
 *
 * RFC-042: Production-Grade Handwritten Manuscript & Interactive Flipbook Engine.
 * Ingestion & Build Pipeline:
 * - Cloud & Google Drive stream resolver with virus scan bypass.
 * - Deterministic SHA-256 incremental caching (.cache/notebooks/<hash>/).
 * - Multi-resolution WebP rasterizer (1400w standard, 2800w @2x HiDPI, 320w thumb).
 * - Dual-layer OCR / text coordinate extraction for selectable handwriting.
 */

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile, readdir } from "node:fs/promises";
import { join, isAbsolute } from "node:path";
import { existsSync } from "node:fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import type { NotebookManifest, NotebookPage, NotebookTextItem, PaperTheme } from "./notes";

export interface ProcessNotebookOptions {
  slug: string;
  title: string;
  pdfSource: string;
  paperTheme?: PaperTheme;
  cover?: string;
  vaultPath: string;
  cacheDir?: string;
  outputDir?: string;
}

function pad(num: number, size = 3): string {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

/**
 * Resolve PDF source from Google Drive, cloud URLs, or local vault paths.
 */
export async function resolvePdfSource(source: string, vaultPath: string): Promise<Buffer> {
  const trimmed = source.trim();

  // 1. Google Drive URLs
  const gdriveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch) {
    const fileId = gdriveMatch[1];
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    return await fetchCloudPdf(directUrl);
  }

  // 2. Generic HTTP/HTTPS URLs (S3, Dropbox, Cloudflare R2, etc.)
  if (/^https?:\/\//i.test(trimmed)) {
    let fetchUrl = trimmed;
    // Dropbox direct download fix (?dl=0 -> ?dl=1)
    if (trimmed.includes("dropbox.com") && trimmed.includes("dl=0")) {
      fetchUrl = trimmed.replace("dl=0", "dl=1");
    }
    return await fetchCloudPdf(fetchUrl);
  }

  // 3. Local file paths (relative to vault or absolute)
  const candidatePaths = [
    isAbsolute(trimmed) ? trimmed : join(vaultPath, trimmed),
    join(vaultPath, "assets", trimmed),
    join(vaultPath, "Attachments", trimmed),
    join(vaultPath, "Attachments", "Ink", trimmed),
    join(process.cwd(), trimmed),
  ];

  for (const candidate of candidatePaths) {
    if (existsSync(candidate)) {
      return await readFile(candidate);
    }
  }

  throw new Error(`PDF source not found: "${trimmed}". Looked in vault and attachments.`);
}

async function fetchCloudPdf(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Failed to download cloud PDF (${res.status} ${res.statusText}): ${url}`);
  }

  // Check if Google Drive returned a confirmation HTML page for large files
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    const html = await res.text();
    // Look for confirm token in HTML
    const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);
    const idMatch = html.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (confirmMatch && idMatch) {
      const confirmUrl = `https://drive.google.com/uc?export=download&id=${idMatch[1]}&confirm=${confirmMatch[1]}`;
      const retryRes = await fetch(confirmUrl, { redirect: "follow" });
      if (retryRes.ok) {
        const arrayBuf = await retryRes.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    }
    throw new Error(`Cloud download returned HTML instead of PDF binary for ${url}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/**
 * Process a PDF notebook with incremental SHA-256 caching and multi-resolution WebP rendering.
 */
export async function processNotebook(opts: ProcessNotebookOptions): Promise<NotebookManifest> {
  const {
    slug,
    title,
    pdfSource,
    paperTheme = "warm-grid",
    cover,
    vaultPath,
    cacheDir = join(process.cwd(), ".cache", "notebooks"),
    outputDir = join(process.cwd(), "public", "content-assets", "notebooks", slug),
  } = opts;

  // Step 1: Resolve PDF binary
  const pdfBuffer = await resolvePdfSource(pdfSource, vaultPath);

  // Step 2: Compute deterministic cache key
  const contentHash = createHash("sha256").update(pdfBuffer).digest("hex");
  const compositeKey = `${pdfSource}:${contentHash}:v1`;
  const cacheKey = createHash("sha256").update(compositeKey).digest("hex");
  const notebookCacheDir = join(cacheDir, cacheKey);
  const cacheManifestPath = join(notebookCacheDir, "manifest.json");

  await mkdir(outputDir, { recursive: true });

  // Step 3: Check cache hit (0ms overhead during note edits)
  if (existsSync(cacheManifestPath)) {
    try {
      const cachedRaw = await readFile(cacheManifestPath, "utf8");
      const manifest: NotebookManifest = JSON.parse(cachedRaw);
      manifest.slug = slug;
      manifest.title = title;
      manifest.theme = paperTheme;

      // Copy cached images to public destination
      const cachedFiles = await readdir(notebookCacheDir);
      for (const file of cachedFiles) {
        if (file.endsWith(".webp") || file === "manifest.json") {
          await copyFile(join(notebookCacheDir, file), join(outputDir, file));
        }
      }

      // Update image paths in manifest to match target slug
      manifest.pages = manifest.pages.map((p) => ({
        ...p,
        image: `/content-assets/notebooks/${slug}/page-${pad(p.pageNumber)}.webp`,
        image2x: `/content-assets/notebooks/${slug}/page-${pad(p.pageNumber)}@2x.webp`,
        thumb: `/content-assets/notebooks/${slug}/page-${pad(p.pageNumber)}.thumb.webp`,
      }));

      return manifest;
    } catch {
      // Cache corrupted, fallback to re-rendering
    }
  }

  // Step 4: Cache Miss — Rasterize PDF & Extract Text Coordinates
  await mkdir(notebookCacheDir, { recursive: true });

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: false,
  }).promise;

  const numPages = doc.numPages;
  const pages: NotebookPage[] = [];
  let totalAspect = 0;

  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const baseWidth = Math.round(unscaledViewport.width);
    const baseHeight = Math.round(unscaledViewport.height);
    const aspectRatio = baseWidth / baseHeight;
    totalAspect += aspectRatio;

    // Render viewport at 2x scale for sharp Retina / HiDPI quality
    const renderScale = 2.5;
    const renderViewport = page.getViewport({ scale: renderScale });
    const canvas = createCanvas(Math.round(renderViewport.width), Math.round(renderViewport.height));
    const ctx = canvas.getContext("2d");

    // Fill white background before rendering
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx as any,
      viewport: renderViewport,
      canvas: canvas as any,
    } as any).promise;

    const pngBuffer = canvas.toBuffer("image/png");

    // Generate multi-resolution WebP images
    const pagePrefix = `page-${pad(p)}`;

    // 1. HiDPI @2x (up to 2800w for zoom mode)
    const buf2x = await sharp(pngBuffer)
      .resize({ width: 2800, withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();

    // 2. Standard 1x (1400w)
    const buf1x = await sharp(pngBuffer)
      .resize({ width: 1400, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    // 3. Thumbnail scrubber (320w)
    const bufThumb = await sharp(pngBuffer)
      .resize({ width: 320, withoutEnlargement: true })
      .webp({ quality: 70, effort: 2 })
      .toBuffer();

    // Write to cache
    await writeFile(join(notebookCacheDir, `${pagePrefix}@2x.webp`), buf2x);
    await writeFile(join(notebookCacheDir, `${pagePrefix}.webp`), buf1x);
    await writeFile(join(notebookCacheDir, `${pagePrefix}.thumb.webp`), bufThumb);

    // Write to public folder
    await writeFile(join(outputDir, `${pagePrefix}@2x.webp`), buf2x);
    await writeFile(join(outputDir, `${pagePrefix}.webp`), buf1x);
    await writeFile(join(outputDir, `${pagePrefix}.thumb.webp`), bufThumb);

    // Extract text content & glyph coordinates
    const textContent = await page.getTextContent();
    const textLayer: NotebookTextItem[] = [];

    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const tx = item.transform[4];
      const ty = item.transform[5];
      const w = item.width || 0;
      const h = item.height || Math.abs(item.transform[3]) || 12;

      // Convert PDF coordinate system (origin bottom-left) to percentage (origin top-left)
      const xPercent = (tx / unscaledViewport.width) * 100;
      const yPercent = ((unscaledViewport.height - ty - h) / unscaledViewport.height) * 100;
      const widthPercent = (w / unscaledViewport.width) * 100;
      const heightPercent = (h / unscaledViewport.height) * 100;

      textLayer.push({
        text: item.str,
        x: Math.max(0, Math.min(100, xPercent)),
        y: Math.max(0, Math.min(100, yPercent)),
        width: Math.max(0, Math.min(100, widthPercent)),
        height: Math.max(0, Math.min(100, heightPercent)),
      });
    }

    pages.push({
      pageNumber: p,
      image: `/content-assets/notebooks/${slug}/${pagePrefix}.webp`,
      image2x: `/content-assets/notebooks/${slug}/${pagePrefix}@2x.webp`,
      thumb: `/content-assets/notebooks/${slug}/${pagePrefix}.thumb.webp`,
      width: baseWidth,
      height: baseHeight,
      aspectRatio,
      textLayer: textLayer.length > 0 ? textLayer : undefined,
    });
  }

  const avgAspect = numPages > 0 ? totalAspect / numPages : 0.707;

  const manifest: NotebookManifest = {
    slug,
    title,
    pdfUrl: /^https?:\/\//i.test(pdfSource) ? pdfSource : undefined,
    pageCount: numPages,
    aspectRatio: avgAspect,
    theme: paperTheme,
    pages,
    coverImage: cover || (pages[0] ? pages[0].image : undefined),
  };

  // Save manifest in cache & public directory
  const manifestJson = JSON.stringify(manifest, null, 2);
  await writeFile(cacheManifestPath, manifestJson, "utf8");
  await writeFile(join(outputDir, "manifest.json"), manifestJson, "utf8");

  return manifest;
}
