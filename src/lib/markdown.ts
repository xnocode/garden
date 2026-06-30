/**
 * Obsidian-flavored markdown rendering engine.
 *
 * Supports:
 *  - YAML frontmatter (via gray-matter)
 *  - Wikilinks: [[Note]], [[Note|alias]], [[Note#heading]], [[Note#^block]]
 *  - Embeds:     ![[Note]], ![[Note#heading]], ![[image.png]], ![[image.png|alt WxH]]
 *  - Inline tags: #tag, #nested/tag
 *  - Callouts: > [!type] title   (collapsible with - / +)
 *  - Highlights: ==text==
 *  - Comments:   %%hidden%%
 *  - Math: $inline$ and $$block$$ (KaTeX)
 *  - Mermaid diagrams (rendered client-side)
 *  - Code blocks with Shiki syntax highlighting
 *  - GFM: tables, strikethrough, task lists, footnotes
 *  - Heading anchors + autolink
 *
 * Used by the publish script to pre-render note HTML at build time.
 */

import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, RootContent, Text } from "mdast";
import type { Element, ElementContent, Root as HastRoot } from "hast";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHighlighter } from "shiki";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface WikiLinkTarget {
  /** Original target text exactly as written inside [[...]], before the | alias. */
  original: string;
  /** Resolved slug (lowercased, kebab). */
  slug: string;
  /** Optional heading anchor (#heading) — without the #. */
  heading?: string;
  /** Optional block reference (^id) — without the ^. */
  block?: string;
  /** Alias / display text. */
  alias?: string;
  /** Whether the target note exists in the registry. */
  exists: boolean;
}

export interface RenderResult {
  html: string;
  /** Outgoing wikilinks (deduped by slug). */
  links: WikiLinkTarget[];
  /** Inline tags found in the body (e.g. #essay). */
  tags: string[];
  /** Word count of the plain-text body. */
  wordCount: number;
}

export interface RenderContext {
  /** Set of all known note slugs. */
  slugs: Set<string>;
  /** Map of alias → slug for resolving [[alias]] links. */
  aliasToSlug: Map<string, string>;
  /** Map of slug → { title, description } for embed cards. */
  noteMeta: Map<string, { title: string; description?: string }>;
  /** Public base path for embedded assets. */
  assetBase?: string;
  /**
   * Optional: pre-rendered HTML bodies (without leading h1) for true
   * transclusion. When present, note embeds (`![[Note]]`) inline the
   * target's rendered body inside a transclusion container instead of
   * showing a link card. Populated by a two-pass render in the publish
   * script.
   */
  noteBodies?: Map<string, string>;
  /** Root path of the Obsidian vault (for reading .drawing/.writing files). */
  vaultPath?: string;
  /** All notes with tags + dates — used by contribution graph for real data. */
  notesForGraph?: Array<{
    slug: string;
    tags: string[];
    publishDate: string | null;
    createdAt: string;
  }>;
  /**
   * Map of filename → copied asset name. When a note embeds `![[sample-audio.wav]]`,
   * we look up the actual copied filename (e.g. "assets-sample-audio.wav")
   * in this map. Keyed by the original filename (case-insensitive).
   */
  assetNames?: Map<string, string>;
  /** URL previews — map of URL → {title, description, image, siteName}. */
  urlPreviews?: Map<string, { title: string | null; description: string | null; image: string | null; siteName: string | null }>;
}

// ----------------------------------------------------------------------------
// Slug helpers
// ----------------------------------------------------------------------------

/** Turn a note name / path into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\u00C0-\u024F\u4e00-\u9fff/-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Resolve a wikilink target string into a WikiLinkTarget. */
function resolveTarget(
  raw: string,
  ctx: RenderContext
): { slug: string; heading?: string; block?: string } {
  let target = raw;
  let heading: string | undefined;
  let block: string | undefined;

  const headingIdx = target.indexOf("#");
  if (headingIdx !== -1) {
    const after = target.slice(headingIdx + 1);
    target = target.slice(0, headingIdx);
    if (after.startsWith("^")) {
      block = after.slice(1);
    } else {
      heading = after;
    }
  }

  let slug = slugify(target);
  // If target matches an alias exactly, resolve via registry
  if (ctx.aliasToSlug.has(target.toLowerCase())) {
    slug = ctx.aliasToSlug.get(target.toLowerCase())!;
  } else if (ctx.aliasToSlug.has(slug)) {
    slug = ctx.aliasToSlug.get(slug)!;
  }
  return { slug, heading, block };
}

// ----------------------------------------------------------------------------
// Remark plugins
// ----------------------------------------------------------------------------

interface WikiLinkNode {
  type: "wikiLink";
  target: WikiLinkTarget;
  display: string;
  data?: { hProperties?: Record<string, unknown> };
}

interface EmbedNode {
  type: "embed";
  target: WikiLinkTarget;
  raw: string;
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  isPdf: boolean;
  alt?: string;
  width?: number;
  height?: number;
  data?: { hProperties?: Record<string, unknown> };
}

interface HighlightNode {
  type: "highlight";
  children: [{ type: "text"; value: string }];
  data?: { hProperties?: Record<string, unknown> };
}

interface TagNode {
  type: "tagLink";
  tag: string;
  data?: { hProperties?: Record<string, unknown> };
}

const IMAGE_EXT = /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)$/i;
const VIDEO_EXT = /\.(mp4|webm|ogv|mov|m4v|avi|mkv)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|flac|m4a|aac|opus)$/i;
const PDF_EXT = /\.pdf$/i;

/**
 * Detect known embeddable platforms (YouTube, Vimeo, SoundCloud, etc.)
 * and return the embed URL. Returns null if not a recognized platform.
 */
function getEmbedUrl(url: string): string | null {
  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo: vimeo.com/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  // SoundCloud: soundcloud.com/artist/track
  if (url.includes("soundcloud.com/")) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      url
    )}&color=%2384a59d&auto_play=false`;
  }

  // Spotify: open.spotify.com/track/ID, /album/ID, /episode/ID, /show/ID
  const spotifyMatch = url.match(
    /open\.spotify\.com\/(track|album|episode|show|playlist)\/([\w]+)/
  );
  if (spotifyMatch) {
    return `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`;
  }

  // GitHub Gist: gist.github.com/user/ID
  const gistMatch = url.match(/gist\.github\.com\/([\w-]+)\/([\w]+)/);
  if (gistMatch)
    return `https://gist.github.com/${gistMatch[1]}/${gistMatch[2]}.js`;

  // Google Drive: drive.google.com/file/d/ID/view
  const gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (gdriveMatch)
    return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;

  // Google Docs: docs.google.com/document/d/ID
  const gdocMatch = url.match(/docs\.google\.com\/document\/d\/([\w-]+)/);
  if (gdocMatch)
    return `https://docs.google.com/document/d/${gdocMatch[1]}/preview`;

  // Google Slides: docs.google.com/presentation/d/ID
  const gslidesMatch = url.match(
    /docs\.google\.com\/presentation\/d\/([\w-]+)/
  );
  if (gslidesMatch)
    return `https://docs.google.com/presentation/d/${gslidesMatch[1]}/embed`;

  // CodePen: codepen.io/user/pen/ID
  const codepenMatch = url.match(/codepen\.io\/([\w-]+)\/pen\/([\w-]+)/);
  if (codepenMatch)
    return `https://codepen.io/${codepenMatch[1]}/embed/${codepenMatch[2]}`;

  return null;
}

/**
 * Remark plugin: parse [[wikilinks]] and ![[embeds]] from text nodes.
 * Records resolved targets into the provided `links` array.
 */
