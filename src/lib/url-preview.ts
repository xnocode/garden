/**
 * URL preview fetcher — fetches metadata (title, description, image) for
 * external URLs at publish time. Results are cached to avoid re-fetching.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface UrlPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

const CACHE_FILE = join(process.cwd(), "src/data/url-previews.json");

function loadCache(): Map<string, UrlPreview> {
  try {
    if (existsSync(CACHE_FILE)) {
      const data = readFileSync(CACHE_FILE, "utf8");
      const arr = JSON.parse(data) as Array<[string, UrlPreview]>;
      return new Map(arr);
    }
  } catch {
    /* ignore */
  }
  return new Map();
}

function saveCache(cache: Map<string, UrlPreview>) {
  try {
    const arr = Array.from(cache.entries());
    writeFileSync(CACHE_FILE, JSON.stringify(arr, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

/**
 * Fetch metadata for a URL. Returns null if the fetch fails.
 * Uses a 10-second timeout and follows redirects.
 */
async function fetchUrlPreview(url: string): Promise<UrlPreview | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GardenBot/1.0)",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    // Extract title
    let title: string | null = null;
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();

    // Extract og:title (preferred)
    const ogTitleMatch = html.match(
      /<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']*)["']/i
    );
    if (ogTitleMatch) title = ogTitleMatch[1].trim();

    // Extract description
    let description: string | null = null;
    const descMatch = html.match(
      /<meta\s+(?:property|name)=["'](description|og:description)["']\s+content=["']([^"']*)["']/i
    );
    if (descMatch) description = descMatch[2].trim();

    // Extract og:image
    let image: string | null = null;
    const imgMatch = html.match(
      /<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']*)["']/i
    );
    if (imgMatch) {
      image = imgMatch[1].trim();
      // Make relative URLs absolute
      if (image.startsWith("//")) {
        image = `https:${image}`;
      } else if (image.startsWith("/")) {
        const u = new URL(url);
        image = `${u.origin}${image}`;
      }
    }

    // Extract site name
    let siteName: string | null = null;
    const siteMatch = html.match(
      /<meta\s+(?:property|name)=["']og:site_name["']\s+content=["']([^"']*)["']/i
    );
    if (siteMatch) siteName = siteMatch[1].trim();
    if (!siteName) {
      // Fallback: extract domain name
      try {
        const u = new URL(url);
        siteName = u.hostname.replace(/^www\./, "");
      } catch {
        /* ignore */
      }
    }

    // Favicon
    let favicon: string | null = null;
    const favMatch = html.match(
      /<link\s+rel=["'](?:shortcut )?icon["']\s+href=["']([^"']*)["']/i
    );
    if (favMatch) {
      favicon = favMatch[1].trim();
      if (favicon.startsWith("//")) {
        favicon = `https:${favicon}`;
      } else if (favicon.startsWith("/")) {
        const u = new URL(url);
        favicon = `${u.origin}${favicon}`;
      }
    } else {
      // Default favicon path
      try {
        const u = new URL(url);
        favicon = `${u.origin}/favicon.ico`;
      } catch {
        /* ignore */
      }
    }

    return {
      url,
      title: title || siteName || url,
      description,
      image,
      siteName: siteName || favicon,
    };
  } catch {
    return null;
  }
}

const MEDIA_EXTS = /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|mp4|webm|ogv|mov|m4v|avi|mkv|mp3|wav|ogg|oga|flac|m4a|aac|opus|pdf)$/i;

/**
 * Fetch previews for all URLs in the given list.
 * Uses a cache to avoid re-fetching URLs that were already previewed.
 */
export async function fetchUrlPreviews(
  urls: string[]
): Promise<Map<string, UrlPreview>> {
  const cache = loadCache();
  const toFetch = urls.filter((u) => !cache.has(u) && !MEDIA_EXTS.test(u));

  if (toFetch.length > 0) {
    console.log(`  fetching ${toFetch.length} URL preview(s)…`);
    for (const url of toFetch) {
      const preview = await fetchUrlPreview(url);
      if (preview) {
        cache.set(url, preview);
        console.log(`    ✓ ${url.slice(0, 50)}… → ${preview.title?.slice(0, 40)}`);
      } else {
        console.log(`    ✗ ${url.slice(0, 50)}… (failed)`);
        // Cache null results too so we don't retry
        cache.set(url, { url, title: null, description: null, image: null, siteName: null });
      }
    }
    saveCache(cache);
  }

  return cache;
}

/** Find all bare URLs in markdown text. */
export function findUrlsInMarkdown(markdown: string): string[] {
  const urls = new Set<string>();
  // Match bare URLs (not inside markdown links or images)
  const regex = /(?<![\[(])https?:\/\/[^\s<>\])"',)]+/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(markdown)) !== null) {
    // Clean trailing punctuation
    let url = m[0].replace(/[.,;!?)]+$/, "");
    urls.add(url);
  }
  return Array.from(urls);
}
