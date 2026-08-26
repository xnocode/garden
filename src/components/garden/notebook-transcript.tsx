"use client";

import React, { useState, useMemo } from "react";
import { X, Search, Sparkles, BookOpen, ArrowRight, Hash } from "lucide-react";

interface NotebookTranscriptProps {
  title: string;
  content?: string;
  html?: string;
  currentPage: number;
  onJumpToPage: (page: number) => void;
  onClose: () => void;
}

export function NotebookTranscript({
  title,
  content = "",
  html = "",
  currentPage,
  onJumpToPage,
  onClose,
}: NotebookTranscriptProps) {
  const [filterQuery, setFilterQuery] = useState("");

  // Parse page sections if content includes ## Page N or Page N markers
  const pageSections = useMemo(() => {
    if (!content) return [];
    const lines = content.split("\n");
    const sections: { pageNum?: number; title: string; body: string }[] = [];
    let currentTitle = "Introduction";
    let currentPageNum: number | undefined = undefined;
    let currentBody: string[] = [];

    for (const line of lines) {
      const pageMatch = line.match(/^#{1,3}\s+(?:Page\s+(\d+)|p\.?(\d+))/i);
      if (pageMatch) {
        if (currentBody.length > 0 || currentTitle !== "Introduction") {
          sections.push({
            pageNum: currentPageNum,
            title: currentTitle,
            body: currentBody.join("\n").trim(),
          });
        }
        currentPageNum = parseInt(pageMatch[1] || pageMatch[2], 10);
        currentTitle = line.replace(/^#{1,3}\s+/, "").trim();
        currentBody = [];
      } else {
        currentBody.push(line);
      }
    }

    if (currentBody.length > 0) {
      sections.push({
        pageNum: currentPageNum,
        title: currentTitle,
        body: currentBody.join("\n").trim(),
      });
    }

    return sections;
  }, [content]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface text-foreground">
      {/* Drawer Header */}
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 bg-surface-2/40">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-garden flex-shrink-0" />
          <h3 className="font-serif font-semibold text-sm truncate text-heading">
            Transcript & Notes
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          aria-label="Close transcript"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Filter / Search Bar */}
      <div className="p-3 border-b border-border/40 bg-surface/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transcript & formulas…"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-garden/50 focus:ring-1 focus:ring-garden/50"
          />
        </div>
      </div>

      {/* Transcript Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {pageSections.length > 0 ? (
          pageSections
            .filter((sec) =>
              filterQuery
                ? sec.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
                  sec.body.toLowerCase().includes(filterQuery.toLowerCase())
                : true
            )
            .map((sec, idx) => {
              const isActive = sec.pageNum === currentPage;

              return (
                <section
                  key={idx}
                  className={`rounded-lg border p-3.5 transition-all duration-200 ${
                    isActive
                      ? "border-garden bg-garden/10 ring-1 ring-garden/30"
                      : "border-border/60 bg-surface-2/30 hover:border-garden/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-serif text-sm font-semibold text-heading flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-garden/70" />
                      {sec.title}
                    </h4>
                    {sec.pageNum && (
                      <button
                        onClick={() => onJumpToPage(sec.pageNum!)}
                        className={`inline-flex items-center gap-1 text-[11px] font-mono rounded px-2 py-0.5 border transition-colors ${
                          isActive
                            ? "border-garden/40 bg-garden/20 text-garden font-medium"
                            : "border-border text-muted-foreground hover:text-garden hover:border-garden/40"
                        }`}
                        title={`Jump flipbook to Page ${sec.pageNum}`}
                      >
                        Page {sec.pageNum}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                    {sec.body}
                  </div>
                </section>
              );
            })
        ) : (
          <div
            className="garden-prose text-xs leading-relaxed max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      {/* Drawer Footer */}
      <footer className="border-t border-border px-4 py-2.5 bg-surface-2/40 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Active: Page {currentPage}</span>
        <span className="font-mono text-[10px]">Synced KaTeX & Markdown</span>
      </footer>
    </div>
  );
}