export function remarkObsidianLinks(ctx: RenderContext, links: WikiLinkTarget[]) {
  return (tree: Root) => {
    visit(tree, "text", (node, index, parent) => {
      const value = (node as Text).value;
      // Combined regex for embeds and wikilinks
      const regex = /!\[\[([^\]]+)\]\]|\[\[([^\]]+)\]\]/g;
      const segments: RootContent[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(value)) !== null) {
        if (m.index > last) {
          segments.push({ type: "text", value: value.slice(last, m.index) });
        }
        const isEmbed = !!m[1];
        const inner = (m[1] ?? m[2]).trim();
        // Split alias (only for non-image)
        let targetStr = inner;
        let alias: string | undefined;
        const pipeIdx = inner.indexOf("|");
        if (pipeIdx !== -1) {
          targetStr = inner.slice(0, pipeIdx).trim();
          alias = inner.slice(pipeIdx + 1).trim();
        }
        const resolved = resolveTarget(targetStr, ctx);
        const exists = ctx.slugs.has(resolved.slug);

        if (isEmbed) {
          // Image embed?
          let alt = alias;
          let width: number | undefined;
          let height: number | undefined;
          if (alias) {
            // alias may be "alt 100x200"
            const dimMatch = alias.match(/(\d+)\s*[x×]\s*(\d+)/);
            if (dimMatch) {
              width = parseInt(dimMatch[1], 10);
              height = parseInt(dimMatch[2], 10);
              alt = alias.replace(dimMatch[0], "").trim() || undefined;
            }
          }
          const isImage = IMAGE_EXT.test(resolved.slug) || IMAGE_EXT.test(targetStr);
          const isVideo = VIDEO_EXT.test(resolved.slug) || VIDEO_EXT.test(targetStr);
          const isAudio = AUDIO_EXT.test(resolved.slug) || AUDIO_EXT.test(targetStr);
          const isPdf = PDF_EXT.test(resolved.slug) || PDF_EXT.test(targetStr);
          const isMedia = isImage || isVideo || isAudio || isPdf;
          const target: WikiLinkTarget = {
            original: targetStr,
            slug: resolved.slug,
            heading: resolved.heading,
            block: resolved.block,
            alias,
            exists,
          };
          if (!isMedia) links.push(target); // record note-embed as a link
          segments.push({
            type: "embed",
            target,
            raw: targetStr,
            isImage,
            isVideo,
            isAudio,
            isPdf,
            alt,
            width,
            height,
          } as EmbedNode);
        } else {
          const target: WikiLinkTarget = {
            original: targetStr,
            slug: resolved.slug,
            heading: resolved.heading,
            block: resolved.block,
            alias,
            exists,
          };
          links.push(target);
          const display =
            alias ||
            (ctx.noteMeta.get(resolved.slug)?.title ?? targetStr);
          segments.push({
            type: "wikiLink",
            target,
            display,
          } as WikiLinkNode);
        }
        last = m.index + m[0].length;
      }
      if (segments.length === 0) return;
      if (last < value.length) {
        segments.push({ type: "text", value: value.slice(last) });
      }
      if (parent && index !== null) {
        parent.children.splice(index, 1, ...segments);
      }
    });
  };
}

/** Remark plugin: parse ==highlights== and %%comments%%. */
export function remarkHighlightsAndComments() {
  return (tree: Root) => {
    visit(tree, "text", (node, index, parent) => {
      const value = (node as Text).value;
      if (!value.includes("==") && !value.includes("%%")) return;
      const segments: RootContent[] = [];
      // Tokenize: %%comment%%, ==highlight==, plain text
      const regex = /%%([^%]*)%%|==([^=]+)==/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(value)) !== null) {
        if (m.index > last) {
          segments.push({ type: "text", value: value.slice(last, m.index) });
        }
        if (m[1] !== undefined) {
          // comment — drop entirely
        } else if (m[2] !== undefined) {
          segments.push({
            type: "highlight",
            children: [{ type: "text", value: m[2] }],
          } as HighlightNode);
        }
        last = m.index + m[0].length;
      }
      if (segments.length === 0) return;
      if (last < value.length) {
        segments.push({ type: "text", value: value.slice(last) });
      }
      if (parent && index !== null) {
        parent.children.splice(index, 1, ...segments);
      }
    });
  };
}

/** Remark plugin: parse inline #tags. Records tags into the array. */
export function remarkInlineTags(tags: string[]) {
  return (tree: Root) => {
    visit(tree, "text", (node, index, parent) => {
      const value = (node as Text).value;
      // Match #tag not at line start (avoid headings) — preceded by start/space/paren
      const regex = /(^|[\s(])#([\w][\w/-]*)/g;
      const segments: RootContent[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(value)) !== null) {
        const pre = m[1];
        const tag = m[2];
        // Skip pure-numeric tags
        if (/^\d+$/.test(tag)) continue;
        if (m.index + pre.length > last) {
          segments.push({
            type: "text",
            value: value.slice(last, m.index + pre.length),
          });
        }
        tags.push(tag);
        segments.push({ type: "tagLink", tag } as TagNode);
        last = m.index + pre.length + 1 + tag.length;
      }
      if (segments.length === 0) return;
      if (last < value.length) {
        segments.push({ type: "text", value: value.slice(last) });
      }
      if (parent && index !== null) {
        parent.children.splice(index, 1, ...segments);
      }
    });
  };
}

/** Remark plugin: convert bare URLs into link preview nodes or media embeds. */
export function remarkUrlPreviews() {
  return (tree: Root) => {
    // Track URLs we've already converted to avoid duplicates
    const seenUrls = new Set<string>();

    // First, remove any autolink <a> nodes created by GFM that point to
    // external URLs — we'll replace them with our own linkPreview nodes.
    visit(tree, "link", (node: any, index, parent) => {
      if (!parent || index === null) return;
      const url = node.url as string;
      if (!url || !/^https?:\/\//i.test(url)) return;
      // Check if this is an autolink (no text children, or text == url)
      const text = (node.children || [])
        .map((c: any) => (c.type === "text" ? c.value : ""))
        .join("");
      if (!text || text === url) {
        // Skip if already seen (deduplicate)
        if (seenUrls.has(url)) {
          parent.children.splice(index, 1);
          return;
        }
        seenUrls.add(url);

        const embedUrl = getEmbedUrl(url);
        if (embedUrl) {
          parent.children[index] = {
            type: "linkPreview",
            url,
            embedUrl,
          } as any;
        } else if (AUDIO_EXT.test(url)) {
          parent.children[index] = {
            type: "embed",
            target: { original: url, slug: url, exists: true },
            raw: url,
            isImage: false,
            isVideo: false,
            isAudio: true,
            isPdf: false,
            alt: undefined,
          } as any;
        } else if (VIDEO_EXT.test(url)) {
          parent.children[index] = {
            type: "embed",
            target: { original: url, slug: url, exists: true },
            raw: url,
            isImage: false,
            isVideo: true,
            isAudio: false,
            isPdf: false,
            alt: undefined,
          } as any;
        } else if (PDF_EXT.test(url)) {
          parent.children[index] = {
            type: "embed",
            target: { original: url, slug: url, exists: true },
            raw: url,
            isImage: false,
            isVideo: false,
            isAudio: false,
            isPdf: true,
            alt: undefined,
          } as any;
        } else if (IMAGE_EXT.test(url)) {
          parent.children[index] = {
            type: "embed",
            target: { original: url, slug: url, exists: true },
            raw: url,
            isImage: true,
            isVideo: false,
            isAudio: false,
            isPdf: false,
            alt: undefined,
          } as any;
        } else {
          parent.children[index] = {
            type: "linkPreview",
            url,
          } as any;
        }
      }
    });
    // Then, process text nodes for bare URLs — but skip text that's already
    // inside a link node, and skip URLs we've already converted
    visit(tree, "text", (node, index, parent) => {
      if (parent && (parent as any).type === "link") return;
      const value = (node as Text).value;
      // Match bare URLs not preceded by [ or (
      const regex = /(?<![\[(])https?:\/\/[^\s<>\])"',)]+/gi;
      const segments: RootContent[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(value)) !== null) {
        if (m.index > last) {
          segments.push({ type: "text", value: value.slice(last, m.index) });
        }
        let url = m[0].replace(/[.,;!?)]+$/, "");
        // Check if this URL is inside a markdown link [text](url) — if so, skip
        const beforeText = value.slice(Math.max(0, m.index - 5), m.index);
        if (/\]\($/.test(beforeText)) {
          segments.push({ type: "text", value: m[0] });
          last = m.index + m[0].length;
          continue;
        }
        // Check if the URL is a known embeddable platform (YouTube, Vimeo, etc.)
        const embedUrl = getEmbedUrl(url);
        // Skip if already converted (deduplicate)
        if (seenUrls.has(url)) {
          last = m.index + m[0].length;
          continue;
        }
        seenUrls.add(url);
        if (embedUrl) {
          segments.push({
            type: "linkPreview",
            url,
            embedUrl,
          } as any);
        } else if (AUDIO_EXT.test(url)) {
          segments.push({
            type: "embed",
            target: { original: url, slug: url, exists: true },
            raw: url,
            isImage: false,
            isVideo: false,
            isAudio: true,
            isPdf: false,
            alt: undefined,
          } as any);
        } else if (VIDEO_EXT.test(url)) {
          segments.push({
            type: "embed",
            target: { original: url, slug: url, exists: true },
            raw: url,
            isImage: false,
            isVideo: true,
            isAudio: false,
            isPdf: false,
            alt: undefined,
          } as any);
        } else if (PDF_EXT.test(url)) {
          segments.push({
            type: "embed",
            target: { original: url, slug: url, exists: true },
            raw: url,
            isImage: false,
            isVideo: false,
            isAudio: false,
            isPdf: true,
            alt: undefined,
          } as any);
        } else if (IMAGE_EXT.test(url)) {
          segments.push({
            type: "embed",
            target: { original: url, slug: url, exists: true },
            raw: url,
            isImage: true,
            isVideo: false,
            isAudio: false,
            isPdf: false,
            alt: undefined,
          } as any);
        } else {
          segments.push({
            type: "linkPreview",
            url,
          } as any);
        }
        last = m.index + m[0].length;
      }
      if (segments.length === 0) return;
      if (last < value.length) {
        segments.push({ type: "text", value: value.slice(last) });
      }
      if (parent && index !== null) {
        parent.children.splice(index, 1, ...segments);
      }
    });
  };
}

