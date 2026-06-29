"use client";

import { useEffect, useRef, useState, useLayoutEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  FileText,
  Hash,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Share2,
  Shuffle,
  Link2,
  Check,
  Printer,
  CornerDownRight,
  Download,
} from "lucide-react";
import type { NoteDetail } from "@/lib/notes";
import { TableOfContents, extractToc } from "./table-of-contents";
import { Backlinks } from "./backlinks";
import { RelatedNotes } from "./related-notes";
import { useRecordVisit } from "./reading-history";
import { CodeBlockRunner } from "./code-block-runner";

interface PreviewData {
  title: string;
  description: string | null;
  tags: string[];
  wordCount: number;
}

/** Strip a leading <h1>…</h1> from rendered HTML (title shown separately). */
function stripLeadingH1(html: string, title: string): string {
  const trimmed = html.trimStart();
  const m = trimmed.match(/^<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return html;
  const innerText = m[1].replace(/<[^>]+>/g, "").trim();
  // Only strip if it matches the title (case-insensitive) or is short
  if (
    innerText.toLowerCase() === title.toLowerCase() ||
    innerText.length < 80
  ) {
    return trimmed.slice(m[0].length).trimStart();
  }
  return html;
}

export function NoteView({ note }: { note: NoteDetail }) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{
    data: PreviewData | null;
    x: number;
    y: number;
  } | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverSlug = useRef<string | null>(null);
  const [copied, setCopied] = useState<"link" | "share" | null>(null);
  const [loadingRandom, setLoadingRandom] = useState(false);

  const html = stripLeadingH1(note.html, note.title);
  const tocItems = useMemo(() => extractToc(note.html), [note.html]);

  // Record this visit in the reading history (localStorage).
  useRecordVisit(note.slug, note.title);

  // --- Note action bar handlers ---
  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}/?p=${encodeURIComponent(note.slug)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied("link");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }, [note.slug]);

  const shareNote = useCallback(async () => {
    const url = `${window.location.origin}/?p=${encodeURIComponent(note.slug)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title,
          text: note.description ?? "",
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setCopied("share");
        setTimeout(() => setCopied(null), 1500);
      } catch {
        /* ignore */
      }
    }
  }, [note.slug, note.title, note.description]);

  const randomNote = useCallback(async () => {
    setLoadingRandom(true);
    try {
      const res = await fetch(`/api/random?except=${encodeURIComponent(note.slug)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.slug) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        router.push(`/?p=${encodeURIComponent(data.slug)}`);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingRandom(false);
    }
  }, [note.slug, router]);

  const printNote = useCallback(() => {
    window.print();
  }, []);

  const downloadMarkdown = useCallback(() => {
    const blob = new Blob([note.raw], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.slug}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [note.raw, note.slug]);

  // --- After HTML is injected: wire up mermaid, copy buttons, callouts ---
  useLayoutEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    // 1. Callout collapse toggling
    const calloutTitles = root.querySelectorAll(
      ".callout.collapsible > .callout-title"
    );
    const calloutHandlers: Array<() => void> = [];
    calloutTitles.forEach((titleEl) => {
      const handler = (e: Event) => {
        e.preventDefault();
        const callout = (titleEl as HTMLElement).closest(".callout");
        callout?.classList.toggle("is-collapsed");
      };
      titleEl.addEventListener("click", handler);
      calloutHandlers.push(() => titleEl.removeEventListener("click", handler));
    });

    // 2. Copy buttons on code blocks
    const pres = root.querySelectorAll("pre");
    const copyHandlers: Array<() => void> = [];
    pres.forEach((pre) => {
      if (pre.querySelector(".copy-btn")) return;
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.setAttribute(
        "aria-label",
        "Copy code"
      );
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      btn.style.cssText =
        "background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#d8d8db;padding:4px;border-radius:5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;";
      const handler = async () => {
        const code = pre.querySelector("code");
        const text = code?.textContent ?? "";
        try {
          await navigator.clipboard.writeText(text);
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
          btn.style.color = "#84a59d";
          setTimeout(() => {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
            btn.style.color = "#d8d8db";
          }, 1500);
        } catch {
          /* ignore */
        }
      };
      btn.addEventListener("click", handler);
      copyHandlers.push(() => btn.removeEventListener("click", handler));
      pre.appendChild(btn);
    });

    // 3. Mermaid rendering
    let mermaidCleanup: (() => void) | null = null;
    const mermaidDivs = root.querySelectorAll(".mermaid");
    if (mermaidDivs.length > 0) {
      import("mermaid")
        .then(({ default: mermaid }) => {
          try {
            mermaid.initialize({
              startOnLoad: false,
              theme: "dark",
              themeVariables: {
                background: "#0a0a0c",
                primaryColor: "#84a59d",
                primaryTextColor: "#e8e8ea",
                primaryBorderColor: "#84a59d",
                lineColor: "#84a59d",
                secondaryColor: "#161619",
                tertiaryColor: "#101013",
                fontFamily: "var(--font-mono)",
              },
            });
            mermaid.run({ nodes: Array.from(mermaidDivs) as any });
          } catch {
            /* ignore */
          }
        })
        .catch(() => {
          /* ignore */
        });
    }

    // 4. Heading copy-link buttons (h2/h3/h4 with ids)
    const headingEls = root.querySelectorAll(
      "h2[id], h3[id], h4[id]"
    ) as NodeListOf<HTMLHeadingElement>;
    const headingHandlers: Array<() => void> = [];
    const LINK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    headingEls.forEach((h) => {
      // Skip if a copy-link button is already present inside this heading
      if (h.querySelector(".heading-copy-link")) return;
      const btn = document.createElement("button");
      btn.className = "heading-copy-link";
      btn.setAttribute("aria-label", "Copy link to this section");
      btn.innerHTML = LINK_SVG;
      btn.style.cssText =
        "display:inline-flex;align-items:center;justify-content:center;margin-left:0.5rem;padding:2px;border:none;background:transparent;color:var(--muted-foreground);cursor:pointer;opacity:0;transition:opacity 0.15s ease, color 0.15s ease;vertical-align:middle;";
      const handler = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}/?p=${encodeURIComponent(
          note.slug
        )}#${h.id}`;
        try {
          await navigator.clipboard.writeText(url);
          btn.innerHTML = CHECK_SVG;
          btn.style.color = "var(--garden)";
          setTimeout(() => {
            btn.innerHTML = LINK_SVG;
            btn.style.color = "var(--muted-foreground)";
          }, 1500);
        } catch {
          /* ignore */
        }
      };
      btn.addEventListener("click", handler);
      headingHandlers.push(() => btn.removeEventListener("click", handler));
      // Insert after the existing heading-anchor link if present, else append
      h.appendChild(btn);
    });
    // Make heading-copy-link visible on heading hover (CSS handles via :hover)

    return () => {
      calloutHandlers.forEach((fn) => fn());
      copyHandlers.forEach((fn) => fn());
      headingHandlers.forEach((fn) => fn());
      mermaidCleanup?.();
    };
  }, [html, note.slug]);

  // --- Internal link click interception + hover popovers ---
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href") ?? "";
      // Internal note links → SPA navigation
      if (href.startsWith("/?p=")) {
        e.preventDefault();
        const url = new URL(href, window.location.origin);
        const slug = url.searchParams.get("p");
        if (slug) {
          window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
          router.push(`/?p=${encodeURIComponent(slug)}`);
        }
        return;
      }
      // Tag links
      if (href.startsWith("/?tag=")) {
        e.preventDefault();
        const url = new URL(href, window.location.origin);
        const tag = url.searchParams.get("tag");
        if (tag) router.push(`/?tag=${encodeURIComponent(tag)}`);
        return;
      }
      // Heading anchors → smooth scroll
      if (href.startsWith("#")) {
        e.preventDefault();
        const id = href.slice(1);
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", `#${id}`);
        }
        return;
      }
      // External links → open in new tab
      if (
        href.startsWith("http") &&
        !href.includes(window.location.hostname)
      ) {
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
      }
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a.internal-link");
      if (!target) return;
      const slug = target.getAttribute("data-slug");
      if (!slug || target.getAttribute("data-broken") === "true") return;
      if (hoverSlug.current === slug) return;
      hoverSlug.current = slug;
      if (previewTimer.current) clearTimeout(previewTimer.current);
      previewTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/notes/${encodeURIComponent(slug)}`);
          if (!res.ok) return;
          const data = await res.json();
          const note = data.note;
          if (!note || hoverSlug.current !== slug) return;
          const rect = target.getBoundingClientRect();
          setPreview({
            data: {
              title: note.title,
              description: note.description,
              tags: note.tags,
              wordCount: note.wordCount,
            },
            x: rect.left,
            y: rect.bottom + 8,
          });
        } catch {
          /* ignore */
        }
      }, 380);
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a.internal-link");
      if (!target) return;
      const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
      if (related && target.contains(related)) return;
      hoverSlug.current = null;
      if (previewTimer.current) clearTimeout(previewTimer.current);
      setTimeout(() => setPreview(null), 120);
    };

    root.addEventListener("click", onClick);
    root.addEventListener("mouseover", onMouseOver);
    root.addEventListener("mouseout", onMouseOut);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("mouseover", onMouseOver);
      root.removeEventListener("mouseout", onMouseOut);
    };
  }, [router, html]);

  const readingTime = Math.max(1, Math.round(note.wordCount / 220));
  const dateStr = note.publishDate
    ? new Date(note.publishDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <article className="garden-fade-in">
      {/* Breadcrumb */}
      {note.folder && (
        <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Link href="/" className="hover:text-garden">garden</Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-muted-foreground/70">{note.folder}</span>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground/70">{note.slug}</span>
        </nav>
      )}

      {/* Title + meta */}
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-heading leading-tight">
          {note.title}
        </h1>
        {note.description && (
          <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
            {note.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {dateStr && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {dateStr}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {readingTime} min read
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {note.wordCount} words
          </span>
          {note.aliases.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Edit3 className="h-3.5 w-3.5" />
              aka {note.aliases.join(", ")}
            </span>
          )}
        </div>
        {note.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {note.tags.map((t) => (
              <Link
                key={t}
                href={`/?tag=${encodeURIComponent(t)}`}
                className="tag-pill"
              >
                <Hash className="h-2.5 w-2.5" />
                {t}
              </Link>
            ))}
          </div>
        )}
        {/* Action bar */}
        <div className="mt-5 flex items-center gap-1.5 border-t border-border/50 pt-4">
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-garden/40 hover:text-foreground"
            title="Copy link"
            aria-label="Copy link to this note"
          >
            {copied === "link" ? (
              <Check className="h-3.5 w-3.5 text-garden" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {copied === "link" ? "Copied!" : "Copy link"}
            </span>
          </button>
          <button
            onClick={shareNote}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-garden/40 hover:text-foreground"
            title="Share note"
            aria-label="Share this note"
          >
            {copied === "share" ? (
              <Check className="h-3.5 w-3.5 text-garden" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {copied === "share" ? "Copied!" : "Share"}
            </span>
          </button>
          <button
            onClick={randomNote}
            disabled={loadingRandom}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-garden/40 hover:text-foreground disabled:opacity-50"
            title="Open a random note"
            aria-label="Open a random note"
          >
            <Shuffle className={`h-3.5 w-3.5 ${loadingRandom ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Surprise me</span>
          </button>
          <button
            onClick={printNote}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-garden/40 hover:text-foreground"
            title="Print / Save as PDF"
            aria-label="Print this note"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={downloadMarkdown}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-garden/40 hover:text-foreground"
            title="Download as Markdown"
            aria-label="Download this note as Markdown"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">.md</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px] gap-8">
        <div className="min-w-0">
          <div
            ref={contentRef}
            id="note-content"
            className="garden-prose max-w-[72ch]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {/* Code block runner — adds Run buttons to runnable code blocks */}
          <CodeBlockRunner />
        </div>

        {/* Right rail: TOC */}
        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <TableOfContents items={tocItems} />
          </div>
        </aside>
      </div>

      {/* Prev / Next */}
      <nav className="mt-12 grid grid-cols-1 gap-3 border-t border-border pt-6 sm:grid-cols-2">
        {note.prev ? (
          <Link
            href={`/?p=${encodeURIComponent(note.prev.slug)}`}
            className="group flex items-center gap-3 rounded-lg border border-border bg-surface/30 p-4 transition-colors hover:border-garden/40"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-garden" />
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                Previous
              </span>
              <span className="block truncate font-medium text-foreground group-hover:text-garden">
                {note.prev.title}
              </span>
            </span>
          </Link>
        ) : (
          <div />
        )}
        {note.next ? (
          <Link
            href={`/?p=${encodeURIComponent(note.next.slug)}`}
            className="group flex items-center justify-end gap-3 rounded-lg border border-border bg-surface/30 p-4 text-right transition-colors hover:border-garden/40"
          >
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                Next
              </span>
              <span className="block truncate font-medium text-foreground group-hover:text-garden">
                {note.next.title}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-garden" />
          </Link>
        ) : (
          <div />
        )}
      </nav>

      {/* Related notes */}
      {note.related.length > 0 && (
        <div className="mt-8">
          <RelatedNotes notes={note.related} />
        </div>
      )}

      {/* Backlinks */}
      {note.backlinks.length > 0 && (
        <div className="mt-8">
          <Backlinks backlinks={note.backlinks} currentSlug={note.slug} />
        </div>
      )}

      {/* Stats footer */}
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface/20 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            {note.wordCount} words
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {readingTime} min read
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Link2 className="h-3 w-3" />
            {note.links.length} outgoing
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CornerDownRight className="h-3 w-3" />
            {note.backlinks.length} backlinks
          </span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground/50">
          {note.path}
        </span>
      </footer>

      {/* Hover popover */}
      {preview && preview.data && (
        <div
          className="popover-card fixed z-50 w-72 p-4"
          style={{
            left: Math.min(preview.x, window.innerWidth - 300),
            top: preview.y,
          }}
          onMouseEnter={() => {
            if (previewTimer.current) clearTimeout(previewTimer.current);
          }}
          onMouseLeave={() => setPreview(null)}
        >
          <h4 className="font-serif font-semibold text-heading leading-snug">
            {preview.data.title}
          </h4>
          {preview.data.description && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3">
              {preview.data.description}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1">
            {preview.data.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-garden/80"
              >
                <Hash className="h-2 w-2" />
                {t}
              </span>
            ))}
          </div>
          <div className="mt-2 text-[10px] font-mono text-muted-foreground/60">
            {preview.data.wordCount} words
          </div>
        </div>
      )}
    </article>
  );
}
