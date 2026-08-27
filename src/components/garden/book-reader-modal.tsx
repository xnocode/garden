"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  ArrowUpRight,
  RefreshCw,
  Eye,
  Layers,
  Sparkles,
} from "lucide-react";

interface BookReaderModalProps {
  book: BookItem | null;
  onClose: () => void;
}

export function BookReaderModal({ book, onClose }: BookReaderModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [coverError, setCoverError] = useState(false);
  const [activeTab, setActiveTab] = useState<"reader" | "details">("reader");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape & Lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (book) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      setIframeLoaded(false);
      setCoverError(false);
      setIframeKey((k) => k + 1);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [book, onClose]);

  if (!mounted || !book) return null;

  const cloud = parseCloudUrl(book.link);
  const directLink = cloud.directPdfUrl || book.link;
  const hasValidCover = Boolean(book.cover && !coverError);
  const coverBg = book.color || "#363a3e";

  const copyCloudLink = async () => {
    try {
      await navigator.clipboard.writeText(book.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const openDirectLink = () => {
    if (directLink) {
      window.open(directLink, "_blank", "noopener,noreferrer");
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card Container */}
      <div
        className={`relative z-10 w-full bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen
            ? "h-[98vh] max-w-[98vw]"
            : "h-[88vh] max-h-[850px] max-w-6xl"
        }`}
      >
        {/* ── MODAL HEADER BAR ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-surface/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-garden/10 text-garden border border-garden/30 shrink-0 shadow-xs">
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
                {book.pages && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="font-mono text-[11px]">{book.pages}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile View Toggle */}
            <div className="flex lg:hidden rounded-lg border border-border bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("reader")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeTab === "reader"
                    ? "bg-garden text-garden-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeTab === "details"
                    ? "bg-garden text-garden-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Details
              </button>
            </div>

            {/* Direct Open Link Icon Button */}
            <button
              type="button"
              onClick={openDirectLink}
              className="inline-flex items-center gap-1.5 rounded-lg bg-garden px-3 py-1.5 text-xs font-semibold text-garden-foreground shadow-sm hover:bg-garden-hover transition-colors"
              title={`Open PDF directly in ${cloud.providerName}`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open in {cloud.providerName}</span>
              <span className="sm:hidden">Open</span>
            </button>

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
          
          {/* ── LEFT PANE: BOOK DETAILS, SYNOPSIS & SIDE LINK PANEL ────── */}
          <div
            className={`lg:col-span-4 p-5 sm:p-6 overflow-y-auto space-y-6 bg-surface/30 ${
              activeTab === "details" ? "block" : "hidden lg:block"
            }`}
          >
            {/* Book Cover Preview Thumbnail or Styled Hardcover Fallback */}
            <div className="relative w-full max-w-[190px] mx-auto aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border border-border bg-surface-2 flex flex-col">
              {hasValidCover ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={book.cover!}
                    alt={book.title}
                    referrerPolicy="no-referrer"
                    onError={() => setCoverError(true)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-2xl pointer-events-none" />
                </>
              ) : (
                <div
                  className="w-full h-full p-4 flex flex-col justify-between text-white"
                  style={{ backgroundColor: coverBg }}
                >
                  <div className="w-2.5 h-full absolute left-0 top-0 bottom-0 bg-black/25 pointer-events-none" />
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-mono opacity-80">
                      {book.category || "Notebook"}
                    </span>
                    <h4 className="font-serif text-sm font-bold leading-tight mt-1 line-clamp-3">
                      {book.title}
                    </h4>
                  </div>
                  <div className="py-2 px-3 rounded-lg bg-black/20 backdrop-blur-xs text-[10px] space-y-1">
                    <p className="line-clamp-2 italic opacity-90">
                      {book.description || "Manuscript & Derivations"}
                    </p>
                    <div className="flex items-center justify-between text-[9px] font-mono opacity-75">
                      <span>{book.pages || "Notes"}</span>
                      <span>{book.author || "Archive"}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono opacity-70">
                    <span>Garden Library</span>
                    <Sparkles className="h-3 w-3" />
                  </div>
                </div>
              )}
            </div>

            {/* ── PROMINENT SIDE LINK ICON BOX ──────────────────────────── */}
            <div className="rounded-2xl border border-garden/30 bg-garden/10 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-garden flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5" />
                  {cloud.providerName}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  PDF Document
                </span>
              </div>

              <button
                type="button"
                onClick={openDirectLink}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-garden px-4 py-2.5 text-xs sm:text-sm font-semibold text-garden-foreground hover:bg-garden-hover shadow-md transition-all transform hover:scale-[1.02]"
              >
                <ArrowUpRight className="h-4 w-4" />
                Open PDF in {cloud.providerName}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyCloudLink}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-garden/40 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-garden" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Link
                    </>
                  )}
                </button>

                {cloud.downloadUrl && (
                  <a
                    href={cloud.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-garden/40 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                )}
              </div>
            </div>

            {/* Title & Author Info */}
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-garden">
                {book.category || "Notebook & Reference"}
              </span>
              <h3 className="mt-1 font-serif text-xl font-bold text-heading leading-snug">
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
          </div>

          {/* ── RIGHT PANE: EMBEDDED PDF READER & CLOUD PREVIEW ───────── */}
          <div
            className={`lg:col-span-8 bg-surface-2 flex flex-col min-h-0 h-full relative ${
              activeTab === "reader" ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Top Reader Status Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-surface/70 border-b border-border text-xs text-muted-foreground shrink-0">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <Eye className="h-3.5 w-3.5 text-garden" />
                <span>PDF Document Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIframeLoaded(false);
                    setIframeKey((k) => k + 1);
                  }}
                  className="hover:text-foreground inline-flex items-center gap-1 text-[11px]"
                  title="Reload viewer"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reload
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={openDirectLink}
                  className="text-garden hover:underline inline-flex items-center gap-1 font-medium text-[11px]"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in New Tab
                </button>
              </div>
            </div>

            {/* Embedded Iframe Reader */}
            {cloud.embedUrl ? (
              <div className="relative w-full h-full flex-1 min-h-0">
                {!iframeLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface z-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-garden border-t-transparent" />
                    <p className="text-xs font-mono text-muted-foreground">
                      Connecting to {cloud.providerName} reader…
                    </p>
                    <button
                      type="button"
                      onClick={openDirectLink}
                      className="mt-2 text-xs text-garden underline font-medium"
                    >
                      Click here to open directly in {cloud.providerName}
                    </button>
                  </div>
                )}
                <iframe
                  key={iframeKey}
                  src={cloud.embedUrl}
                  title={book.title}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media; fullscreen; clipboard-read; clipboard-write;"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                  onLoad={() => setIframeLoaded(true)}
                />
              </div>
            ) : (
              /* Cloud fallback if embed is restricted */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-garden/10 border border-garden/30 text-garden flex items-center justify-center shadow-lg">
                  <Cloud className="h-8 w-8" />
                </div>
                <div className="max-w-md">
                  <h4 className="font-serif text-lg font-semibold text-heading">
                    Document hosted on {cloud.providerName}
                  </h4>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    This manuscript or notebook is securely hosted on {cloud.providerName}. Click below to open and view the original PDF document in full resolution.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openDirectLink}
                  className="inline-flex items-center gap-2 rounded-xl bg-garden px-5 py-2.5 text-sm font-semibold text-garden-foreground hover:bg-garden-hover shadow-md transition-all transform hover:scale-105"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on {cloud.providerName}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
