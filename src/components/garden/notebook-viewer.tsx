"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { NotebookManifest, NotebookPage, PaperTheme } from "@/lib/notes";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Volume2,
  VolumeX,
  BookOpen,
  FileText,
  Layers,
  Palette,
  Columns,
  Square,
  Search,
  Sparkles,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { NotebookTranscript } from "./notebook-transcript";

interface NotebookViewerProps {
  manifest: NotebookManifest;
  noteTitle: string;
  noteContent?: string;
  noteHtml?: string;
  onToggleViewMode?: () => void;
}

// ----------------------------------------------------------------------------
// Procedural Web Audio Paper Rustle Synthesizer (0KB Assets)
// ----------------------------------------------------------------------------
function playPaperRustleSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const bufferSize = ctx.sampleRate * 0.12; // 120ms burst
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Pink-ish noise
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Bandpass filter centered around paper friction frequencies
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1600 + Math.random() * 400;
    filter.Q.value = 2.5;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseNode.start();
    noiseNode.onended = () => ctx.close();
  } catch {
    // AudioContext blocked or not supported
  }
}

const THEME_STYLES: Record<
  PaperTheme,
  { name: string; pageBg: string; wrapperBg: string; inkFilter: string; overlayCss?: string }
> = {
  "clean-white": {
    name: "Clean White",
    pageBg: "#ffffff",
    wrapperBg: "#0f0f12",
    inkFilter: "none",
  },
  "warm-grid": {
    name: "Warm Grid",
    pageBg: "#fbf8f1",
    wrapperBg: "#121110",
    inkFilter: "none",
    overlayCss:
      "radial-gradient(#0000000d 1px, transparent 1px), linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)",
  },
  "sepia-ruled": {
    name: "Sepia Ruled",
    pageBg: "#f4ecd8",
    wrapperBg: "#171411",
    inkFilter: "none",
    overlayCss: "repeating-linear-gradient(to bottom, transparent, transparent 26px, rgba(140, 95, 50, 0.1) 27px)",
  },
  "dark-ink": {
    name: "Dark Ink",
    pageBg: "#161619",
    wrapperBg: "#0a0a0c",
    inkFilter: "invert(0.92) hue-rotate(180deg) contrast(1.15) brightness(1.05)",
  },
};