// ----------------------------------------------------------------------------
// remark-rehype custom handlers (for our custom mdast node types)
// ----------------------------------------------------------------------------

export const handlers = {
  wikiLink(_h: any, node: WikiLinkNode) {
    const t = node.target;
    let href = `/?p=${encodeURIComponent(t.slug)}`;
    if (t.heading) href += `#${encodeURIComponent(slugify(t.heading))}`;
    if (t.block) href += `#^${t.block}`;
    const className = t.exists
      ? ["internal-link"]
      : ["internal-link", "broken"];
    const properties: Record<string, unknown> = {
      className,
      href,
      title: t.alias || undefined,
      dataSlug: t.slug,
    };
    if (!t.exists) properties.dataBroken = "true";
    return {
      type: "element",
      tagName: "a",
      properties,
      children: [{ type: "text", value: node.display }],
    };
  },
  embed(_h: any, node: EmbedNode) {
    const src = resolveAssetUrl(node.raw);
    if (node.isImage) {
      const properties: Record<string, unknown> = {
        src,
        alt: node.alt || node.target.original,
        loading: "lazy",
      };
      if (node.width) properties.width = node.width;
      if (node.height) properties.height = node.height;
      return { type: "element", tagName: "img", properties, children: [] };
    }
    if (node.isVideo) {
      return {
        type: "element",
        tagName: "video",
        properties: {
          src,
          controls: true,
          className: ["media-embed", "video-embed"],
          preload: "metadata",
        },
        children: [],
      };
    }
    if (node.isAudio) {
      return {
        type: "element",
        tagName: "audio",
        properties: {
          src,
          controls: true,
          className: ["media-embed", "audio-embed"],
          preload: "metadata",
        },
        children: [],
      };
    }
    if (node.isPdf) {
      const filename = (node.alt || node.target.original || src).split("/").pop() || "document.pdf";
      const pdfIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`;
      const extIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
      return {
        type: "element",
        tagName: "div",
        properties: { className: ["pdf-embed-wrapper"] },
        children: [
          {
            type: "raw",
            value: `<div class="pdf-embed-header"><span class="pdf-embed-icon">${pdfIconSvg}</span><span class="pdf-embed-filename">${filename}</span><a class="pdf-embed-open" href="${src}" target="_blank" rel="noopener noreferrer">Open ${extIconSvg}</a></div>`,
          } as any,
          {
            type: "element",
            tagName: "iframe",
            properties: {
              src,
              className: ["pdf-embed"],
              title: node.alt || node.target.original,
            },
            children: [],
          },
          {
            type: "raw",
            value: `<a class="pdf-float-open" href="${src}" target="_blank" rel="noopener noreferrer">${extIconSvg} Open PDF</a>`,
          } as any,
        ],
      };
    }
    // True transclusion: if we have the target's pre-rendered body, inline it.
    const bodies = _ctx?.noteBodies;
    if (bodies && node.target.exists) {
      const fullBody = bodies.get(node.target.slug);
      if (fullBody) {
        let bodyToInline = fullBody;
        let sectionLabel = "";
        let anchor = "";
        // Section transclusion: extract content under a specific heading.
        if (node.target.heading) {
          const headingId = slugify(node.target.heading);
          const section = extractSection(fullBody, headingId);
          if (section) {
            bodyToInline = section.html;
            sectionLabel = ` § ${escapeHtmlEntities(node.target.heading)}`;
            anchor = `#${headingId}`;
          } else {
            sectionLabel = ` § ${escapeHtmlEntities(node.target.heading)} (not found)`;
          }
        }
        // Block transclusion: extract a specific block by ^blockid.
        if (node.target.block) {
          const block = extractBlock(fullBody, node.target.block);
          if (block) {
            bodyToInline = block;
            sectionLabel = ` ^${escapeHtmlEntities(node.target.block)}`;
            anchor = `#^${node.target.block}`;
          } else {
            sectionLabel = ` ^${escapeHtmlEntities(node.target.block)} (not found)`;
          }
        }
        const meta = ctx_noteMeta(node);
        const headerTitle =
          (meta?.title ?? node.target.original) + sectionLabel;
        const header = `<div class="transclusion-header"><span class="transclusion-icon">⌖</span><a class="transclusion-link" href="/?p=${encodeURIComponent(node.target.slug)}${anchor}">${escapeHtmlEntities(headerTitle)}</a></div>`;
        return {
          type: "raw",
          value: `<div class="transclusion">${header}<div class="transclusion-body">${bodyToInline}</div></div>`,
        } as any;
      }
    }
    // Fallback: link card (used in pass 1, or when the body isn't available)
    const meta = node.target.exists ? ctx_noteMeta(node) : undefined;
    const href = `/?p=${encodeURIComponent(node.target.slug)}`;
    const cardChildren: ElementContent[] = [
      {
        type: "element",
        tagName: "span",
        properties: { className: ["embed-icon"] },
        children: [{ type: "text", value: "↗" }],
      },
      {
        type: "element",
        tagName: "span",
        properties: { className: ["embed-title"] },
        children: [
          { type: "text", value: meta?.title ?? node.target.original },
        ],
      },
    ];
    if (meta?.description) {
      cardChildren.push({
        type: "element",
        tagName: "span",
        properties: { className: ["embed-desc"] },
        children: [{ type: "text", value: meta.description }],
      });
    }
    return {
      type: "element",
      tagName: "a",
      properties: {
        className: ["embed-card", node.target.exists ? "" : "broken"].filter(
          Boolean
        ),
        href,
        dataSlug: node.target.slug,
      },
      children: cardChildren,
    };
  },
  highlight(_h: any, node: HighlightNode) {
    return {
      type: "element",
      tagName: "mark",
      properties: { className: ["text-highlight"] },
      children: node.children.map((c) => ({ type: "text", value: c.value })),
    };
  },
  tagLink(_h: any, node: TagNode) {
    return {
      type: "element",
      tagName: "a",
      properties: { className: ["tag-link"], href: `/?tag=${encodeURIComponent(node.tag)}` },
      children: [{ type: "text", value: `#${node.tag}` }],
    };
  },
  linkPreview(_h: any, node: { url: string; embedUrl?: string }) {
    const url = node.url;
    // If this is an embeddable platform (YouTube, Vimeo, etc.), render iframe
    if (node.embedUrl) {
      const isSoundCloud = node.embedUrl.includes("w.soundcloud.com");
      const isSpotify = node.embedUrl.includes("open.spotify.com");
      const height = isSoundCloud ? "166px" : isSpotify ? "152px" : "400px";
      return {
        type: "raw",
        value: `<div class="media-embed-wrapper"><iframe src="${escapeHtmlEntities(node.embedUrl)}" class="media-embed platform-embed" style="width:100%;height:${height};border:none;border-radius:12px;margin:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" title="${escapeHtmlEntities(url)}"></iframe></div>`,
      } as any;
    }
    const preview = _ctx?.urlPreviews?.get(url);
    if (preview && preview.title) {
      // Build the card as an HTML string (raw node) to avoid rehype-raw
      // duplicating hast elements.
      let imgHtml = "";
      if (preview.image) {
        imgHtml = `<img src="${escapeHtmlEntities(preview.image)}" alt="" class="url-preview-img" loading="lazy">`;
      }
      let descHtml = "";
      if (preview.description) {
        const desc = preview.description.slice(0, 150) + (preview.description.length > 150 ? "…" : "");
        descHtml = `<span class="url-preview-desc">${escapeHtmlEntities(desc)}</span>`;
      }
      const siteName = preview.siteName || url.replace(/^https?:\/\//, "").split("/")[0];
      const html = `<a class="url-preview-card" href="${escapeHtmlEntities(url)}" target="_blank" rel="noopener noreferrer">${imgHtml}<span class="url-preview-text"><span class="url-preview-title">${escapeHtmlEntities(preview.title)}</span>${descHtml}<span class="url-preview-url">${escapeHtmlEntities(siteName)}</span></span></a>`;
      return { type: "raw", value: html } as any;
    }
    // No preview available — just a plain link
    return {
      type: "raw",
      value: `<a href="${escapeHtmlEntities(url)}" target="_blank" rel="noopener noreferrer" class="external-link">${escapeHtmlEntities(url)}</a>`,
    } as any;
  },
};

