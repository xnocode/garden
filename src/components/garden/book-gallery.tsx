"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  X,
  BookMarked,
  ChevronDown,
  ChevronUp,
  Library,
} from "lucide-react";
import type { BookItem } from "@/lib/notes";
import { PDFModalViewer } from "./pdf-modal-viewer";

interface BookGalleryProps {
  books: BookItem[];
  title?: string;
  description?: string;
}

const CATEGORY_PALETTES: Record<
  string,
  { from: string; via: string; to: string; label: string; border: string }
> = {
  Physics: {
    from: "#1a0533",
    via: "#3d0f6b",
    to: "#5c1a94",
    label: "#d4a8ff",
    border: "#7c3aed40",
  },
  Mathematics: {
    from: "#001a33",
    via: "#003d73",
    to: "#005fa3",
    label: "#7dd3fc",
    border: "#0284c740",
  },
  University: {
    from: "#0d1f0a",
    via: "#1a3d14",
    to: "#275f1e",
    label: "#86efac",
    border: "#22c55e40",
  },
  "Computer Science": {
    from: "#0f0a1a",
    via: "#1e1035",
    to: "#2d1854",
    label: "#c4b5fd",
    border: "#8b5cf640",
  },
  Literature: {
    from: "#1a0a00",
    via: "#3d2000",
    to: "#5c3300",
    label: "#fcd34d",
    border: "#d9770640",
  },
  Philosophy: {
    from: "#1a1000",
    via: "#3d2800",
    to: "#5c3d00",
    label: "#fbbf24",
    border: "#f59e0b40",
  },
  History: {
    from: "#1a0800",
    via: "#3d1500",
    to: "#5c2200",
    label: "#fb923c",
    border: "#ea580c40",
  },
  Science: {
    from: "#001a1a",
    via: "#003d3d",
    to: "#005f5f",
    label: "#67e8f9",
    border: "#0891b240",
  },
};

const DEFAULT_PALETTE = {
  from: "#111010",
  via: "#1e1b18",
  to: "#2d2926",
  label: "#d4b896",
  border: "#d4b89640",
};

function getCategoryPalette(category?: string | null) {
  if (!category) return DEFAULT_PALETTE;
  return CATEGORY_PALETTES[category] ?? DEFAULT_PALETTE;
}

