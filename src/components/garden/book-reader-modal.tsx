"use client";

import React, { useEffect, useState } from "react";
import type { BookItem } from "@/lib/notes";
import { parseCloudUrl } from "@/lib/cloud-pdf";
import {
  X,
  ExternalLink,
  BookOpen,
  FileText,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Cloud,
  Download,
  Tag,
  Calendar,
  Layers,
  ArrowUpRight,
} from "lucide-react";

interface BookReaderModalProps {
  book: BookItem | null;
  onClose: () => void;
}

export function BookReaderModal({ book, onClose }: BookReaderModalProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (book) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [book, onClose]);

  if (!book) return null;

  const cloud = parseCloudUrl(book.link);

  const copyCloudLink = async () => {
    try {
      await navigator.clipboard.writeText(book.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div
        className={`relative z-10 w-full bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen
            ? "h-[98vh] max-w-[98vw]"
            : "h-[90vh] max-h-[850px] max-w-5xl"
        }`}
      >
        {/* ── MODAL HEADER BAR ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-surface/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-garden/10 text-garden border border-garden/30 shrink-0">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-base sm:text-lg font-semibold text-heading truncate">
                {book.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {book.author && <span>{book.author}</span>}
                {book.category && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="font-mono text-garden">{book.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Direct Open Link Icon Button */}
            {book.link && (
              <a
                href={book.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-garden px-3 py-1.5 text-xs font-semibold text-garden-foreground shadow-sm hover:bg-garden-hover transition-colors"
                title={`Open PDF directly in ${cloud.providerName}`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open in {cloud.providerName}</span>
                <span className="sm:hidden">Open</span>
              </a>
            )}

            {/* Copy Link */}
            <button
              type="button"
              onClick={copyCloudLink}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy PDF / Cloud link"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-garden" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Toggle Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground transition-colors"
              title="Close modal (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── MODAL BODY: SPLIT VIEW ──────────────────────────────────── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border overflow-hidden">
          
          {/* ── LEFT PANE: BOOK DETAILS & METADATA ─────────────────────── */}
          <div className="lg:col-span-4 p-5 sm:p-6 overflow-y-auto space-y-6 bg-surface/30">
            {/* Book Cover Preview Thumbnail */}
            {book.cover && (
              <div className="relative w-full max-w-[200px] mx-auto aspect-[3/4] rounded-xl overflow-hidden shadow-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-xl pointer-events-none" />
              </div>
            )}

            {/* Title & Author Info */}
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-garden">
                {book.category || "Notebook & Reference"}
              </span>
              <h3 className="mt-1 font-serif text-xl sm:text-2xl font-bold text-heading leading-snug">
                {book.title}
              </h3>
              {book.author && (
                <p className="mt-1 text-sm text-muted-foreground font-medium">
                  By <span className="text-foreground">{book.author}</span>
                </p>
              )}
            </div>

            {/* Description / Summary */}
            {book.description && (
              <div className="rounded-xl border border-border/80 bg-surface/60 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-garden" />
                  Synopsis & Notes
                </h4>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {book.description}
                </p>
              </div>
            )}

            {/* Metadata Badges */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {book.pages && (
                <div className="rounded-lg border border-border bg-surface/40 p-2.5">
                  <div className="text-[10px] uppercase font-mono text-muted-foreground">
                    Volume
                  </div>
                  <div className="mt-0.5 font-medium text-foreground">
                    {book.pages}
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-border bg-surface/40 p-2.5">
                <div className="text-[10px] uppercase font-mono text-muted-foreground">
                  Storage
                </div>
                <div className="mt-0.5 font-medium text-foreground flex items-center gap-1">
                  <Cloud className="h-3 w-3 text-garden" />
                  {cloud.providerName}
                </div>
              </div>
            </div>

            {/* Tags */}
            {book.tags && book.tags.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-mono text-muted-foreground mb-2">
                  Keywords & Subjects
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {book.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 font-mono text-xs rounded-md bg-surface-2 px-2 py-0.5 text-garden/90 border border-border"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons Box */}
            <div className="pt-2 space-y-2">
              <a
                href={book.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-garden px-4 py-2.5 text-sm font-semibold text-garden-foreground hover:bg-garden-hover shadow-md transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open in {cloud.providerName}
              </a>

              {cloud.downloadUrl && (
                <a
                  href={cloud.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-garden/40 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Source Document
                </a>
              )}
            </div>
          </div>

          {/* ── RIGHT PANE: EMBEDDED PDF READER ────────────────────────── */}
          <div className="lg:col-span-8 bg-surface-2 flex flex-col min-h-[350px] lg:min-h-0 relative">
            {cloud.embedUrl ? (
              <div className="relative w-full h-full flex-1">
                {!iframeLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface z-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-garden border-t-transparent" />
                    <p className="text-xs font-mono text-muted-foreground">
                      Loading {cloud.providerName} reader…
                    </p>
                  </div>
                )}
                <iframe
                  src={cloud.embedUrl}
                  title={book.title}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                  onLoad={() => setIframeLoaded(true)}
                />
              </div>
            ) : (
              /* Cloud fallback when direct iframe embed is restricted by provider */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-garden/10 border border-garden/30 text-garden flex items-center justify-center shadow-lg">
                  <Cloud className="h-8 w-8" />
                </div>
                <div className="max-w-md">
                  <h4 className="font-serif text-lg font-semibold text-heading">
                    Document hosted on {cloud.providerName}
                  </h4>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    This manuscript or notebook is securely hosted on {cloud.providerName}. Click below to view the original PDF document in full resolution.
                  </p>
                </div>
                <a
                  href={book.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-garden px-5 py-2.5 text-sm font-semibold text-garden-foreground hover:bg-garden-hover shadow-md transition-all transform hover:scale-105"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on {cloud.providerName}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
