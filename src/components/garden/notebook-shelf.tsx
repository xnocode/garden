"use client";

import React, { useState, useEffect } from "react";
import { GardenLink } from "./garden-link";
import { BookOpen, BookMarked, Sparkles, Hash, Calendar, Layers, Clock, ArrowUpRight, Search } from "lucide-react";
import type { NoteSummary } from "@/lib/notes";

interface NotebookShelfProps {
  notes: NoteSummary[];
}

export function NotebookShelfView({ notes }: NotebookShelfProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Filter notebooks
  const notebooks = notes.filter((n) => n.type === "notebook" || Boolean(n.notebook));

  const allTags = Array.from(new Set(notebooks.flatMap((n) => n.tags))).sort();

  const filteredNotebooks = notebooks.filter((n) => {
    const matchesQuery =
      !filterQuery ||
      n.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (n.description ?? "").toLowerCase().includes(filterQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(filterQuery.toLowerCase()));

    const matchesTag = !selectedTag || n.tags.includes(selectedTag);

    return matchesQuery && matchesTag;
  });

  return (
    <div className="garden-fade-in mx-auto max-w-6xl">
      {/* Shelf Header */}
      <header className="mb-10 border-b border-border pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-garden/15 text-garden ring-1 ring-garden/30">
                <BookOpen className="h-5 w-5" />
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-heading">
                Manuscript Shelf
              </h1>
            </div>
            <p className="mt-2 text-base text-muted-foreground max-w-2xl">
              Authentic handwritten notebooks, mathematical derivations, sketchbooks, and lecture manuscripts
              rendered in interactive 3D flipbooks.
            </p>
          </div>

          {/* Stats Badge */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-border/80 bg-surface/50 px-4 py-2.5 text-center">
              <span className="block font-serif text-2xl font-bold text-heading">
                {notebooks.length}
              </span>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Manuscripts
              </span>
            </div>
          </div>
        </div>

        {/* Filter & Tag Row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notebooks…"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-garden/50 focus:ring-1 focus:ring-garden/50"
            />
          </div>

          {/* Tag Pills */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedTag(null)}
                className={`rounded-full px-2.5 py-1 text-xs font-mono transition-colors ${
                  selectedTag === null
                    ? "bg-garden text-garden-foreground font-medium"
                    : "border border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-mono transition-colors ${
                    selectedTag === t
                      ? "bg-garden text-garden-foreground font-medium"
                      : "border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-garden/30"
                  }`}
                >
                  <Hash className="h-2.5 w-2.5" />
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Bookshelf Grid */}
      {filteredNotebooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center">
          <BookMarked className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-serif text-lg font-semibold text-heading">No manuscripts found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            {filterQuery || selectedTag
              ? "Try clearing your search filters to view all notebooks."
              : "To publish a manuscript, add 'type: notebook' and 'pdf: <path or url>' to any note's frontmatter in Obsidian."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredNotebooks.map((n) => (
            <NotebookCard key={n.slug} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// 3D Perspective Notebook Card
// ----------------------------------------------------------------------------
function NotebookCard({ note }: { note: NoteSummary }) {
  const manifest = note.notebook;
  const [savedPage, setSavedPage] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = localStorage.getItem(`notebook_page_${note.slug}`);
      if (p) setSavedPage(parseInt(p, 10));
    }
  }, [note.slug]);

  const coverSrc = manifest?.coverImage || manifest?.pages?.[0]?.image || manifest?.pages?.[0]?.thumb;
  const totalPages = manifest?.pageCount || 1;
  const paperTheme = manifest?.theme || "warm-grid";

  const dateStr = note.publishDate
    ? new Date(note.publishDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <GardenLink
      href={`/?p=${encodeURIComponent(note.slug)}`}
      className="group relative flex flex-col rounded-2xl border border-border/70 bg-surface/40 p-5 shadow-sm transition-all duration-300 hover:border-garden/50 hover:bg-surface/80 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
    >
      {/* 3D Book Cover Stage */}
      <div className="relative mb-5 flex items-center justify-center p-3 rounded-xl bg-surface-2/40 overflow-hidden min-h-[220px]">
        {/* Subtle decorative background light */}
        <div className="absolute inset-0 bg-gradient-to-br from-garden/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* 3D Perspective Notebook */}
        <div
          className="relative transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-y-[-8deg]"
          style={{ perspective: 800 }}
        >
          <div
            className="relative rounded-md shadow-2xl overflow-hidden border border-black/20"
            style={{
              width: "140px",
              height: "190px",
              boxShadow: "-8px 12px 25px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            {/* Book Spine Highlight */}
            <div
              className="absolute inset-y-0 left-0 w-3.5 z-20"
              style={{
                background: "linear-gradient(to right, rgba(0,0,0,0.5), rgba(255,255,255,0.2) 60%, transparent)",
              }}
            />

            {/* Cover Image or Styled Paper Texture */}
            {coverSrc ? (
              <img
                src={coverSrc}
                alt={note.title}
                className="w-full h-full object-cover select-none"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-900/60 to-stone-900 p-3 flex flex-col justify-between text-white">
                <span className="font-mono text-[9px] text-garden tracking-wider uppercase">
                  Manuscript
                </span>
                <span className="font-serif text-xs font-semibold line-clamp-3 leading-tight">
                  {note.title}
                </span>
                <span className="font-mono text-[8px] text-white/50">{totalPages} pages</span>
              </div>
            )}

            {/* Page edge simulation (stacked pages effect on right) */}
            <div
              className="absolute inset-y-0 right-0 w-1.5 z-20"
              style={{
                background: "repeating-linear-gradient(to right, #ddd, #ddd 1px, #bbb 1px, #bbb 2px)",
              }}
            />
          </div>
        </div>

        {/* Page Count Badge */}
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] text-white backdrop-blur-md border border-white/10">
          <Layers className="h-3 w-3 text-garden" />
          {totalPages} {totalPages === 1 ? "page" : "pages"}
        </span>

        {/* Paper Theme Badge */}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-surface/90 px-2 py-0.5 font-mono text-[9px] text-muted-foreground border border-border">
          {paperTheme}
        </span>
      </div>

      {/* Title & Metadata */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-serif text-lg font-semibold text-heading group-hover:text-garden transition-colors line-clamp-2 leading-snug">
          {note.title}
        </h3>

        {note.description && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
            {note.description}
          </p>
        )}

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {note.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-0.5 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-garden/80"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Reading Progress & Date Footer */}
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          {dateStr ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateStr}
            </span>
          ) : (
            <span />
          )}

          {savedPage ? (
            <span className="font-mono text-[10px] text-garden font-medium">
              Read p.{savedPage}/{totalPages}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-garden font-medium transition-colors">
              Open Flipbook <ArrowUpRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </GardenLink>
  );
}