export function NotebookViewer({
  manifest,
  noteTitle,
  noteContent,
  noteHtml,
  onToggleViewMode,
}: NotebookViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const totalPages = manifest.pages.length;

  // Saved page position or URL hash initial page
  const getInitialPage = (): number => {
    if (typeof window !== "undefined") {
      const hashMatch = window.location.hash.match(/#page=(\d+)/);
      if (hashMatch) {
        const p = parseInt(hashMatch[1], 10);
        if (p >= 1 && p <= totalPages) return p;
      }
      const saved = localStorage.getItem(`notebook_page_${manifest.slug}`);
      if (saved) {
        const p = parseInt(saved, 10);
        if (p >= 1 && p <= totalPages) return p;
      }
    }
    return 1;
  };

  const [currentPage, setCurrentPage] = useState<number>(getInitialPage);
  const [theme, setTheme] = useState<PaperTheme>(manifest.theme || "warm-grid");
  const [isDualSpread, setIsDualSpread] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isZoomMode, setIsZoomMode] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1.5);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [showScrubber, setShowScrubber] = useState<boolean>(true);
  const [isFlipping, setIsFlipping] = useState<"left" | "right" | null>(null);

  // Responsive spread detection: mobile (<768px) switches to single page
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsDualSpread(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync current page with URL hash and localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`notebook_page_${manifest.slug}`, String(currentPage));
    const newHash = `#page=${currentPage}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", newHash);
    }
  }, [currentPage, manifest.slug]);

  // Turn page logic
  const turnNext = useCallback(() => {
    const step = isDualSpread && currentPage > 1 ? 2 : 1;
    if (currentPage < totalPages) {
      if (soundEnabled) playPaperRustleSound();
      setIsFlipping("right");
      setTimeout(() => setIsFlipping(null), 300);
      setCurrentPage((prev) => Math.min(totalPages, prev + step));
    }
  }, [currentPage, totalPages, isDualSpread, soundEnabled]);

  const turnPrev = useCallback(() => {
    const step = isDualSpread && currentPage > 2 ? 2 : 1;
    if (currentPage > 1) {
      if (soundEnabled) playPaperRustleSound();
      setIsFlipping("left");
      setTimeout(() => setIsFlipping(null), 300);
      setCurrentPage((prev) => Math.max(1, prev - step));
    }
  }, [currentPage, isDualSpread, soundEnabled]);

  const goToPage = useCallback(
    (page: number) => {
      const valid = Math.max(1, Math.min(totalPages, page));
      if (valid !== currentPage) {
        if (soundEnabled) playPaperRustleSound();
        setCurrentPage(valid);
      }
    },
    [currentPage, totalPages, soundEnabled]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          turnNext();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          turnPrev();
          break;
        case "Home":
          e.preventDefault();
          goToPage(1);
          break;
        case "End":
          e.preventDefault();
          goToPage(totalPages);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "z":
        case "Z":
          e.preventDefault();
          setIsZoomMode((prev) => !prev);
          break;
        case "t":
        case "T":
          e.preventDefault();
          setShowTranscript((prev) => !prev);
          break;
        case "m":
        case "M":
          e.preventDefault();
          cycleTheme();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [turnNext, turnPrev, goToPage, totalPages]);

  // Theme cycle
  const cycleTheme = useCallback(() => {
    const themes: PaperTheme[] = ["clean-white", "warm-grid", "sepia-ruled", "dark-ink"];
    setTheme((prev) => {
      const nextIdx = (themes.indexOf(prev) + 1) % themes.length;
      return themes[nextIdx];
    });
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Pan & Zoom mouse drag handlers
  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (!isZoomMode) return;
    setIsDraggingPan(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handlePanMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPan || !isZoomMode) return;
    setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handlePanMouseUp = () => setIsDraggingPan(false);

  // Active spread computation
  // In dual-page mode:
  // Page 1 is cover (right page alone).
  // Pages 2-3, 4-5, 6-7 are dual spreads.
  const spreadPages = useMemo<{ left: NotebookPage | null; right: NotebookPage | null }>(() => {
    if (!isDualSpread) {
      const p = manifest.pages.find((page) => page.pageNumber === currentPage) || manifest.pages[0];
      return { left: null, right: p };
    }

    if (currentPage === 1) {
      const cover = manifest.pages.find((p) => p.pageNumber === 1) || manifest.pages[0];
      return { left: null, right: cover };
    }

    // Ensure left page is even and right page is odd
    const leftNum = currentPage % 2 === 0 ? currentPage : currentPage - 1;
    const rightNum = leftNum + 1;

    const leftPage = manifest.pages.find((p) => p.pageNumber === leftNum) || null;
    const rightPage = manifest.pages.find((p) => p.pageNumber === rightNum) || null;

    return { left: leftPage, right: rightPage };
  }, [currentPage, isDualSpread, manifest.pages]);

  const activeTheme = THEME_STYLES[theme];

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col select-none rounded-xl border border-border/70 overflow-hidden shadow-2xl transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-none" : "w-full my-4"
      }`}
      style={{ backgroundColor: activeTheme.wrapperBg }}
    >
      {/* ── Top Bar / Controls ────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-surface/80 px-4 py-2.5 backdrop-blur-md z-30">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-garden/15 text-garden font-serif font-bold text-xs border border-garden/30">
            {manifest.pageCount}p
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-sm font-semibold truncate text-heading">
              {noteTitle}
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground/80">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Article View Toggle */}
          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-garden/40 transition-colors"
              title="Switch to Reading Article View"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Article</span>
            </button>
          )}

          {/* Transcript split drawer toggle */}
          <button
            onClick={() => setShowTranscript((prev) => !prev)}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors ${
              showTranscript
                ? "border-garden bg-garden/15 text-garden font-medium"
                : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle Synced Notes & KaTeX Equations (T)"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Transcript</span>
          </button>

          {/* Dual / Single Spread toggle */}
          <button
            onClick={() => setIsDualSpread((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title={isDualSpread ? "Switch to Single Page Mode" : "Switch to Dual Page Spread"}
          >
            {isDualSpread ? <Columns className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          </button>

          {/* Paper Theme selector */}
          <button
            onClick={cycleTheme}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title={`Cycle Paper Theme: ${activeTheme.name} (M)`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{activeTheme.name}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground hover:text-foreground transition-colors"
            title={soundEnabled ? "Mute Paper Sound (S)" : "Enable Paper Sound (S)"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-garden" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          {/* HiDPI Zoom Toggle */}
          <button
            onClick={() => {
              setIsZoomMode((prev) => !prev);
              setPanOffset({ x: 0, y: 0 });
            }}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
              isZoomMode
                ? "border-garden bg-garden/15 text-garden font-medium"
                : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
            }`}
            title="HiDPI Pan & Zoom Mode (Z)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Zoom</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      {/* ── Main Book Stage ───────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-row overflow-hidden min-h-[480px] sm:min-h-[580px] lg:min-h-[660px]">
        <div
          className={`relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden transition-all duration-300 ${
            isZoomMode ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          onMouseDown={handlePanMouseDown}
          onMouseMove={handlePanMouseMove}
          onMouseUp={handlePanMouseUp}
        >
          {/* Flipbook 3D Container */}
          <div
            className={`relative flex items-center justify-center transition-transform duration-200 ease-out ${
              isFlipping === "right" ? "rotate-y-[-2deg]" : isFlipping === "left" ? "rotate-y-[2deg]" : ""
            }`}
            style={{
              perspective: 2200,
              transform: isZoomMode
                ? `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`
                : "none",
            }}
          >
            {/* Dual / Single Spread Book */}
            <div
              className={`flex items-center shadow-2xl rounded-sm transition-all duration-300 relative ${
                isDualSpread ? "max-w-[1200px]" : "max-w-[650px]"
              }`}
              style={{
                boxShadow:
                  "0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 20px rgba(0,0,0,0.1)",
              }}
            >
              {/* Left Page (in Dual Spread) */}
              {isDualSpread && (
                <div
                  className="relative flex-1 overflow-hidden border-r border-black/15 shadow-inner"
                  style={{
                    backgroundColor: activeTheme.pageBg,
                    aspectRatio: String(manifest.aspectRatio || 0.707),
                    minWidth: "280px",
                    maxWidth: "580px",
                  }}
                >
                  {spreadPages.left ? (
                    <PageRenderer
                      page={spreadPages.left}
                      theme={theme}
                      isZoomMode={isZoomMode}
                      activeTheme={activeTheme}
                      side="left"
                    />
                  ) : (
                    // Blank left side when viewing Cover (Page 1)
                    <div className="w-full h-full flex items-center justify-center bg-black/10 text-muted-foreground/30 font-serif italic text-sm">
                      Inside Cover
                    </div>
                  )}
                  {/* Spine Fold Shadow Overlay on Left Page */}
                  <div
                    className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10"
                    style={{
                      background: "linear-gradient(to left, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.04) 70%, transparent 100%)",
                    }}
                  />
                </div>
              )}

              {/* Book Spine (Dual Mode) */}
              {isDualSpread && (
                <div
                  className="w-1.5 self-stretch z-20 shadow-md"
                  style={{
                    background: "linear-gradient(to right, rgba(0,0,0,0.4), rgba(255,255,255,0.1), rgba(0,0,0,0.4))",
                  }}
                />
              )}

              {/* Right Page */}
              <div
                className="relative flex-1 overflow-hidden shadow-inner"
                style={{
                  backgroundColor: activeTheme.pageBg,
                  aspectRatio: String(manifest.aspectRatio || 0.707),
                  minWidth: "280px",
                  maxWidth: isDualSpread ? "580px" : "650px",
                }}
              >
                {spreadPages.right ? (
                  <PageRenderer
                    page={spreadPages.right}
                    theme={theme}
                    isZoomMode={isZoomMode}
                    activeTheme={activeTheme}
                    side={isDualSpread ? "right" : "single"}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                    End of Notebook
                  </div>
                )}
                {/* Spine Fold Shadow Overlay on Right Page */}
                {isDualSpread && (
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-8 z-10"
                    style={{
                      background: "linear-gradient(to right, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.04) 70%, transparent 100%)",
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Navigation Overlay Arrows */}
          <button
            onClick={turnPrev}
            disabled={currentPage <= 1}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-border/60 bg-surface/80 text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-garden hover:text-garden-foreground hover:scale-105 disabled:opacity-0 disabled:pointer-events-none"
            aria-label="Previous Page"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <button
            onClick={turnNext}
            disabled={currentPage >= totalPages}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-border/60 bg-surface/80 text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-garden hover:text-garden-foreground hover:scale-105 disabled:opacity-0 disabled:pointer-events-none"
            aria-label="Next Page"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Zoom Level Controller in Zoom Mode */}
          {isZoomMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 backdrop-blur-md shadow-xl">
              <button
                onClick={() => setZoomScale((z) => Math.max(1, z - 0.25))}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="font-mono text-xs font-medium text-foreground w-12 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale((z) => Math.min(3.5, z + 0.25))}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setZoomScale(1.5);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="p-1 rounded text-muted-foreground hover:text-garden ml-1"
                title="Reset Pan & Zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ── Synced Markdown & KaTeX Split View Drawer ────────────────── */}
        {showTranscript && (
          <aside className="w-full sm:w-[380px] lg:w-[440px] border-l border-border/60 bg-surface/95 backdrop-blur-xl flex flex-col z-30 shadow-2xl garden-fade-in">
            <NotebookTranscript
              title={noteTitle}
              content={noteContent}
              html={noteHtml}
              currentPage={currentPage}
              onJumpToPage={goToPage}
              onClose={() => setShowTranscript(false)}
            />
          </aside>
        )}
      </div>

      {/* ── Bottom Thumbnail Scrubber & Page Bar ─────────────────────── */}
      <footer className="border-t border-border/40 bg-surface/90 px-4 py-2 z-20">
        <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
          {/* Page slider */}
          <div className="flex-1 flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground w-8 text-right">
              {currentPage}
            </span>
            <input
              type="range"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-garden"
            />
            <span className="font-mono text-xs text-muted-foreground w-8">
              {totalPages}
            </span>
          </div>

          {/* Quick chapter scrubber toggle */}
          <button
            onClick={() => setShowScrubber((prev) => !prev)}
            className="text-xs font-mono text-muted-foreground hover:text-garden transition-colors"
          >
            {showScrubber ? "Hide Thumbs" : "Show Thumbs"}
          </button>
        </div>

        {/* Thumbnail Carousel */}
        {showScrubber && (
          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto py-2 scrollbar-thin max-w-5xl mx-auto">
            {manifest.pages.map((p) => {
              const isSelected =
                isDualSpread && currentPage > 1
                  ? p.pageNumber === spreadPages.left?.pageNumber ||
                    p.pageNumber === spreadPages.right?.pageNumber
                  : p.pageNumber === currentPage;

              return (
                <button
                  key={p.pageNumber}
                  onClick={() => goToPage(p.pageNumber)}
                  className={`relative flex-shrink-0 rounded-md overflow-hidden border transition-all duration-200 group ${
                    isSelected
                      ? "border-garden ring-2 ring-garden/40 scale-105 z-10"
                      : "border-border/60 hover:border-garden/50 opacity-70 hover:opacity-100"
                  }`}
                  style={{ width: "48px", height: "64px" }}
                  title={`Page ${p.pageNumber}`}
                >
                  <img
                    src={p.thumb}
                    alt={`Thumbnail page ${p.pageNumber}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-mono text-white text-center py-0.5">
                    {p.pageNumber}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </footer>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Page Renderer with Invisible OCR Text Layer Overlay
// ----------------------------------------------------------------------------
function PageRenderer({
  page,
  theme,
  isZoomMode,
  activeTheme,
  side,
}: {
  page: NotebookPage;
  theme: PaperTheme;
  isZoomMode: boolean;
  activeTheme: typeof THEME_STYLES[PaperTheme];
  side: "left" | "right" | "single";
}) {
  const imgSrc = isZoomMode ? page.image2x : page.image;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background paper texture/grid overlay */}
      {activeTheme.overlayCss && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{ backgroundImage: activeTheme.overlayCss }}
        />
      )}

      {/* Main Handwritten Page Image */}
      <img
        src={imgSrc}
        alt={`Notebook page ${page.pageNumber}`}
        className="w-full h-full object-contain relative z-1 select-none pointer-events-none transition-filter duration-300"
        style={{ filter: activeTheme.inkFilter }}
        loading="eager"
      />

      {/* Invisible OCR / Text Selection Layer Overlay */}
      {page.textLayer && page.textLayer.length > 0 && (
        <div className="absolute inset-0 z-10 pointer-events-auto cursor-text select-text">
          {page.textLayer.map((item, idx) => (
            <span
              key={idx}
              className="absolute text-transparent select-text hover:bg-garden/20 selection:bg-garden/30 selection:text-foreground/90 transition-colors"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}%`,
                height: `${item.height}%`,
                fontSize: "12px",
                lineHeight: "1",
                display: "inline-block",
              }}
              title={item.text}
            >
              {item.text}
            </span>
          ))}
        </div>
      )}

      {/* Page number badge */}
      <span className="absolute bottom-2 inset-x-0 text-center font-mono text-[10px] text-black/30 dark:text-white/30 pointer-events-none z-10">
        {page.pageNumber}
      </span>
    </div>
  );
}