// Tiny helpers so handlers can read the context via closure created in render().
let _ctx: RenderContext | null = null;
function ctx_assetBase(_node: EmbedNode) {
  return _ctx?.assetBase ?? "";
}
function ctx_noteMeta(_node: EmbedNode) {
  return _ctx?.noteMeta.get(_node.target.slug);
}
function resolveAssetUrl(rawUrl: string): string {
  const isExternalUrl = /^https?:\/\//i.test(rawUrl);
  if (isExternalUrl) return rawUrl;
  const decoded = decodeURIComponent(rawUrl);
  const rawName = decoded.replace(/[\\/]/g, "-");
  const assetName = _ctx?.assetNames?.get(decoded.toLowerCase())
    ?? _ctx?.assetNames?.get(rawName.toLowerCase())
    ?? rawName;
  const assetBase = _ctx?.assetBase ?? "";
  const encodedName = assetName.split("/").map(encodeURIComponent).join("/");
  return `${assetBase}/content-assets/${encodedName}`;
}

function escapeHtmlEntities(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Extract the HTML content under a specific heading (by its id) from a
 * pre-rendered note body. Returns the heading element + all sibling content
 * up to (but not including) the next heading of the same or higher level.
 * Returns null if the heading id isn't found.
 */
function extractSection(html: string, headingId: string): { html: string } | null {
  // Match the heading element with the given id. Capture its level.
  // Headings are <h1 id="..."> ... </h2> etc. — we match opening tag to get level.
  const headingRegex = /<h([1-6])\s+id="([^"]+)"[^>]*>/gi;
  let startMatch: RegExpExecArray | null = null;
  let startLevel = 1;
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(html)) !== null) {
    if (m[2] === headingId) {
      startMatch = m;
      startLevel = parseInt(m[1], 10);
      break;
    }
  }
  if (!startMatch) return null;
  const startIdx = startMatch.index;
  // Find the next heading of the same or higher level (lower or equal number)
  const afterStart = html.slice(startIdx + startMatch[0].length);
  const nextHeadingRegex = new RegExp(
    `<h([1-${startLevel}])\\b`,
    "i"
  );
  const nextMatch = afterStart.match(nextHeadingRegex);
  let endIdx: number;
  if (nextMatch && nextMatch.index !== undefined) {
    endIdx = startIdx + startMatch[0].length + nextMatch.index;
  } else {
    endIdx = html.length;
  }
  return { html: html.slice(startIdx, endIdx).trim() };
}

/**
 * Extract a block of content marked with `^blockid` from pre-rendered HTML.
 * In Obsidian, a block is a paragraph/list item/etc. that ends with `^blockid`.
 * In the rendered HTML, the `^blockid` appears as text at the end of a block
 * element (typically `<p>`, `<li>`, `<blockquote>`, etc.).
 * We find the block-level element containing the `^blockid` text and return it.
 * Returns null if the blockid isn't found.
 */
function extractBlock(html: string, blockId: string): string | null {
  const escaped = blockId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Find ^blockid in the HTML text
  const regex = new RegExp(`\\^${escaped}`, "i");
  const match = regex.exec(html);
  if (!match) return null;
  const matchIdx = match.index;
  // Walk back to find the nearest block-level opening tag: <p>, <li>,
  // <blockquote>, <pre>, <div>, <h1>-<h6>, <table>, <tr>, <td>, <th>
  const blockTags = ["p", "li", "blockquote", "pre", "div", "h1", "h2", "h3", "h4", "h5", "h6", "td", "th", "dt", "dd"];
  const blockTagPattern = blockTags.join("|");
  const openRegex = new RegExp(`<(${blockTagPattern})\\b[^>]*>`, "gi");
  let lastOpen: { idx: number; tag: string; len: number } | null = null;
  let m: RegExpExecArray | null;
  const before = html.slice(0, matchIdx);
  while ((m = openRegex.exec(before)) !== null) {
    lastOpen = { idx: m.index, tag: m[1], len: m[0].length };
  }
  if (!lastOpen) return null;
  // Find the closing tag for this block element
  const closeTag = `</${lastOpen.tag}>`;
  const closeIdx = html.indexOf(closeTag, matchIdx);
  if (closeIdx === -1) return null;
  const blockHtml = html.slice(
    lastOpen.idx,
    closeIdx + closeTag.length
  );
  // Strip the ^blockid text from the output for clean display
  return blockHtml.replace(new RegExp(`\\s*\\^${escaped}\\s*`, "i"), "");
}

// ----------------------------------------------------------------------------
// Rehype plugin: Shiki syntax highlighting + mermaid passthrough
// ----------------------------------------------------------------------------

let _highlighterPromise: Promise<ReturnType<typeof createHighlighter>> | null =
  null;

