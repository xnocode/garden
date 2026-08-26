"use client";

import React, { useState, useMemo } from "react";
import { BookOpen, Search, X, BookMarked, Library, Tag } from "lucide-react";
import type { BookItem } from "@/lib/notes";
import { PDFModalViewer } from "./pdf-modal-viewer";

interface BookGalleryProps {
  books: BookItem[];
  title?: string;
  description?: string;
}

export function BookGallery({
  books,
  title = "Library",
  description = "A personal collection of notebooks, lecture slides, and manuscripts — all readable in-browser.",
}: BookGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeBook, setActiveBook] = useState<BookItem | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const b of books) {
      if (b.category?.trim()) set.add(b.category.trim());
    }
    return Array.from(set).sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return books.filter((b) => {
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        (b.author ?? "").toLowerCase().includes(q) ||
        (b.category ?? "").toLowerCase().includes(q) ||
        (b.description ?? "").toLowerCase().includes(q) ||
        (b.tags && b.tags.some((t) => t.toLowerCase().includes(q)));
      const matchesCategory =
        !selectedCategory ||
        b.category === selectedCategory ||
        (b.tags && b.tags.includes(selectedCategory));
      return matchesSearch && matchesCategory;
    });
  }, [books, searchQuery, selectedCategory]);

  return (
    <div className="garden-fade-in mx-auto max-w-6xl">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Library className="h-5 w-5 text-garden" />
          <h1 className="font-serif text-3xl font-bold text-heading tracking-tight">{title}</h1>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
        )}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search title, author, topic…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-garden focus:ring-2 focus:ring-garden/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Result count */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-center flex-shrink-0">
          <span className="font-semibold text-foreground">{filteredBooks.length}</span>
          <span>of {books.length} volumes</span>
        </div>
      </div>

      {/* ── Category chips ───────────────────────────────────────────── */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
              selectedCategory === null
                ? "bg-garden text-garden-foreground border-garden shadow-sm"
                : "bg-surface border-border text-muted-foreground hover:border-garden/50 hover:text-foreground"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                selectedCategory === cat
                  ? "bg-garden text-garden-foreground border-garden shadow-sm"
                  : "bg-surface border-border text-muted-foreground hover:border-garden/50 hover:text-foreground"
              }`}
            >
              <Tag className="h-2.5 w-2.5" />
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      {filteredBooks.length === 0 ? (
        <EmptyState
          hasFilters={!!(searchQuery || selectedCategory)}
          onReset={() => { setSearchQuery(""); setSelectedCategory(null); }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((book, idx) => (
            <BookCard key={idx} book={book} onOpen={() => setActiveBook(book)} />
          ))}
        </div>
      )}

      <PDFModalViewer book={activeBook} isOpen={Boolean(activeBook)} onClose={() => setActiveBook(null)} />
    </div>
  );
}

// ── Book Card ─────────────────────────────────────────────────────────────────

// Deterministic gradient per title (no cover needed)
const SPINE_GRADIENTS = [
  ["#0f2027", "#203a43", "#2c5364"],
  ["#1a1a2e", "#16213e", "#0f3460"],
  ["#0d1117", "#161b22", "#21262d"],
  ["#0a1628", "#0d2137", "#0f3059"],
  ["#130a1e", "#1e0f30", "#2d1854"],
  ["#0a1f0a", "#122412", "#1a3d1a"],
  ["#1a0a0a", "#2d1010", "#3d1515"],
  ["#0a1a1a", "#102828", "#163d3d"],
];

function hashTitle(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function BookCard({ book, onOpen }: { book: BookItem; onOpen: () => void }) {
  const grad = SPINE_GRADIENTS[hashTitle(book.title) % SPINE_GRADIENTS.length];

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="group flex gap-4 p-4 rounded-2xl border border-border bg-surface hover:border-garden/40 hover:bg-surface-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-garden/30"
    >
      {/* Cover */}
      <div className="flex-shrink-0 w-[68px] h-[96px] rounded-lg overflow-hidden shadow-md relative">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-2"
            style={{ background: `linear-gradient(160deg, ${grad[0]}, ${grad[1]}, ${grad[2]})` }}
          >
            <BookOpen className="h-6 w-6 text-garden opacity-70" />
          </div>
        )}
        {/* Hover open cue */}
        <div className="absolute inset-0 bg-garden/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
          <span className="text-[9px] font-mono uppercase tracking-wider text-garden font-semibold">Open</span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {book.category && (
            <span className="inline-block text-[10px] font-mono uppercase tracking-widest text-garden mb-1 opacity-80">
              {book.category}
            </span>
          )}
          <h3 className="font-serif text-sm font-semibold text-heading leading-snug line-clamp-2 group-hover:text-garden transition-colors">
            {book.title}
          </h3>
          {book.author && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
          )}
          {book.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
              {book.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
          <span className="text-[10px] font-mono text-garden group-hover:underline">
            Read PDF →
          </span>
          {book.tags && book.tags.length > 0 && (
            <div className="flex gap-1">
              {book.tags.slice(0, 2).map((t) => (
                <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border/50">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border/60 text-center">
      <BookMarked className="h-10 w-10 text-muted-foreground/30 mb-3" />
      <h3 className="font-serif text-base font-semibold text-heading mb-1">No volumes found</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasFilters
          ? "Try clearing your search or selecting a different category."
          : "Add books via the books: frontmatter in any Markdown note."}
      </p>
      {hasFilters && (
        <button
          onClick={onReset}
          className="mt-4 text-xs font-medium text-garden hover:text-garden-hover underline underline-offset-2 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
