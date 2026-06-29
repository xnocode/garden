import Link from "next/link";
import { Network, Hash, FileX, Search as SearchIcon, Sprout, Terminal, Code2, BookMarked } from "lucide-react";
import type { NoteSummary, TagInfo, GraphData } from "@/lib/notes";
import { NoteCard } from "./note-card";
import { GraphPageClient } from "./graph-page-client";
import { formatDate } from "./note-card";

// ----------------------------------------------------------------------------
// Index view — alphabetical listing of all notes
// ----------------------------------------------------------------------------
export function IndexView({ notes }: { notes: NoteSummary[] }) {
  const sorted = [...notes].sort((a, b) =>
    a.title.localeCompare(b.title)
  );
  // Group by first letter
  const groups = new Map<string, NoteSummary[]>();
  for (const n of sorted) {
    const letter = (n.title[0] || "#").toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : "#";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }
  const letters = Array.from(groups.keys()).sort();

  return (
    <div className="garden-fade-in mx-auto max-w-4xl">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-heading">
          <BookMarked className="h-7 w-7 text-garden" />
          Index
        </h1>
        <p className="mt-2 text-muted-foreground">
          Every note in the garden, alphabetical.{" "}
          <span className="font-mono text-sm text-foreground">{notes.length} notes</span>
        </p>
      </header>
      {/* Letter quick-nav */}
      <div className="mb-10 flex flex-wrap gap-1">
        {letters.map((l) => (
          <a
            key={l}
            href={`#letter-${l}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border font-mono text-xs text-muted-foreground transition-all hover:border-garden/50 hover:bg-garden/10 hover:text-garden"
          >
            {l}
          </a>
        ))}
      </div>
      <div className="space-y-12">
        {letters.map((l) => (
          <section key={l} id={`letter-${l}`} className="scroll-mt-20">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-garden/30 bg-garden/10 font-serif text-lg font-bold text-garden">
                {l}
              </span>
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-[10px] text-muted-foreground/60">
                {groups.get(l)!.length} {groups.get(l)!.length === 1 ? "note" : "notes"}
              </span>
            </div>
            <ul className="space-y-1">
              {groups.get(l)!.map((n) => (
                <li key={n.slug}>
                  <Link
                    href={`/?p=${encodeURIComponent(n.slug)}`}
                    className="group flex items-baseline justify-between gap-4 rounded-lg border border-transparent px-3 py-2.5 transition-all hover:border-border hover:bg-surface/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-foreground transition-colors group-hover:text-garden">
                        {n.title}
                      </span>
                      {n.description && (
                        <span className="ml-3 text-sm text-muted-foreground truncate">
                          {n.description}
                        </span>
                      )}
                    </span>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {n.tags.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="font-mono text-[10px] text-garden/50"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Tags view — all tags
// ----------------------------------------------------------------------------
export function TagsView({ tags }: { tags: TagInfo[] }) {
  const max = tags.length > 0 ? Math.max(...tags.map((t) => t.count)) : 1;
  return (
    <div className="garden-fade-in mx-auto max-w-3xl">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-heading">
          <Hash className="h-7 w-7 text-garden" />
          Tags
        </h1>
        <p className="mt-2 text-muted-foreground">
          {tags.length} tags across the garden. Click any to see related notes.
        </p>
      </header>
      {/* Uniform tag cloud — all tags same size, count shown as a badge */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/30 p-6">
        {tags.map((t) => (
          <Link
            key={t.tag}
            href={`/?tag=${encodeURIComponent(t.tag)}`}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-sm transition-all hover:border-garden/50 hover:bg-garden/10"
            title={`${t.count} ${t.count === 1 ? "note" : "notes"}`}
          >
            <span className="text-garden transition-colors group-hover:text-garden-hover">
              #{t.tag}
            </span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors group-hover:bg-garden/20 group-hover:text-garden">
              {t.count}
            </span>
          </Link>
        ))}
      </div>
      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-border bg-surface/30 p-3">
          <div className="font-serif text-xl font-semibold text-heading">
            {tags.length}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            total tags
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface/30 p-3">
          <div className="font-serif text-xl font-semibold text-heading">
            {max}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            most used
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface/30 p-3">
          <div className="font-serif text-xl font-semibold text-heading">
            {tags.filter((t) => t.count === 1).length}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            unique
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Tag view — notes with a specific tag
// ----------------------------------------------------------------------------
export function TagView({ tag, notes }: { tag: string; notes: NoteSummary[] }) {
  return (
    <div className="garden-fade-in mx-auto max-w-5xl">
      <header className="mb-8 border-b border-border pb-6">
        <nav className="mb-2 text-sm text-muted-foreground">
          <Link href="/?view=tags" className="hover:text-garden">
            ← all tags
          </Link>
        </nav>
        <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-heading">
          <span className="inline-flex items-center gap-1 font-mono text-garden">
            <Hash className="h-6 w-6" />
            {tag}
          </span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          {notes.length} {notes.length === 1 ? "note" : "notes"} tagged{" "}
          <span className="font-mono text-garden">#{tag}</span>
        </p>
      </header>
      {notes.length === 0 ? (
        <p className="text-muted-foreground">No notes have this tag yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <NoteCard key={n.slug} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Graph page — full-width interactive graph
// ----------------------------------------------------------------------------
export function GraphPage({
  graph,
  currentSlug,
}: {
  graph: GraphData;
  currentSlug?: string | null;
}) {
  return <GraphPageClient graph={graph} currentSlug={currentSlug} />;
}

// ----------------------------------------------------------------------------
// Search results view (server-side, for ?q= landings)
// ----------------------------------------------------------------------------
export function SearchView({
  q,
  results,
}: {
  q: string;
  results: (NoteSummary & { snippet: string })[];
}) {
  return (
    <div className="garden-fade-in mx-auto max-w-3xl">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="flex items-center gap-3 font-serif text-2xl font-semibold text-heading">
          <SearchIcon className="h-6 w-6 text-garden" />
          Search
        </h1>
        <p className="mt-2 text-muted-foreground">
          {results.length} {results.length === 1 ? "result" : "results"} for{" "}
          <span className="font-mono text-foreground">{q}</span>
        </p>
      </header>
      {results.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing found. Try the command palette (⌘K) for live search.
        </p>
      ) : (
        <ul className="space-y-3">
          {results.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/?p=${encodeURIComponent(r.slug)}`}
                className="group block rounded-lg border border-border bg-surface/30 p-4 transition-colors hover:border-garden/40"
              >
                <div className="font-medium text-foreground group-hover:text-garden">
                  {r.title}
                </div>
                {r.snippet && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {r.snippet}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/70">
                  {r.publishDate && <span>{formatDate(r.publishDate)}</span>}
                  <span className="font-mono">{r.path}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Colophon — how the garden is made
// ----------------------------------------------------------------------------
export function ColophonView({
  noteCount,
  stats,
}: {
  noteCount: number;
  stats?: {
    totalNotes: number;
    totalWords: number;
    totalLinks: number;
    totalTags: number;
    lastUpdated: string | null;
  };
}) {
  const lastUpdated = stats?.lastUpdated
    ? new Date(stats.lastUpdated).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;
  return (
    <div className="garden-prose mx-auto max-w-2xl garden-fade-in">
      <h1>Colophon</h1>
      <p className="text-muted-foreground">
        How this garden is grown.
      </p>

      {/* Live stats */}
      {stats && (
        <div className="not-prose my-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "notes", value: stats.totalNotes },
            { label: "words", value: stats.totalWords.toLocaleString() },
            { label: "links", value: stats.totalLinks },
            { label: "tags", value: stats.totalTags },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-border bg-surface/40 p-4 text-center"
            >
              <div className="font-serif text-2xl font-semibold text-heading">
                {s.value}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>The stack</h2>
      <p>
        This digital garden is built on <strong>Next.js 16</strong> with the
        App Router, <strong>TypeScript</strong>, and <strong>Tailwind CSS</strong>.
        Notes live in an <strong>Obsidian</strong> vault as plain Markdown files
        and are rendered with a custom Obsidian-flavored Markdown engine —
        supporting wikilinks, callouts, embeds, math (KaTeX), Mermaid diagrams,
        and Shiki syntax highlighting.
      </p>

      <h2>The publish flow</h2>
      <p>
        Every note carries YAML frontmatter. A note is published to the site
        only when its frontmatter sets <code>draft: false</code>. Everything
        else stays private in the vault.
      </p>
      <pre>
        <code>{`---
title: "My Note"
description: "A short summary."
draft: false
date: 2024-08-15
tags: [essay, thinking]
---

The body of the note…`}</code>
      </pre>
      <p>
        From the terminal, a single command scans the vault, renders every
        publishable note to HTML, computes backlinks and the graph, copies
        assets, and syncs everything into the database:
      </p>
      <pre>
        <code>{`$ bun run publish          # publish all draft:false notes
$ bun run publish --watch  # auto re-publish on save
$ bun run dev              # preview at localhost:3000`}</code>
      </pre>

      <h2>Features</h2>
      <ul>
        <li>
          <strong>Obsidian-flavored markdown</strong> — wikilinks{" "}
          <code>[[Note]]</code>, embeds <code>![[Note]]</code>, section
          transclusions <code>![[Note#heading]]</code>, callouts (12 types),
          highlights, comments, tags, math, mermaid.
        </li>
        <li>
          <strong>Interactive graph</strong> — force-directed knowledge graph
          with tag filtering, pan/zoom/drag, and click-to-navigate.
        </li>
        <li>
          <strong>Command palette</strong> — <kbd>⌘K</kbd> full-text search
          with keyboard navigation.
        </li>
        <li>
          <strong>Reading history</strong> — visited notes tracked locally,
          shown in the sidebar.
        </li>
        <li>
          <strong>Related notes</strong> — shared tags + 2-hop link analysis.
        </li>
        <li>
          <strong>Backlinks</strong> with hover-popover previews.
        </li>
        <li>
          <strong>RSS feed</strong> (<code>/api/rss</code>) and{" "}
          <strong>sitemap</strong> (<code>/api/sitemap</code>).
        </li>
        <li>
          <strong>Keyboard shortcuts</strong> — press <kbd>?</kbd> for the full
          list.
        </li>
        <li>
          <strong>Dark / light theme</strong> — darkest by default.
        </li>
      </ul>

      <h2>The design</h2>
      <p>
        The darkest theme by default — a near-black canvas with a sage-green
        accent, inspired by Quartz and Obsidian. Typography pairs Schibsted
        Grotesk for headings, Source Sans 3 for body, and IBM Plex Mono for
        code.
      </p>

      <div className="callout" data-callout="tip">
        <div className="callout-title">
          <span className="callout-title-icon">💡</span>
          <span className="callout-title-text">Tip</span>
        </div>
        <div className="callout-content">
          <p>
            Press <kbd>⌘K</kbd> (or <kbd>Ctrl+K</kbd>) anywhere to search. Press{" "}
            <kbd>?</kbd> for all keyboard shortcuts. Hover any internal link to
            preview the target note.
          </p>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-muted-foreground text-sm">
          {noteCount} notes currently growing · last tended {lastUpdated}.
        </p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Not found
// ----------------------------------------------------------------------------
export function NotFoundView({ slug }: { slug: string }) {
  return (
    <div className="garden-fade-in mx-auto max-w-lg py-16 text-center">
      <FileX className="mx-auto h-12 w-12 text-muted-foreground/40" />
      <h1 className="mt-4 font-serif text-3xl font-semibold text-heading">
        This note hasn&apos;t sprouted
      </h1>
      <p className="mt-3 text-muted-foreground">
        There&apos;s no published note at{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm">
          {slug}
        </code>
        . It may be a draft, or the link may be broken.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-garden px-4 py-2 text-sm font-medium text-garden-foreground"
        >
          <Sprout className="h-4 w-4" /> Back to the garden
        </Link>
        <Link
          href="/?view=index"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/60 px-4 py-2 text-sm font-medium text-foreground hover:border-garden/40"
        >
          Browse the index
        </Link>
      </div>
    </div>
  );
}