const SHIKI_LANGS = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "python",
  "bash",
  "sh",
  "shell",
  "json",
  "yaml",
  "html",
  "css",
  "scss",
  "markdown",
  "md",
  "sql",
  "rust",
  "go",
  "java",
  "c",
  "cpp",
  "csharp",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "scala",
  "lua",
  "diff",
  "dockerfile",
  "toml",
  "ini",
  "xml",
  "vue",
  "svelte",
];

async function getHighlighter() {
  if (!_highlighterPromise) {
    _highlighterPromise = createHighlighter({
      themes: ["tokyo-night"],
      langs: SHIKI_LANGS,
    });
  }
  return _highlighterPromise;
}

export function rehypeShiki() {
  return async (tree: HastRoot) => {
    const highlighter = await getHighlighter();
    const loadedLangs = highlighter.getLoadedLanguages();
    const replacements: { index: number; parent: Element; node: Element }[] =
      [];
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === null) return;
      const codeEl = node.children?.find(
        (c): c is Element => c.type === "element" && c.tagName === "code"
      );
      if (!codeEl) return;
      const cls = (codeEl.properties?.className as string[] | undefined) ?? [];
      const langClass = cls.find((c) => c.startsWith("language-"));
      const lang = langClass ? langClass.replace("language-", "") : "";
      const rawText = (codeEl.children || [])
        .map((c) => (c.type === "text" ? c.value : ""))
        .join("");

      // Mermaid → passthrough div (rendered client-side)
      if (lang === "mermaid") {
        const div: Element = {
          type: "element",
          tagName: "div",
          properties: { className: ["mermaid"] },
          children: [{ type: "text", value: rawText }],
        };
        replacements.push({ index, parent, node: div });
        return;
      }

      // Obsidian Ink code blocks — skip Shiki, leave for rehypeObsidianInk
      if (lang === "handdrawn-ink" || lang === "handwritten-ink") {
        return;
      }

      // Contribution Graph code blocks — skip Shiki, leave for rehypeContributionGraph
      if (lang === "contributionGraph") {
        return;
      }

      const useLang =
        lang && loadedLangs.includes(lang) ? lang : null;
      let preEl: Element;
      if (!useLang) {
        preEl = {
          type: "element",
          tagName: "pre",
          properties: { className: ["shiki", "no-lang"] },
          children: [
            {
              type: "element",
              tagName: "code",
              properties: {},
              children: [{ type: "text", value: rawText }],
            },
          ],
        };
      } else {
        try {
          const hast = highlighter.codeToHast(rawText, {
            lang: useLang,
            theme: "tokyo-night",
          });
          const pre = hast.children.find(
            (c): c is Element => c.type === "element" && c.tagName === "pre"
          );
          preEl = pre ?? {
            type: "element",
            tagName: "pre",
            properties: { className: ["shiki"] },
            children: [
              {
                type: "element",
                tagName: "code",
                properties: {},
                children: [{ type: "text", value: rawText }],
              },
            ],
          };
          // Preserve the language class on the <code> element so the
          // CodeBlockRunner can detect which language to run.
          if (preEl.children) {
            const codeChild = preEl.children.find(
              (c): c is Element =>
                c.type === "element" && c.tagName === "code"
            );
            if (codeChild) {
              const existingCls = (codeChild.properties?.className as string[] | undefined) ?? [];
              codeChild.properties = codeChild.properties ?? {};
              codeChild.properties.className = [...existingCls, `language-${useLang}`];
            }
          }
        } catch {
          preEl = {
            type: "element",
            tagName: "pre",
            properties: { className: ["shiki"] },
            children: [
              {
                type: "element",
                tagName: "code",
                properties: {},
                children: [{ type: "text", value: rawText }],
              },
            ],
          };
        }
      }
      replacements.push({ index, parent, node: preEl });
    });
    for (const r of replacements) {
      r.parent.children[r.index] = r.node;
    }
  };
}

// ----------------------------------------------------------------------------
// Rehype plugin: Obsidian callouts (blockquote → callout div)
// ----------------------------------------------------------------------------

const CALLOUT_TYPES = new Set([
  "note",
  "abstract",
  "summary",
  "tldr",
  "info",
  "todo",
  "tip",
  "hint",
  "important",
  "success",
  "check",
  "done",
  "question",
  "help",
  "faq",
  "warning",
  "attention",
  "caution",
  "failure",
  "missing",
  "fail",
  "danger",
  "error",
  "bug",
  "example",
  "quote",
  "cite",
]);

const CALLOUT_ICONS: Record<string, string> = {
  note: "ℹ",
  abstract: "📋",
  info: "ℹ",
  todo: "✔",
  tip: "💡",
  success: "✓",
  question: "❓",
  warning: "⚠",
  failure: "✕",
  danger: "⚡",
  bug: "🐛",
  example: "📖",
  quote: "“",
};

export function rehypeCallouts() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "blockquote") return;
      const firstChild = node.children?.find(
        (c): c is Element => c.type === "element" && c.tagName === "p"
      );
      if (!firstChild) return;
      const firstText = firstChild.children?.[0];
      if (!firstText || firstText.type !== "text") return;
      const m = firstText.value.match(
        /^\s*\[!([a-zA-Z]+)\]([+-]?)(?:\s+(.*))?/
      );
      if (!m) return;
      let [, rawType, fold, title] = m;
      const type = rawType.toLowerCase();
      if (!CALLOUT_TYPES.has(type)) return;

      const collapsible = fold === "+" || fold === "-";
      const collapsed = fold === "-";

      // Remove the callout marker from the first paragraph
      const consumed = m[0];
      firstText.value = firstText.value.slice(consumed.length);
      // If a title was on the marker line, push it as a leading <strong>
      // Title (if any) is shown only in the title bar — not duplicated in body.
      // If the first paragraph is now empty, drop it
      const isEmpty = firstChild.children?.every(
        (c) => c.type === "text" && c.value.trim() === ""
      );
      if (isEmpty) {
        const idx = node.children!.indexOf(firstChild);
        if (idx !== -1) node.children!.splice(idx, 1);
      }

      const icon = CALLOUT_ICONS[type] ?? CALLOUT_ICONS.note;
      const titleEl: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["callout-title"] },
        children: [
          {
            type: "element",
            tagName: "span",
            properties: { className: ["callout-title-icon"] },
            children: [{ type: "text", value: icon }],
          },
          {
            type: "element",
            tagName: "span",
            properties: { className: ["callout-title-text"] },
            children: [
              {
                type: "text",
                value: title || capitalize(type),
              },
            ],
          },
          collapsible
            ? ({
                type: "element",
                tagName: "span",
                properties: { className: ["callout-fold-icon"] },
                children: [{ type: "text", value: "▾" }],
              } as ElementContent)
            : (null as unknown as ElementContent),
        ].filter(Boolean) as ElementContent[],
      };

      const contentEl: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["callout-content"] },
        children: node.children ?? [],
      };

      const calloutClasses = ["callout"];
      if (collapsible) calloutClasses.push("collapsible");
      if (collapsed) calloutClasses.push("is-collapsed");

      const callout: Element = {
        type: "element",
        tagName: "div",
        properties: {
          className: calloutClasses,
          dataCallout: type,
        },
        children: [titleEl, contentEl],
      };

      if (parent && index !== null) {
        parent.children[index] = callout;
      }
    });
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ----------------------------------------------------------------------------
// Rehype plugin: Obsidian Ink (handdrawn-ink / handwritten-ink code blocks)
// ----------------------------------------------------------------------------

/**
 * Processes ` ```handdrawn-ink ` and ` ```handwritten-ink ` code blocks from
 * the Obsidian Ink plugin. Each code block contains JSON with a `filepath`
 * pointing to a `.drawing` or `.writing` file in the vault. The file contains
 * a tldraw snapshot with a `previewUri` (base64 PNG). We read the file,
 * extract the previewUri, and replace the code block with an `<img>`.
 *
 * If the file can't be read or has no previewUri, shows a placeholder.
 */