export function BookGallery({
  books,
  title = "Books & Manuscripts Library",
  description = "A curated collection of handwritten notebooks, lecture slides, and manuscripts.",
}: BookGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeBook, setActiveBook] = useState<BookItem | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    <div className="garden-fade-in mx-auto max-w-7xl">
      {/* Masthead */}
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, #d4b89660, transparent)" }} />
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0"
            style={{ background: "radial-gradient(circle at 35% 35%, #2d2420, #1a1410)", boxShadow: "0 0 20px #d4b89615, inset 0 1px 0 #d4b89620", border: "1px solid #d4b89630" }}
          >
            <Library className="h-5 w-5" style={{ color: "#d4b896" }} />
          </span>
          <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, #d4b89660, transparent)" }} />
        </div>

        <div className="text-center mb-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] mb-3" style={{ color: "#d4b896aa" }}>Personal Collection</p>
          <h1
            className="font-serif text-4xl sm:text-5xl font-bold tracking-tight mb-3"
            style={{ background: "linear-gradient(135deg, #f5e6c8 0%, #d4b896 40%, #b8966e 70%, #d4b896 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
          >
            {title}
          </h1>
          {description && (
            <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: "#a89070" }}>{description}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 mb-8">
          {[
            { value: books.length, label: "Volumes" },
            { value: categories.length, label: "Subjects" },
            { value: books.filter((b) => b.cover).length || "\u2014", label: "With Covers" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <span className="block font-serif text-2xl font-bold" style={{ color: "#d4b896" }}>{value}</span>
              <span className="block font-mono text-[10px] uppercase tracking-widest mt-0.5" style={{ color: "#a89070" }}>{label}</span>
            </div>
          ))}
        </div>

        <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent, #d4b89640, #d4b896a0, #d4b89640, transparent)" }} />
      </header>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-52 flex-shrink-0">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl border mb-3 text-sm font-medium"
            style={{ background: "#1a1510", borderColor: "#d4b89630", color: "#d4b896" }}
          >
            <span>Filter by Subject</span>
            {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <div className={`${filtersOpen ? "block" : "hidden"} lg:block space-y-1`}>
            <p className="hidden lg:block font-mono text-[10px] uppercase tracking-[0.25em] mb-3 px-1" style={{ color: "#a89070" }}>Subjects</p>

            <button
              onClick={() => setSelectedCategory(null)}
              className="w-full text-left py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={selectedCategory === null
                ? { background: "linear-gradient(135deg, #2d2218, #1a1510)", color: "#d4b896", borderLeft: "2px solid #d4b896", paddingLeft: "10px" }
                : { background: "transparent", color: "#a89070", borderLeft: "2px solid transparent", paddingLeft: "10px" }}
            >
              All Volumes
              <span className="ml-2 font-mono text-[10px]" style={{ color: "#a8907080" }}>({books.length})</span>
            </button>

            {categories.map((cat) => {
              const palette = getCategoryPalette(cat);
              const isActive = selectedCategory === cat;
              const count = books.filter((b) => b.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isActive ? null : cat)}
                  className="w-full text-left py-2 rounded-lg text-sm transition-all duration-200"
                  style={isActive
                    ? { background: `linear-gradient(135deg, ${palette.from}, ${palette.via})`, color: palette.label, borderLeft: `2px solid ${palette.label}`, paddingLeft: "10px" }
                    : { background: "transparent", color: "#a89070", borderLeft: "2px solid transparent", paddingLeft: "10px" }}
                >
                  {cat}
                  <span className="ml-2 font-mono text-[10px]" style={{ color: "#a8907060" }}>({count})</span>
                </button>
              );
            })}

            <div className="hidden lg:block mt-6 h-px w-full" style={{ background: "linear-gradient(to right, #d4b89620, transparent)" }} />

            {/* Desktop search */}
            <div className="hidden lg:block mt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-2 px-1" style={{ color: "#a89070" }}>Search</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#a89070" }} />
                <input
                  type="text"
                  placeholder="Title, author…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border outline-none"
                  style={{ background: "#120f0c", borderColor: searchQuery ? "#d4b89660" : "#d4b89625", color: "#d4b896" }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "#a89070" }} aria-label="Clear">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="mt-1.5 font-mono text-[10px] px-1" style={{ color: "#a89070" }}>
                  {filteredBooks.length} result{filteredBooks.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Grid area */}
        <div className="flex-1 min-w-0">
          {/* Mobile search */}
          <div className="lg:hidden mb-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#a89070" }} />
              <input
                type="text"
                placeholder="Search books, authors, topics…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 text-sm rounded-xl border outline-none"
                style={{ background: "#120f0c", borderColor: "#d4b89630", color: "#d4b896" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#a89070" }} aria-label="Clear">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results label */}
          <div className="flex items-center justify-between mb-5">
            <p className="font-mono text-xs" style={{ color: "#a89070" }}>
              {selectedCategory && <><span style={{ color: "#d4b896" }}>{selectedCategory}</span>{" \u2014 "}</>}
              {filteredBooks.length} volume{filteredBooks.length !== 1 ? "s" : ""}
            </p>
            {(selectedCategory || searchQuery) && (
              <button
                onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                className="font-mono text-[10px] uppercase tracking-widest transition-colors"
                style={{ color: "#a89070" }}
              >
                Clear filters \u00d7
              </button>
            )}
          </div>

          {filteredBooks.length === 0 ? (
            <EmptyState
              hasFilters={!!(searchQuery || selectedCategory)}
              onReset={() => { setSearchQuery(""); setSelectedCategory(null); }}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {filteredBooks.map((book, idx) => (
                <BookSpineCard key={idx} book={book} index={idx} onOpen={() => setActiveBook(book)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <PDFModalViewer book={activeBook} isOpen={Boolean(activeBook)} onClose={() => setActiveBook(null)} />
    </div>
  );
}

function BookSpineCard({ book, index, onOpen }: { book: BookItem; index: number; onOpen: () => void }) {
  const palette = getCategoryPalette(book.category);

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="group relative cursor-pointer select-none"
    >
      <div
        className="relative rounded-sm overflow-hidden transition-all duration-300"
        style={{
          aspectRatio: "2/3",
          background: `linear-gradient(160deg, ${palette.from} 0%, ${palette.via} 50%, ${palette.to} 100%)`,
          border: `1px solid ${palette.border}`,
          boxShadow: "4px 4px 12px #00000060, 1px 1px 0 #ffffff08 inset",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-8px) rotate(-1deg)";
          e.currentTarget.style.boxShadow = `8px 16px 32px #00000090, 1px 1px 0 #ffffff10 inset, 0 0 30px ${palette.border}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0) rotate(0deg)";
          e.currentTarget.style.boxShadow = "4px 4px 12px #00000060, 1px 1px 0 #ffffff08 inset";
        }}
      >
        {book.cover ? (
          <img src={book.cover} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div>
              {book.category && (
                <span className="font-mono text-[8px] uppercase tracking-[0.2em] opacity-70" style={{ color: palette.label }}>{book.category}</span>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center px-1 py-4">
              <span
                className="font-serif text-sm font-bold text-center leading-snug"
                style={{ color: palette.label, textShadow: "0 1px 8px #00000080" }}
              >
                {book.title}
              </span>
            </div>
            <div>
              {book.author && (
                <span className="font-mono text-[8px] opacity-50 block truncate" style={{ color: palette.label }}>{book.author}</span>
              )}
            </div>
            <div className="absolute top-0 right-0 w-6 h-6" style={{ background: `linear-gradient(135deg, transparent 50%, ${palette.label}15 50%)` }} />
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }}
        >
          <BookOpen className="h-6 w-6" style={{ color: palette.label }} />
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: palette.label }}>Open PDF</span>
        </div>

        {/* Left spine accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-sm"
          style={{ background: `linear-gradient(to bottom, ${palette.label}60, ${palette.label}20, ${palette.label}60)` }}
        />
      </div>

      {/* Below-card metadata */}
      <div className="mt-2.5 px-0.5">
        <h3 className="font-serif text-xs font-semibold leading-snug line-clamp-2" style={{ color: "#d4c4a8" }}>{book.title}</h3>
        {book.author && (
          <p className="mt-0.5 font-mono text-[10px] truncate" style={{ color: "#a89070" }}>{book.author}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed text-center"
      style={{ borderColor: "#d4b89620" }}
    >
      <BookMarked className="h-12 w-12 mb-4" style={{ color: "#d4b89630" }} />
      <h3 className="font-serif text-lg font-semibold mb-1" style={{ color: "#d4b896" }}>No volumes found</h3>
      <p className="text-sm max-w-sm" style={{ color: "#a89070" }}>
        {hasFilters
          ? "No books match your current filters. Try clearing the search or selecting a different subject."
          : "The library is empty. Add books via the books: frontmatter in any Markdown note."}
      </p>
      {hasFilters && (
        <button
          onClick={onReset}
          className="mt-5 font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-lg border"
          style={{ borderColor: "#d4b89640", color: "#d4b896", background: "#1a150e" }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
