"use client";

import React, { useState, useMemo, useRef } from "react";
import { Search, X, BookMarked } from "lucide-react";
import type { BookItem } from "@/lib/notes";
import { PDFModalViewer } from "./pdf-modal-viewer";

interface BookGalleryProps {
  books: BookItem[];
  title?: string;
  description?: string;
}

// Rich spine colour palettes — (a=dark end, b=light end, text, accent stripe)
const PALETTES = [
  { a: "#1a1744", b: "#2d2870", text: "#e8d5a3", accent: "#c4a84f" },
  { a: "#2d0a0a", b: "#5c1515", text: "#f5d0a9", accent: "#d4804a" },
  { a: "#0a2d1a", b: "#155c35", text: "#b8f0c8", accent: "#4ecb70" },
  { a: "#1e1a0a", b: "#3d3510", text: "#f5e8c0", accent: "#c8b050" },
  { a: "#2d1a00", b: "#5c3800", text: "#f5e4b8", accent: "#d4a030" },
  { a: "#0a1a2d", b: "#15355c", text: "#a8d4f5", accent: "#4a90c8" },
  { a: "#2d0a1a", b: "#5c1535", text: "#f5c8d8", accent: "#c8507a" },
  { a: "#0a2d2d", b: "#155c5c", text: "#a8f0f0", accent: "#40c8c8" },
  { a: "#200a2d", b: "#40155c", text: "#e0a8f5", accent: "#a040c8" },
  { a: "#2d1500", b: "#5c2d00", text: "#f5c8a0", accent: "#c87040" },
  { a: "#101010", b: "#2a2a2a", text: "#d4c5a8", accent: "#a08840" },
  { a: "#0a2000", b: "#154000", text: "#c8f0a8", accent: "#60c830" },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SHELF_SIZE = 10;

export function BookGallery({
  books,
  title = "Library",
  description,
}: BookGalleryProps) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [active, setActive] = useState<BookItem | null>(null);

  const categories = useMemo(() => {
    const s = new Set<string>();
    books.forEach((b) => {
      if (b.category?.trim()) s.add(b.category.trim());
    });
    return Array.from(s).sort();
  }, [books]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      const ms =
        !q ||
        b.title.toLowerCase().includes(q) ||
        (b.author ?? "").toLowerCase().includes(q) ||
        (b.category ?? "").toLowerCase().includes(q) ||
        (b.description ?? "").toLowerCase().includes(q);
      const mc =
        !cat ||
        b.category === cat ||
        (b.tags && b.tags.includes(cat));
      return ms && mc;
    });
  }, [books, search, cat]);

  const shelves: BookItem[][] = [];
  for (let i = 0; i < filtered.length; i += SHELF_SIZE) {
    shelves.push(filtered.slice(i, i + SHELF_SIZE));
  }

  return (
    <div className="garden-fade-in mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold text-heading mb-1.5">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search books…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-garden focus:ring-2 focus:ring-garden/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground self-center flex-shrink-0">
          {filtered.length} / {books.length} volumes
        </span>
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {(["All", ...categories] as string[]).map((c) => {
            const isActive = c === "All" ? !cat : cat === c;
            return (
              <button
                key={c}
                onClick={() =>
                  setCat(c === "All" ? null : cat === c ? null : c)
                }
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? "bg-garden text-garden-foreground border-garden"
                    : "bg-surface border-border text-muted-foreground hover:border-garden/50 hover:text-foreground"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Bookshelf cabinet ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyShelf
          hasFilters={!!(search || cat)}
          onReset={() => {
            setSearch("");
            setCat(null);
          }}
        />
      ) : (
        <div
          style={{
            background:
              "linear-gradient(180deg,#160e06 0%,#0d0904 100%)",
            borderRadius: "20px",
            padding: "40px 28px 20px",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.04),0 30px 80px rgba(0,0,0,0.85),inset 0 1px 0 rgba(255,255,255,0.04)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ceiling warm-light bloom */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "15%",
              right: "15%",
              height: "180px",
              background:
                "radial-gradient(ellipse at 50% 0%,rgba(255,200,80,0.09) 0%,transparent 70%)",
              pointerEvents: "none",
            }}
          />
          {/* Side vignette */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right,rgba(0,0,0,0.45) 0%,transparent 10%,transparent 90%,rgba(0,0,0,0.45) 100%)",
              pointerEvents: "none",
            }}
          />

          {shelves.map((sh, si) => (
            <ShelfRow
              key={si}
              books={sh}
              onOpen={(b) => setActive(b)}
            />
          ))}

          {/* Cabinet floor */}
          <div
            style={{
              height: "8px",
              background:
                "linear-gradient(180deg,#2a1a08,#1a1008)",
              borderRadius: "4px",
              marginTop: "4px",
            }}
          />
        </div>
      )}

      <PDFModalViewer
        book={active}
        isOpen={Boolean(active)}
        onClose={() => setActive(null)}
      />
    </div>
  );
}