export function rehypeObsidianInk() {
  return async (tree: HastRoot) => {
    const vaultPath = _ctx?.vaultPath;
    const replacements: Array<{
      index: number;
      parent: Element;
      node: Element;
      langClass: string;
    }> = [];
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === null) return;
      const codeEl = node.children?.find(
        (c): c is Element => c.type === "element" && c.tagName === "code"
      );
      if (!codeEl) return;
      const cls = (codeEl.properties?.className as string[] | undefined) ?? [];
      const langClass = cls.find(
        (c) =>
          c === "language-handdrawn-ink" || c === "language-handwritten-ink"
      );
      if (!langClass) return;
      replacements.push({ index, parent, node, langClass });
    });
    for (const r of replacements) {
      const codeEl = r.node.children?.find(
        (c): c is Element => c.type === "element" && c.tagName === "code"
      );
      if (!codeEl) continue;
      const jsonText = (codeEl.children || [])
        .map((c) => (c.type === "text" ? c.value : ""))
        .join("");
      let filepath: string | undefined;
      let width: number | undefined;
      try {
        const parsed = JSON.parse(jsonText);
        filepath = parsed.filepath;
        width = parsed.width;
      } catch {
        /* ignore */
      }
      let imgSrc: string | null = null;
      if (filepath && vaultPath) {
        try {
          const fullPath = join(vaultPath, filepath);
          const fileContent = readFileSync(fullPath, "utf8");
          const inkData = JSON.parse(fileContent);
          if (inkData.previewUri) {
            imgSrc = inkData.previewUri;
          }
        } catch {
          /* file not found or invalid */
        }
      }
      const isDrawing = r.langClass.includes("draw");
      const replacement: Element = imgSrc
        ? {
            type: "element",
            tagName: "img",
            properties: {
              src: imgSrc,
              alt: isDrawing ? "Ink drawing" : "Handwritten ink",
              className: ["ink-embed"],
              loading: "lazy",
              style: width ? `max-width:${width}px` : undefined,
            },
            children: [],
          }
        : {
            type: "element",
            tagName: "div",
            properties: {
              className: ["ink-placeholder"],
            },
            children: [
              {
                type: "text",
                value: isDrawing
                  ? "✎ Ink drawing (preview unavailable)"
                  : "✎ Handwritten note (preview unavailable)",
              },
            ],
          };
      r.parent.children[r.index] = replacement;
    }
  };
}

// ----------------------------------------------------------------------------
// Rehype plugin: Strip Obsidian Ink edit links & style ink SVG images
// ----------------------------------------------------------------------------

/**
 * The Obsidian Ink plugin embeds handwriting/drawing as:
 *   ![InkWriting](<path.svg>) [Edit Writing](url?type=inkWriting&...)
 *   ![InkDrawing](<path.svg>) [Edit Drawing](url?type=inkDrawing&...)
 *
 * The "Edit Writing"/"Edit Drawing" links only work inside Obsidian, so we
 * strip them from the published output. We also add the `ink-embed` class
 * to img elements whose alt text is "InkWriting" or "InkDrawing" for styling.
 */
export function rehypeStripInkEditLinks() {
  return (tree: HastRoot) => {
    // Pass 1: Mark ink images with proper class
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "img") return;
      const alt = (node.properties?.alt as string) || "";
      if (alt === "InkWriting" || alt === "InkDrawing") {
        const existing = (node.properties?.className as string[] | undefined) ?? [];
        node.properties = node.properties ?? {};
        node.properties.className = [...existing, "ink-embed"];
        // Set a more descriptive alt text
        node.properties.alt = alt === "InkDrawing" ? "Ink drawing" : "Handwritten ink";
      }
    });

    // Pass 2: Remove "Edit Writing" / "Edit Drawing" links whose href
    // contains type=inkWriting or type=inkDrawing
    visit(tree, "element", (node: Element) => {
      if (!node.children) return;
      node.children = node.children.filter((child) => {
        if (child.type !== "element" || (child as Element).tagName !== "a") return true;
        const el = child as Element;
        const href = (el.properties?.href as string) || "";
        if (!href.includes("type=inkWriting") && !href.includes("type=inkDrawing")) return true;
        // Also check the link text
        const text = (el.children || [])
          .map((c) => (c.type === "text" ? (c as any).value : ""))
          .join("")
          .trim();
        if (text === "Edit Writing" || text === "Edit Drawing") return false;
        return true;
      });
    });
  };
}

// ----------------------------------------------------------------------------
// Rehype plugin: Contribution Graph (obsidian-contribution-graph plugin)
// ----------------------------------------------------------------------------

/**
 * Processes ` ```contributionGraph ` code blocks from the Obsidian Contribution
 * Graph plugin. The code block contains YAML config. Since we can't run
 * Dataview queries on the website, we support two modes:
 * 1. Explicit `data` array in the YAML: [{date, value, summary}, ...]
 * 2. No data: generate a sample heatmap from the config (title, days, colors)
 *
 * Renders a GitHub-style heatmap grid of colored squares.
 */

/**
 * Rehype plugin: Fix broken images.
 * When markdown `![alt](url)` is used with a non-image URL (like a YouTube
 * link or a webpage), the result is a broken <img> tag. This plugin:
 * 1. Checks if the <img> src is actually an image (by extension)
 * 2. If NOT an image, checks if it's an embeddable platform → iframe
 * 3. If NOT embeddable, converts to a link preview card with the alt text
 */
