"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Maximize2, Minimize2, ExternalLink, BookOpen, Download, Sparkles } from "lucide-react";
import type { BookItem } from "@/lib/notes";

interface PDFModalViewerProps {
  book: BookItem | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Transforms standard Google Drive or cloud links to their optimal embedded stream viewer URL.
 */
export function getEmbeddablePdfUrl(url: string): { embedUrl: string; isGoogleDrive: boolean; rawUrl: string } {
  if (!url) return { embedUrl: "", isGoogleDrive: false, rawUrl: "" };
  const trimmed = url.trim();

  // 1. Google Drive URLs
  const gdriveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch) {
    const fileId = gdriveMatch[1];
    return {
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      isGoogleDrive: true,
      rawUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    };
  }

  // 2. Dropbox Links (change ?dl=0 to ?raw=1 for embedded viewer)
  if (trimmed.includes("dropbox.com")) {
    const rawUrl = trimmed.replace(/[?&]dl=0/i, "").replace(/[?&]dl=1/i, "");
    return {
      embedUrl: `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}raw=1`,
      isGoogleDrive: false,
      rawUrl: trimmed,
    };
  }

  // 3. Generic Cloud PDF Link
  return {
    embedUrl: trimmed,
    isGoogleDrive: false,
    rawUrl: trimmed,
  };
}

export function PDFModalViewer({ book, isOpen, onClose }: PDFModalViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setIsLoading(true);
    } else {
      document.body.style.overflow = "";
      setIsFullscreen(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !book) return null;

  const { embedUrl, isGoogleDrive, rawUrl } = getEmbeddablePdfUrl(book.link);

  const toggleFullscreen = () => {
    if (!modalRef.current) return;
    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md garden-fade-in animate-in fade-in duration-200">
      {/* Modal Dialog Container */}
      <div
        ref={modalRef}
        className={`flex flex-col w-full bg-background border border-border/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen ? "fixed inset-0 rounded-none border-none h-screen" : "max-w-6xl h-[92vh]"
        }`}
      >
        {/* Header Bar */}
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface/90 backdrop-blur-md z-10 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-garden/15 text-garden ring-1 ring-garden/30 flex-shrink-0">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-sm sm:text-base font-semibold truncate text-heading">
                {book.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {book.author && <span>{book.author}</span>}
                {book.category && (
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-garden">
                    {book.category}
                  </span>
                )}
                {isGoogleDrive && (
                  <span className="hidden sm:inline text-[10px] text-muted-foreground/70">
                    • Google Drive PDF
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Open Original Drive / Cloud Link */}
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-garden/40 transition-colors"
              title="Open directly in Google Drive or source tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isGoogleDrive ? "Open in Drive" : "Open Link"}
              </span>
            </a>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface/60 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              title="Close reader (Esc)"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* PDF Frame / Viewer Stage */}
        <div className="relative flex-1 w-full bg-surface-2/30 overflow-hidden">
          {/* Loading Placeholder */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/50 backdrop-blur-sm z-0">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-garden border-t-transparent" />
              <p className="text-xs font-mono text-muted-foreground">Streaming manuscript PDF…</p>
            </div>
          )}

          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={book.title}
              className="w-full h-full border-0 relative z-10"
              allow="autoplay; fullscreen"
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm text-muted-foreground">No valid PDF or Drive link provided.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