/* ── One row of books + wood plank ──────────────────────────────────────── */
function ShelfRow({
  books,
  onOpen,
}: {
  books: BookItem[];
  onOpen: (b: BookItem) => void;
}) {
  return (
    <div>
      {/* Books standing */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "4px",
          padding: "0 6px",
          minHeight: "215px",
          position: "relative",
        }}
      >
        {books.map((b, i) => (
          <BookSpine key={i} book={b} onOpen={() => onOpen(b)} />
        ))}
      </div>

      {/* Wood plank */}
      <div
        style={{
          height: "24px",
          borderRadius: "2px 2px 5px 5px",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(180deg,#b07d45 0%,#9a6a35 12%,#885828 35%,#7a4f22 55%,#6b431c 75%,#5c3818 100%)",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.7),0 2px 6px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.22),inset 0 -2px 0 rgba(0,0,0,0.35)",
        }}
      >
        {/* Wood grain */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(90deg,transparent,transparent 55px,rgba(0,0,0,0.05) 55px,rgba(0,0,0,0.05) 58px,transparent 58px,transparent 80px,rgba(255,255,255,0.025) 80px,rgba(255,255,255,0.025) 81px)",
          }}
        />
        {/* Top highlight */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background:
              "linear-gradient(180deg,rgba(255,255,255,0.18),transparent)",
          }}
        />
      </div>

      {/* Drop shadow below plank */}
      <div
        style={{
          height: "18px",
          background:
            "linear-gradient(180deg,rgba(0,0,0,0.55),transparent)",
          marginBottom: "18px",
        }}
      />
    </div>
  );
}

/* ── Individual book spine ───────────────────────────────────────────────── */
function BookSpine({
  book,
  onOpen,
}: {
  book: BookItem;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const h = hashStr(book.title);
  const pal = PALETTES[h % PALETTES.length];
  const bookH = 152 + (h % 8) * 9;  // 152 – 215 px
  const bookW = 32 + (h % 6) * 4;   // 32 – 52 px

  const lift = () => {
    if (!ref.current) return;
    ref.current.style.transform = "translateY(-22px) scale(1.04)";
    ref.current.style.filter = "brightness(1.3)";
    ref.current.style.zIndex = "30";
  };
  const rest = () => {
    if (!ref.current) return;
    ref.current.style.transform = "translateY(0) scale(1)";
    ref.current.style.filter = "brightness(1)";
    ref.current.style.zIndex = "1";
  };

  return (
    <div
      ref={ref}
      onClick={onOpen}
      onMouseEnter={lift}
      onMouseLeave={rest}
      title={`${book.title}${book.author ? " — " + book.author : ""}`}
      style={{
        height: `${bookH}px`,
        width: `${bookW}px`,
        position: "relative",
        flexShrink: 0,
        cursor: "pointer",
        transition:
          "transform 0.22s cubic-bezier(0.34,1.56,0.64,1),filter 0.2s ease",
        transformOrigin: "bottom center",
        zIndex: 1,
      }}
    >
      {/* Left binding shadow */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "5px",
          background:
            "linear-gradient(to right,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.2) 100%)",
          borderRadius: "2px 0 0 2px",
          zIndex: 3,
        }}
      />

      {/* Spine face — cover image or coloured gradient */}
      {book.cover ? (
        <img
          src={book.cover}
          alt={book.title}
          loading="lazy"
          style={{
            position: "absolute",
            left: "5px",
            right: "4px",
            top: 0,
            bottom: 0,
            objectFit: "cover",
            width: `${bookW - 9}px`,
            height: "100%",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            left: "5px",
            right: "4px",
            top: 0,
            bottom: 0,
            background: `linear-gradient(150deg,${pal.a} 0%,${pal.b} 100%)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 4px",
            overflow: "hidden",
          }}
        >
          {/* Top accent rule */}
          <div
            style={{
              width: "55%",
              height: "2px",
              background: pal.accent,
              opacity: 0.65,
              borderRadius: "1px",
              flexShrink: 0,
            }}
          />

          {/* Vertical title text */}
          <span
            style={{
              writingMode: "vertical-lr",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
              fontSize: bookW > 40 ? "11px" : "10px",
              fontFamily: "Georgia,serif",
              fontWeight: 700,
              color: pal.text,
              lineHeight: 1.25,
              flex: 1,
              textAlign: "center",
              padding: "6px 0",
              maxHeight: `${bookH - 52}px`,
              overflow: "hidden",
              textShadow: "0 1px 6px rgba(0,0,0,0.6)",
              letterSpacing: "0.02em",
            }}
          >
            {book.title}
          </span>

          {/* Bottom accent rule */}
          <div
            style={{
              width: "55%",
              height: "2px",
              background: pal.accent,
              opacity: 0.65,
              borderRadius: "1px",
              flexShrink: 0,
            }}
          />
        </div>
      )}

      {/* Right pages edge — striped like real pages */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          borderRadius: "0 2px 2px 0",
          zIndex: 3,
          background:
            "repeating-linear-gradient(0deg,#d8cdb8 0px,#d8cdb8 3px,#c4b8a0 3px,#c4b8a0 4px)",
          boxShadow: "inset -1px 0 2px rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
function EmptyShelf({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border/60 text-center">
      <BookMarked className="h-10 w-10 text-muted-foreground/30 mb-3" />
      <h3 className="font-serif text-base font-semibold text-heading mb-1">
        No volumes found
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasFilters
          ? "Try clearing your search or selecting a different category."
          : "Add books via the books: frontmatter in any Markdown note."}
      </p>
      {hasFilters && (
        <button
          onClick={onReset}
          className="mt-4 text-xs font-medium text-garden underline underline-offset-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