export function rehypeFixBrokenImages() {
  return (tree: HastRoot) => {
    const replacements: Array<{
      index: number;
      parent: Element;
      node: Element;
      grandParent: Element | HastRoot | null;
      parentIndex: number | null;
    }> = [];
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "img" || !parent || index === null) return;
      const src = node.properties?.src as string | undefined;
      if (!src || typeof src !== "string") return;
      // Skip if it's a data URI (ink drawings, etc.)
      if (src.startsWith("data:")) return;
      // Skip if it's a local path (starts with /)
      if (src.startsWith("/")) return;

      // If it's a relative path to a local image (not external), resolve it
      const isExternalUrl = /^https?:\/\//i.test(src);
      if (!isExternalUrl && IMAGE_EXT.test(src)) {
        node.properties.src = resolveAssetUrl(src);
        return;
      }

      // Check if it's actually an image URL
      if (IMAGE_EXT.test(src)) return;
      // It's a broken image — check for embed or link preview
      // We need to also find the grandparent to be able to hoist a block element out of <p>
      replacements.push({ index, parent: parent as Element, node, grandParent: null, parentIndex: null });
    });
    // Second pass: find grandparents for any parent <p> nodes
    visit(tree, "element", (node: Element, index, parent) => {
      for (const r of replacements) {
        if (r.parent === node && node.tagName === "p" && index !== null && parent) {
          r.grandParent = parent as Element;
          r.parentIndex = index;
        }
      }
    });
    for (const r of replacements) {
      const src = r.node.properties?.src as string;
      const alt = (r.node.properties?.alt as string) || src;
      const embedUrl = getEmbedUrl(src);
      if (embedUrl) {
        // Render as iframe embed
        const isSoundCloud = embedUrl.includes("w.soundcloud.com");
        const isSpotify = embedUrl.includes("open.spotify.com");
        const isGoogle = embedUrl.includes("google.com");
        const height = isSoundCloud
          ? "166px"
          : isSpotify
            ? "152px"
            : isGoogle
              ? "480px"
              : "400px";
        r.parent.children[r.index] = {
          type: "element",
          tagName: "div",
          properties: { className: ["media-embed-wrapper"] },
          children: [
            {
              type: "element",
              tagName: "iframe",
              properties: {
                src: embedUrl,
                className: ["media-embed", "platform-embed"],
                style: `width:100%;height:${height};border:none;border-radius:12px;margin:0;`,
                allow:
                  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
                allowFullScreen: true,
                loading: "lazy",
                title: alt,
              },
              children: [],
            },
          ],
        };
      } else if (AUDIO_EXT.test(src)) {
        const resolvedSrc = resolveAssetUrl(src);
        r.parent.children[r.index] = {
          type: "element",
          tagName: "audio",
          properties: {
            src: resolvedSrc,
            controls: true,
            className: ["media-embed", "audio-embed"],
            preload: "metadata",
          },
          children: [],
        };
      } else if (VIDEO_EXT.test(src)) {
        const resolvedSrc = resolveAssetUrl(src);
        r.parent.children[r.index] = {
          type: "element",
          tagName: "video",
          properties: {
            src: resolvedSrc,
            controls: true,
            className: ["media-embed", "video-embed"],
            preload: "metadata",
          },
          children: [],
        };
      } else if (PDF_EXT.test(src)) {
        const resolvedSrc = resolveAssetUrl(src);
        const pdfFilename = alt || src.split("/").pop() || "document.pdf";
        const pdfIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`;
        const extIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
        r.parent.children[r.index] = {
          type: "element",
          tagName: "div",
          properties: { className: ["pdf-embed-wrapper"] },
          children: [
            {
              type: "raw",
              value: `<div class="pdf-embed-header"><span class="pdf-embed-icon">${pdfIconSvg}</span><span class="pdf-embed-filename">${pdfFilename}</span><a class="pdf-embed-open" href="${resolvedSrc}" target="_blank" rel="noopener noreferrer">Open ${extIconSvg}</a></div>`,
            } as any,
            {
              type: "element",
              tagName: "iframe",
              properties: {
                src: resolvedSrc,
                className: ["pdf-embed"],
                title: alt,
              },
              children: [],
            },
            {
              type: "raw",
              value: `<a class="pdf-float-open" href="${resolvedSrc}" target="_blank" rel="noopener noreferrer">${extIconSvg} Open PDF</a>`,
            } as any,
          ],
        };
      } else {
        // Render as a preview card (no iframe — websites block embedding)
        const preview = _ctx?.urlPreviews?.get(src);
        const title = preview?.title || alt;
        const desc = preview?.description || null;
        const img = preview?.image || null;
        const siteName = preview?.siteName || src.replace(/^https?:\/\//, "").split("/")[0];
        const cardChildren: ElementContent[] = [];
        if (img) {
          cardChildren.push({
            type: "element",
            tagName: "img",
            properties: { src: img, alt: "", className: ["url-preview-img"], loading: "lazy" },
            children: [],
          });
        }
        const textChildren: ElementContent[] = [
          { type: "element", tagName: "span", properties: { className: ["url-preview-title"] }, children: [{ type: "text", value: title }] },
        ];
        if (desc) {
          textChildren.push({ type: "element", tagName: "span", properties: { className: ["url-preview-desc"] }, children: [{ type: "text", value: desc.slice(0, 150) + (desc.length > 150 ? "…" : "") }] });
        }
        textChildren.push({ type: "element", tagName: "span", properties: { className: ["url-preview-url"] }, children: [{ type: "text", value: siteName }] });
        cardChildren.push({ type: "element", tagName: "span", properties: { className: ["url-preview-text"] }, children: textChildren });
        const cardNode: Element = {
          type: "element",
          tagName: "a",
          properties: { className: ["url-preview-card"], href: src, target: "_blank", rel: "noopener noreferrer" },
          children: cardChildren,
        };
        // If the parent is a <p> that only contains this image (sole non-whitespace child),
        // replace the <p> itself with the card so the flex block isn't inside a paragraph.
        // A <div>/<a display:flex> inside <p> is invalid HTML and browsers split it visually.
        if (
          r.parent.tagName === "p" &&
          r.parent.children.filter((c) => !(c.type === "text" && /^\s*$/.test((c as { value: string }).value))).length === 1 &&
          r.grandParent !== null &&
          r.parentIndex !== null
        ) {
          (r.grandParent as Element).children[r.parentIndex] = cardNode;
        } else {
          r.parent.children[r.index] = cardNode;
        }
      }
    }
  };
}

export function rehypeContributionGraph() {
  return (tree: HastRoot) => {
    const replacements: Array<{ index: number; parent: Element; node: Element; }> = [];
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === null) return;
      const codeEl = node.children?.find((c): c is Element => c.type === "element" && c.tagName === "code");
      if (!codeEl) return;
      const cls = (codeEl.properties?.className as string[] | undefined) ?? [];
      if (!cls.includes("language-contributionGraph")) return;
      replacements.push({ index, parent, node });
    });
    for (const r of replacements) {
      const codeEl = r.node.children?.find((c): c is Element => c.type === "element" && c.tagName === "code");
      if (!codeEl) continue;
      const yamlText = (codeEl.children || []).map((c) => (c.type === "text" ? c.value : "")).join("");
      const graphHtml = renderContributionGraphYaml(yamlText);
      r.parent.children[r.index] = { type: "raw", value: graphHtml } as any;
    }
  };
}

function renderContributionGraphYaml(yamlText: string): string {
  const config = parseYamlNested(yamlText);
  const title = config.title || "Contributions";
  const startOfWeek = config.startOfWeek ?? 0;
  let days = 140;
  let fromDate: Date;
  let toDate: Date;
  if (config.dateRangeValue) days = parseInt(String(config.dateRangeValue), 10);
  else if (config.days) days = parseInt(String(config.days), 10);
  if (config.fromDate && config.toDate) {
    fromDate = new Date(String(config.fromDate));
    toDate = new Date(String(config.toDate));
  } else {
    toDate = new Date();
    fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
  }
  const cellStyleRules = (Array.isArray(config.cellStyleRules) && config.cellStyleRules.length > 0)
    ? config.cellStyleRules
    : [{ color: "#1a3a2a", min: 1, max: 2 }, { color: "#2d5f3f", min: 2, max: 3 }, { color: "#4a8c5f", min: 3, max: 4 }, { color: "#84a59d", min: 4, max: 999 }];
  // Extract the tag filter from dataSource.value (e.g. "#about" → "about")
  const dataSource = config.dataSource || {};
  const tagFilter = dataSource.value || null;
  // Generate REAL data from actual notes (filtered by tag)
  const data = generateContributionData(fromDate, toDate, tagFilter);
  const weeks: Array<Array<{ date: string; value: number } | null>> = [];
  const current = new Date(fromDate);
  const dayOffset = current.getDay() - (startOfWeek as number);
  current.setDate(current.getDate() - ((dayOffset + 7) % 7));
  while (current <= toDate) {
    const week: Array<{ date: string; value: number } | null> = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().slice(0, 10);
      if (current < fromDate || current > toDate) week.push(null);
      else { const entry = data.find((e) => e.date === dateStr); week.push({ date: dateStr, value: entry?.value || 0 }); }
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  const cellColors = (value: number): string => {
    if (value === 0) return "var(--surface-2)";
    for (const rule of cellStyleRules) { if (value >= rule.min && value < rule.max) return rule.color || "var(--garden)"; }
    return "var(--surface-2)";
  };
  const ts = config.titleStyle || {};
  const showLegend = config.showCellRuleIndicators !== false;
  const monthLabels: string[] = [];
  let lastMonth = -1;
  for (const week of weeks) {
    const firstDay = week.find((d) => d);
    if (firstDay) { const month = new Date(firstDay.date).getMonth(); if (month !== lastMonth) { monthLabels.push(new Date(firstDay.date).toLocaleDateString("en", { month: "short" })); lastMonth = month; } else monthLabels.push(""); } else monthLabels.push("");
  }
  let html = `<div class="contribution-graph">`;
  html += `<div class="contribution-graph-title" style="font-family:var(--font-serif);font-size:${ts.fontSize || "1.1rem"};font-weight:${ts.fontWeight || "600"};color:${ts.color || "var(--heading)"};text-align:${ts.textAlign || "left"};margin-bottom:0.75rem;">${escapeHtmlEntities(title)}</div>`;
  html += `<div class="contribution-graph-scroll" style="overflow-x:auto;padding-bottom:0.5rem;"><div style="display:inline-flex;flex-direction:column;gap:0.25rem;min-width:max-content;">`;
  html += `<div style="display:flex;gap:3px;margin-left:28px;margin-bottom:4px;">`;
  for (const ml of monthLabels) html += `<span style="width:14px;font-size:9px;color:var(--muted-foreground);font-family:var(--font-mono);">${ml}</span>`;
  html += `</div><div style="display:flex;gap:3px;"><div style="display:flex;flex-direction:column;gap:3px;margin-right:4px;">`;
  for (const dl of ["", "Mon", "", "Wed", "", "Fri", ""]) html += `<span style="height:14px;font-size:9px;color:var(--muted-foreground);font-family:var(--font-mono);line-height:14px;text-align:right;width:24px;">${dl}</span>`;
  html += `</div>`;
  for (const week of weeks) {
    html += `<div style="display:flex;flex-direction:column;gap:3px;">`;
    for (const cell of week) {
      if (!cell) html += `<span style="width:14px;height:14px;border-radius:3px;background:transparent;"></span>`;
      else { const color = cellColors(cell.value); const titleAttr = `${cell.value} contribution${cell.value !== 1 ? "s" : ""} on ${cell.date}`; html += `<span style="width:14px;height:14px;border-radius:3px;background:${color};border:1px solid rgba(255,255,255,0.05);cursor:default;" title="${escapeHtmlEntities(titleAttr)}"></span>`; }
    }
    html += `</div>`;
  }
  html += `</div></div></div>`;
  if (showLegend) {
    html += `<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;font-size:10px;color:var(--muted-foreground);font-family:var(--font-mono);"><span>Less</span><span style="width:12px;height:12px;border-radius:3px;background:var(--surface-2);border:1px solid rgba(255,255,255,0.05);"></span>`;
    for (const rule of cellStyleRules) { if (rule.color) html += `<span style="width:12px;height:12px;border-radius:3px;background:${rule.color};border:1px solid rgba(255,255,255,0.05);"></span>`; }
    html += `<span>More</span></div>`;
  }
  html += `</div>`;
  return html;
}

