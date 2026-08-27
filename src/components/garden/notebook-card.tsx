"use client";

import React, { useState } from "react";
import type { BookItem } from "@/lib/notes";
import { parseCloudUrl } from "@/lib/cloud-pdf";
import { ExternalLink, BookOpen, Layers, Sparkles, ArrowUpRight } from "lucide-react";

interface NotebookCardProps {
  book: BookItem;
  onClick: () => void;
  index?: number;
}

// Curated hardcover spine colors if cover image is not provided
const FALLBACK_PALETTES = [
  { bg: "#86bfa8", text: "#1b332b", belly: "#c5ab8d" }, // mint sage
  { bg: "#363a3e", text: "#e8eaed", belly: "#be9e7f" }, // charcoal slate
  { bg: "#e65c36", text: "#ffffff", belly: "#ceb192" }, // burnt orange
  { bg: "#2d4a53", text: "#f0f4f5", belly: "#c4a98a" }, // deep ocean teal
  { bg: "#7e5265", text: "#ffffff", belly: "#cfb59d" }, // mulberry rose
  { bg: "#b58d3d", text: "#1e1808", belly: "#d4bc9e" }, // ochre gold
];

export function NotebookCard({ book, onClick, index = 0 }: NotebookCardProps) {
  const [imageError, setImageError] = useState(false);
  const palette = FALLBACK_PALETTES[index % FALLBACK_PALETTES.length];
  const cloudInfo = parseCloudUrl(book.link);

  const hasCoverImage = Boolean(book.cover && !imageError);
  const coverBg = book.color || palette.bg;

  const handleDirectLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (book.link) {
      window.open(book.link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex flex-col items-center cursor-pointer select-none py-6 px-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-garden"
    >
      {/* ── 3D STANDING NOTEBOOK CONTAINER ────────────────────────────────── */}
      <div className="relative w-48 sm:w-56 h-72 sm:h-80 flex items-center justify-center transition-all duration-500 transform group-hover:-translate-y-2.5 group-hover:rotate-[-0.5deg]">
        
        {/* Direct Link Icon Badge (Top Right) */}
        {book.link && (
          <button
            type="button"
            onClick={handleDirectLinkClick}
            className="absolute -top-2 -right-2 z-40 h-8 w-8 rounded-full bg-surface border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-garden hover:border-garden/50 hover:bg-garden/10 transition-all opacity-90 group-hover:opacity-100 group-hover:scale-110"
            title={`Open PDF directly in ${cloudInfo.providerName}`}
            aria-label="Open PDF in new tab"
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
        )}

        {/* Layer 1: Leftmost open parchment pages (peeking behind for realistic depth) */}
        <div
          className="absolute -left-3 sm:-left-4 top-3 bottom-4 w-12 rounded-l-xl rounded-r-md border border-black/10 dark:border-white/5 shadow-md transform -rotate-[2.5deg] transition-transform duration-500 group-hover:-rotate-[4deg] group-hover:-translate-x-1"
          style={{
            backgroundColor: "#f2ebd9",
            backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.08), rgba(255,255,255,0.4) 30%, rgba(0,0,0,0.03))",
          }}
        >
          {/* Faint subtle page edge lines */}
          <div className="h-full w-full flex flex-col justify-around py-3 px-1.5 opacity-25">
            <div className="h-px bg-black/40 w-3/4" />
            <div className="h-px bg-black/40 w-1/2" />
            <div className="h-px bg-black/40 w-4/5" />
            <div className="h-px bg-black/40 w-2/3" />
          </div>
        </div>

        {/* Layer 2: Right/Backing cream notebook pages block */}
        <div
          className="absolute -right-2 sm:-right-3 top-2.5 bottom-3.5 w-16 rounded-r-2xl rounded-l-sm border-r-2 border-y border-black/10 dark:border-white/5 shadow-lg transform rotate-[1.5deg] transition-transform duration-500 group-hover:rotate-[3deg] group-hover:translate-x-1"
          style={{
            backgroundColor: "#faf6ed",
            backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.04), rgba(255,255,255,0.6) 20%, rgba(0,0,0,0.08) 95%)",
          }}
        >
          {/* Subtle page rim lines */}
          <div className="absolute right-0 top-0 bottom-0 w-1.5 border-l border-black/5 flex flex-col justify-around py-2">
            <div className="h-full w-px bg-black/10 mx-auto" />
          </div>
        </div>

        {/* Layer 3: Main Standing Hardcover Book */}
        <div
          className="relative w-full h-full rounded-2xl rounded-l-md overflow-hidden shadow-2xl transition-all duration-500 border border-black/15 dark:border-white/10 flex flex-col group-hover:shadow-[0_20px_35px_-8px_rgba(0,0,0,0.4)]"
          style={{
            backgroundColor: coverBg,
          }}
        >
          {/* Spine crease / left spine shadow */}
          <div className="absolute left-0 top-0 bottom-0 w-4 z-20 pointer-events-none bg-gradient-to-r from-black/35 via-black/15 to-transparent border-r border-black/10" />

          {/* Top gloss specular highlight */}
          <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-white/20 opacity-80" />

          {hasCoverImage ? (
            /* ── ACTUAL BOOK COVER DISPLAY ────────────────────────────────── */
            <div className="relative w-full h-full bg-surface-2 flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={book.cover!}
                alt={book.title}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                loading="lazy"
              />

              {/* Spine texture overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/10 pointer-events-none" />

              {/* Bottom Subtle Caption Gradient */}
              <div className="absolute inset-x-0 bottom-0 pt-10 pb-3 px-3.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent z-10 flex flex-col justify-end">
                <span className="font-serif text-sm font-semibold text-white tracking-tight line-clamp-1 drop-shadow-md">
                  {book.title}
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-white/80 font-medium line-clamp-1">
                    {book.author || book.category || "Notebook"}
                  </span>
                  {book.pages && (
                    <span className="text-[9px] font-mono text-white/70 bg-white/15 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      {book.pages}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── FALLBACK NOTEBOOK COVER WITH KRAFT BELLY BAND ───────────── */
            <div
              className="relative w-full h-full flex flex-col justify-between p-4 z-0"
              style={{ color: palette.text }}
            >
              {/* Header Title Area */}
              <div className="pt-2 pl-2">
                <div className="text-[9px] uppercase tracking-widest font-mono opacity-70">
                  {book.category || "Notebook"}
                </div>
                <h3 className="font-serif text-base sm:text-lg font-bold leading-tight mt-1 tracking-tight">
                  {book.title}
                </h3>
                {book.author && (
                  <p className="text-xs opacity-80 mt-1 font-medium italic">
                    by {book.author}
                  </p>
                )}
              </div>

              {/* Kraft Paper Belly-Band Wrap across lower-middle */}
              <div
                className="relative -mx-4 my-auto py-3 px-4 shadow-md border-y border-black/10 z-10 flex flex-col justify-between"
                style={{
                  backgroundColor: palette.belly,
                  backgroundImage:
                    "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.06) 100%)",
                }}
              >
                {/* Kraft band header line sketch / badge */}
                <div className="flex items-center justify-between text-[#2d241e] border-b border-[#2d241e]/15 pb-1 mb-1.5">
                  <span className="text-[9px] uppercase font-bold tracking-wider font-mono">
                    {book.category || "Manuscript"}
                  </span>
                  <Layers className="h-3 w-3 opacity-60" />
                </div>

                <p className="text-[10px] text-[#3d3227] leading-relaxed line-clamp-2 italic font-serif">
                  {book.description || "Illustrated companion notebook & research derivations."}
                </p>

                {/* Kraft band footer */}
                <div className="mt-2 flex items-center justify-between text-[9px] text-[#2d241e]/70 font-mono">
                  <span>{book.pages || "Personal Notes"}</span>
                  <span className="font-semibold">{cloudInfo.providerName}</span>
                </div>
              </div>

              {/* Bottom Footer Stamp */}
              <div className="pb-1 pl-2 flex items-center justify-between opacity-70 text-[9px] font-mono">
                <span>{book.publishYear || "Garden Archive"}</span>
                <Sparkles className="h-3 w-3" />
              </div>
            </div>
          )}

          {/* Quick Click Hint Overlay on Hover */}
          <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2.5 p-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-garden px-3.5 py-1.5 text-xs font-semibold text-garden-foreground shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
              <BookOpen className="h-3.5 w-3.5" />
              View Book Details
            </span>
            {book.link && (
              <button
                type="button"
                onClick={handleDirectLinkClick}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-white/95 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full backdrop-blur-sm transition-colors"
              >
                <ArrowUpRight className="h-3 w-3 text-garden-foreground" />
                Open PDF Directly
              </button>
            )}
          </div>
        </div>

        {/* Layer 4: Stationery Pen at Base */}
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-40 sm:w-44 h-3 z-30 pointer-events-none drop-shadow-md">
          {/* Pen Body (Silver Metallic) */}
          <div className="relative h-2 w-full rounded-full bg-gradient-to-b from-gray-200 via-gray-100 to-gray-400 dark:from-zinc-400 dark:via-zinc-300 dark:to-zinc-600 shadow-sm flex items-center justify-between px-1">
            {/* Pen Clip */}
            <div className="absolute left-6 top-[-3px] w-8 h-[2px] bg-gradient-to-r from-gray-300 via-gray-50 to-gray-400 rounded-sm shadow-xs" />
            {/* Pen Tip (Left) */}
            <div className="w-2.5 h-1.5 rounded-l-full bg-gradient-to-r from-gray-500 to-gray-300" />
            {/* Middle Grip Ring */}
            <div className="w-5 h-2 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400" />
            {/* Pen Cap (Right) */}
            <div className="w-3 h-1.5 rounded-r-full bg-gradient-to-l from-gray-500 to-gray-300" />
          </div>
        </div>

        {/* Realistic Contact / Floor Drop Shadow */}
        <div className="absolute -bottom-5 left-2 right-2 h-4 rounded-[100%] bg-black/40 dark:bg-black/70 blur-md pointer-events-none transform scale-95 group-hover:scale-105 group-hover:bg-black/50 transition-all duration-500" />
      </div>

      {/* ── NOTEBOOK TITLE & METADATA LABELS (BELOW) ────────────────────── */}
      <div className="mt-6 text-center max-w-[210px] sm:max-w-[230px] w-full">
        <h4 className="font-serif text-sm font-semibold text-foreground group-hover:text-garden transition-colors line-clamp-2 leading-snug">
          {book.title}
        </h4>
        <div className="mt-1 flex items-center justify-center gap-1.5 flex-wrap text-xs text-muted-foreground">
          {book.author && <span className="truncate">{book.author}</span>}
          {book.author && book.category && <span className="opacity-40">·</span>}
          {book.category && (
            <span className="font-mono text-[10px] text-garden bg-garden/10 px-1.5 py-0.5 rounded">
              {book.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
