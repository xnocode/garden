"use client";

import React, { useState, useMemo } from "react";
import type { BookItem } from "@/lib/notes";
import { NotebookCard } from "./notebook-card";
import { BookReaderModal } from "./book-reader-modal";
import { Search, BookOpen } from "lucide-react";

interface BooksGalleryProps {
  books: BookItem[];
  title?: string;
  description?: string;
}

export function BooksGallery({
  books,
  title = "Notebooks & Manuscripts",
  description = "A curated collection of handwritten study notes, mathematical derivations, lecture manuscripts, and digital books.",
}: BooksGalleryProps) {
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter books by search
  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) => {
      const titleMatch = b.title.toLowerCase().includes(q);
      const descMatch = (b.description || "").toLowerCase().includes(q);
      const authorMatch = (b.author || "").toLowerCase().includes(q);
      const tagMatch = b.tags?.some((t) => t.toLowerCase().includes(q));
      return titleMatch || descMatch || authorMatch || tagMatch;
    });
  }, [books, searchQuery]);

  return (
    <section className="my-8 space-y-8">
      {/* ── SEARCH BAR ───────────────────────────────────────────────────── */}
      <div className="flex justify-end border-b border-border/70 pb-5">
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, authors, topics…"
            className="w-full rounded-xl border border-border bg-surface/50 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-garden/50 focus:bg-surface focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── 3D STANDING NOTEBOOKS GRID ─────────────────────────────────── */}
      {filteredBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground">
            No notebooks found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-y-16 gap-x-10 justify-items-center">
          {filteredBooks.map((book, idx) => (
            <NotebookCard
              key={`${book.title}-${idx}`}
              book={book}
              index={idx}
              onClick={() => setSelectedBook(book)}
            />
          ))}
        </div>
      )}

      {/* ── INTERACTIVE DETAIL & CLOUD PDF VIEWER MODAL ────────────────── */}
      <BookReaderModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
      />
    </section>
  );
}