function parseYamlNested(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split("\n");
  let currentKey: string | null = null;
  let currentObj: Record<string, any> | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();
    if (indent === 0) {
      const m = trimmed.match(/^(\w+):\s*(.*)$/);
      if (m) {
        currentKey = m[1]; currentObj = null;
        const val = m[2].trim();
        if (val === "" || val === "{}" || val === "[]") {
          if (val === "{}") result[m[1]] = {}; else if (val === "[]") result[m[1]] = [];
          else { result[m[1]] = {}; currentObj = result[m[1]] as Record<string, any>; }
        } else {
          const cleanVal = val.replace(/^['"]|['"]$/g, "");
          if (cleanVal === "true") result[m[1]] = true; else if (cleanVal === "false") result[m[1]] = false;
          else if (!isNaN(Number(cleanVal))) result[m[1]] = Number(cleanVal); else result[m[1]] = cleanVal;
        }
      }
    } else if (indent > 0 && currentKey) {
      if (trimmed.startsWith("- ")) {
        if (!Array.isArray(result[currentKey])) result[currentKey] = [];
        const itemText = trimmed.slice(2).trim();
        if (itemText.includes(":")) {
          const item: Record<string, any> = {};
          const parts = itemText.split(/,\s*/);
          if (parts.length > 1) { for (const part of parts) { const pm = part.match(/^(\w+):\s*['"]?([^'"]*)['"]?$/); if (pm) item[pm[1]] = isNaN(Number(pm[2])) ? pm[2] : Number(pm[2]); } }
          else { const pm = itemText.match(/^(\w+):\s*['"]?([^'"]*)['"]?$/); if (pm) item[pm[1]] = isNaN(Number(pm[2])) ? pm[2] : Number(pm[2]); }
          (result[currentKey] as any[]).push(item);
        }
      } else if (currentObj !== null) {
        const m = trimmed.match(/^(\w+):\s*(.*)$/);
        if (m) { const val = m[2].trim().replace(/^['"]|['"]$/g, ""); if (val === "true") currentObj[m[1]] = true; else if (val === "false") currentObj[m[1]] = false; else if (val === "{}") currentObj[m[1]] = {}; else if (!isNaN(Number(val))) currentObj[m[1]] = Number(val); else currentObj[m[1]] = val; }
      }
    }
  }
  return result;
}

/**
 * Generate REAL contribution data from actual notes.
 * Filters notes by the tag specified in dataSource.value (e.g. "#about"),
 * groups by publish date, and counts notes per day.
 * If no tag match or no notes data available, returns empty (graph shows
 * only empty cells — which is correct when there are no contributions).
 */
function generateContributionData(
  fromDate: Date,
  toDate: Date,
  tagFilter: string | null
): Array<{ date: string; value: number }> {
  const notes = _ctx?.notesForGraph;
  if (!notes || notes.length === 0) return [];

  // Parse the tag filter: "#about" → "about"
  const tag = tagFilter ? tagFilter.replace(/^#/, "").trim() : null;

  // Filter notes by tag (if specified)
  const filtered = tag
    ? notes.filter((n) => n.tags.includes(tag))
    : notes;

  // Group by date and count
  const counts = new Map<string, number>();
  for (const note of filtered) {
    const dateStr = note.publishDate
      ? new Date(note.publishDate).toISOString().slice(0, 10)
      : new Date(note.createdAt).toISOString().slice(0, 10);
    counts.set(dateStr, (counts.get(dateStr) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([date, value]) => ({ date, value }));
}

// ----------------------------------------------------------------------------

/**
 * Render a single note's markdown body (frontmatter already stripped) to HTML.
 */
export async function renderMarkdown(
  body: string,
  ctx: RenderContext
): Promise<RenderResult> {
  _ctx = ctx;
  const links: WikiLinkTarget[] = [];
  const tags: string[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkObsidianLinks, ctx, links)
    .use(remarkHighlightsAndComments)
    .use(remarkInlineTags, tags)
    .use(remarkUrlPreviews)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      handlers,
    })
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: { className: ["heading-anchor"], ariaHidden: "true" },
      content: { type: "text", value: "#" },
    })
    .use(rehypeShiki)
    .use(rehypeCallouts)
    .use(rehypeObsidianInk)
    .use(rehypeContributionGraph)
    .use(rehypeFixBrokenImages)
    .use(rehypeStripInkEditLinks)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const file = await processor.process(body);
  const html = String(file);

  // Dedupe links by slug
  const seen = new Set<string>();
  const deduped = links.filter((l) => {
    const key = l.slug + (l.heading ?? "") + (l.block ?? "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Word count
  const plainText = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-\[\]!|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = plainText ? plainText.split(" ").length : 0;

  return { html, links: deduped, tags, wordCount };
}

// ----------------------------------------------------------------------------
// Frontmatter
// ----------------------------------------------------------------------------

export interface ParsedNote {
  data: Record<string, unknown>;
  content: string;
  raw: string;
}

export function parseFrontmatter(raw: string): ParsedNote {
  const parsed = matter(raw);
  return {
    data: parsed.data as Record<string, unknown>,
    content: parsed.content,
    raw,
  };
}

/** Coerce frontmatter `tags` field into a string array. */
export function coerceTags(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof value === "string") {
    // could be "a, b, c" or "a b" — split on comma or space
    return value
      .split(/[,\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

export function coerceStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}
