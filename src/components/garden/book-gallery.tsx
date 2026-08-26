"use client";

import React, { useState, useMemo } from "react";
import { BookOpen, Search, X, Hash, User, ExternalLink, ArrowUpRight, BookMarked, Sparkles } from "lucide-react";
import type { BookItem } from "@/lib/notes";
import { PDFModalViewer } from "./pdf-modal-viewer";

interface BookGalleryProps {
  books: BookItem[];
  title?: string;
  description?: string;
}

export function BookGallery({
  books,
  title = "Books & Manuscripts Library",
  description = "A curated collection of physical notebooks, lecture slides, and handwritten manuscripts with direct Google Drive & cloud PDF access.",
}: BookGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeBook, setActiveBook] = useState<BookItem | null>(null);

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const b of books) {
      if (b.category && b.category.trim()) set.add(b.category.trim());
      if (b.tags && Array.isArray(b.tags)) {
        b.tags.forEach((t) => set.add(t));
      }
    }
    return Array.from(set).sort();
  }, [books]);

  // Filter books in real-time
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
      {/* Library Header */}
      <header className="mb-8 border-b border-border pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-garden/15 text-garden ring-1 ring-garden/30">
                <BookOpen className="h-5 w-5" />
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-heading">
                {title}
              </h1>
            </div>
            {description && (
              <p className="mt-2 text-base text-muted-foreground max-w-2xl">
                {description}
              </p>
            )}
          </div>

          {/* Library Counter Badge */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-border/80 bg-surface/50 px-4 py-2.5 text-center">
              <span className="block font-serif text-2xl font-bold text-heading">
                {books.length}
              </span>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Total Books
              </span>
            </div>
          </div>
        </div>

        {/* ── Dedicated Book Search Bar & Filters ────────────────────────── */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by book name, author, topic, or description…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground/60 shadow-sm focus:outline-none focus:border-garden focus:ring-2 focus:ring-garden/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Results count text */}
            <div className="text-xs font-mono text-muted-foreground flex-shrink-0 self-center">
              {filteredBooks.length} of {books.length} books
            </div>
          </div>

          {/* Category Pill Filters */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`rounded-full px-3 py-1 text-xs font-mono transition-all ${
                  selectedCategory === null
                    ? "bg-garden text-garden-foreground font-medium shadow-sm"
                    : "border border-border bg-surface/70 text-muted-foreground hover:text-foreground hover:border-garden/40"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-mono transition-all ${
                    selectedCategory === cat
                      ? "bg-garden text-garden-foreground font-medium shadow-sm"
                      : "border border-border bg-surface/70 text-muted-foreground hover:text-foreground hover:border-garden/40"
                  }`}
                >
                  <Hash className="h-2.5 w-2.5" />
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Book Grid ─────────────────────────────────────────────────── */}
      {filteredBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center my-6 bg-surface/20">
          <BookMarked className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-serif text-lg font-semibold text-heading">No matching books found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            {searchQuery || selectedCategory
              ? "Try adjusting your search keywords or clearing category filters."
              : "No books are available yet. Add books using the 'books:' frontmatter array in any Markdown note."}
          </p>
          {(searchQuery || selectedCategory) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory(null);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground hover:border-garden/50 hover:text-garden transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book, idx) => (
            <BookCard key={idx} book={book} onOpen={() => setActiveBook(book)} />
          ))}
        </div>
      )}

      {/* ── Built-in PDF Reader Modal ─────────────────────────────────── */}
      <PDFModalViewer
        book={activeBook}
        isOpen={Boolean(activeBook)}
        onClose={() => setActiveBook(null)}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Individual Book Card Component
// ----------------------------------------------------------------------------
function BookCard({ book, onOpen }: { book: BookItem; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="group relative flex flex-col rounded-2xl border border-border/70 bg-surface/40 p-4 shadow-sm transition-all duration-300 hover:border-garden/50 hover:bg-surface/80 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden"
    >
      {/* Book Cover Container */}
      <div className="relative mb-4 flex items-center justify-center p-2 rounded-xl bg-surface-2/40 overflow-hidden aspect-[3/4] group-hover:bg-surface-2/60 transition-colors">
        {/* Book Cover Image */}
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover rounded-md shadow-md transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full rounded-md bg-gradient-to-br from-stone-800 via-zinc-900 to-neutral-950 p-4 flex flex-col justify-between text-white border border-white/5 shadow-md">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-garden tracking-wider uppercase">
              <Sparkles className="h-3 w-3" />
              Manuscript
            </span>
            <span className="font-serif text-sm font-semibold line-clamp-3 leading-snug">
              {book.title}
            </span>
            <span className="font-mono text-[9px] text-white/50">{book.author || "Digital Garden"}</span>
          </div>
        )}

        {/* Category Pill on Cover */}
        {book.category && (
          <span className="absolute top-3 left-3 inline-flex items-center rounded-md bg-black/65 px-2 py-0.5 font-mono text-[9px] text-white backdrop-blur-md border border-white/10">
            {book.category}
          </span>
        )}

        {/* Hover Quick Read Button Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-garden px-3 py-1.5 text-xs font-semibold text-garden-foreground shadow-lg transform scale-95 group-hover:scale-100 transition-transform">
            <BookOpen className="h-3.5 w-3.5" />
            Read PDF
          </span>
        </div>
      </div>

      {/* Book Metadata */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-serif text-base font-semibold text-heading group-hover:text-garden transition-colors line-clamp-2 leading-snug">
          {book.title}
        </h3>

        {book.author && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3 text-muted-foreground/70" />
            <span>{book.author}</span>
          </div>
        )}

        {book.description && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
            {book.description}
          </p>
        )}

        {/* Read Action Link */}
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono text-[10px] text-garden font-medium">
            Open PDF Viewer
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-garden transition-colors" />
        </div>
      </div>
    </div>
  );
}
