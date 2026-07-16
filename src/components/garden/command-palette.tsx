"use client";

import { useEffect, useRef, useState, useCallback, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Hash, CornerDownLeft, X, Zap } from "lucide-react";
import { useUIStore } from "@/lib/ui-store";
import FlexSearch from "flexsearch";

interface IndexEntry {
  slug: string;
  title: string;
  description: string | null;
  tags: string[];
  path: string;
  wordCount: number;
  publishDate: string | null;
}

interface SearchResult {
  slug: string;
  title: string;
  description: string | null;
  tags: string[];
  snippet: string;
  path: string;
}

// Module-level cache: the Flexsearch index is built once per session.
// Eagerly starts loading on first import so it's ready by the time the
// user opens the palette.
let indexPromise: Promise<{
  index: any;
  entries: Map<string, IndexEntry>;
}> | null = null;

async function loadIndex() {
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    const res = await fetch("/api/search-index");
    if (!res.ok) throw new Error("failed to load search index");
    const data = await res.json();
    const entries = new Map<string, IndexEntry>();
    const index = new FlexSearch.Document({
      tokenize: "forward",
      cache: 100,
      document: {
        id: "slug",
        index: [
          { field: "title", tokenize: "forward", resolution: 9 },
          { field: "desc", tokenize: "forward", resolution: 5 },
          { field: "tags", tokenize: "forward", resolution: 7 },
          { field: "path", tokenize: "forward", resolution: 3 },
        ],
        store: ["slug", "title", "desc", "tags", "path"],
      },
    }) as any;
    for (const n of data.notes as IndexEntry[]) {
      entries.set(n.slug, n);
      index.add({
        slug: n.slug,
        title: n.title,
        desc: n.description ?? "",
        tags: n.tags.join(" "),
        path: n.path,
      });
    }
    return { index, entries };
  })();
  return indexPromise;
}

/**
 * Subscribe to the search-index promise. Returns the resolved index data or
 * null while loading. Uses useSyncExternalStore for hydration-safe,
 * lint-compliant async data access.
 */
function useSearchIndex(): {
  index: any;
  entries: Map<string, IndexEntry>;
} | null {
  return useSyncExternalStore(
    subscribeIndex,
    getIndexSnapshot,
    () => null
  );
}

// External store for the loaded index
let indexData: {
  index: any;
  entries: Map<string, IndexEntry>;
} | null = null;
const indexListeners = new Set<() => void>();

function subscribeIndex(cb: () => void) {
  indexListeners.add(cb);
  if (!indexData && !indexPromise) {
    loadIndex()
      .then(({ index, entries }) => {
        indexData = { index, entries };
        indexListeners.forEach((l) => l());
      })
      .catch(() => {
        /* ignore — will retry on next subscribe */
      });
  }
  return () => indexListeners.delete(cb);
}
function getIndexSnapshot() {
  return indexData;
}

function buildSnippet(
  query: string,
  entry: IndexEntry
): string {
  const q = query.toLowerCase();
  // Try to find the query in description first, then title
  const desc = entry.description ?? "";
  const descLower = desc.toLowerCase();
  const idx = descLower.indexOf(q);
  if (idx !== -1) {
    const start = Math.max(0, idx - 40);
    const end = Math.min(desc.length, idx + q.length + 80);
    return (
      (start > 0 ? "…" : "") +
      desc.slice(start, end).trim() +
      (end < desc.length ? "…" : "")
    );
  }
  return desc;
}

export function CommandPalette() {
  const { searchOpen, setSearchOpen } = useUIStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchIndex = useSearchIndex();
  const indexReady = !!searchIndex;
  const loading = searchOpen && !indexReady;

  // Instant search via Flexsearch — computed with useMemo (synchronous, no
  // effect needed). The index lookup is fast enough to run on every render.
  const results = useMemo<SearchResult[]>(() => {
    if (!searchOpen || !searchIndex) return [];
    const q = query.trim();
    if (!q) return [];
    const { index, entries } = searchIndex;
    const titleRes = index.search(q, { index: "title", limit: 20 }) as Array<{ result: string[] }>;
    const descRes = index.search(q, { index: "desc", limit: 20 }) as Array<{ result: string[] }>;
    const tagRes = index.search(q, { index: "tags", limit: 20 }) as Array<{ result: string[] }>;
    const pathRes = index.search(q, { index: "path", limit: 10 }) as Array<{ result: string[] }>;
    const flatten = (res: Array<{ result: string[] }>): string[] =>
      res.flatMap((r) => r.result || []);
    const titleIds = flatten(titleRes);
    const descIds = flatten(descRes);
    const tagIds = flatten(tagRes);
    const pathIds = flatten(pathRes);
    const scores = new Map<string, number>();
    const addResults = (ids: string[], weight: number) => {
      for (let i = 0; i < ids.length; i++) {
        const s = weight * (1 - i / Math.max(ids.length, 1));
        scores.set(ids[i], (scores.get(ids[i]) ?? 0) + s);
      }
    };
    addResults(titleIds, 10);
    addResults(tagIds, 6);
    addResults(descIds, 4);
    addResults(pathIds, 2);
    const ranked = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    const out: SearchResult[] = [];
    for (const [slug] of ranked) {
      const entry = entries.get(slug);
      if (!entry) continue;
      out.push({
        slug: entry.slug,
        title: entry.title,
        description: entry.description,
        tags: entry.tags,
        snippet: buildSnippet(q, entry),
        path: entry.path,
      });
    }
    return out;
  }, [query, searchOpen, searchIndex]);

  // Clamp active index when results shrink (e.g. user backspaces)
  const activeIdx = Math.min(active, Math.max(0, results.length - 1));

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen, searchOpen]);

  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus on open
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
    }
  }, [searchOpen]);

  // Keep active result scrolled into view during keyboard navigation
  useEffect(() => {
    if (results.length > 0 && activeIdx >= 0 && resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.children[activeIdx] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({
          block: "nearest",
          behavior: "auto",
        });
      }
    }
  }, [activeIdx, results.length]);



  const go = useCallback(
    (slug: string) => {
      setSearchOpen(false);
      router.push(`/?p=${encodeURIComponent(slug)}`);
    },
    [router, setSearchOpen]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      go(results[activeIdx].slug);
    }
  };

  if (!searchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 pt-[12vh]"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="popover-card w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search the garden…"
            className="flex-1 bg-transparent py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          {loading && (
            <span className="h-3 w-3 rounded-full border-2 border-garden border-t-transparent animate-spin" />
          )}
          {indexReady && !loading && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-garden/10 px-1.5 py-0.5 text-[9px] font-mono text-garden/70"
              title="Instant search enabled"
            >
              <Zap className="h-2.5 w-2.5" />
              instant
            </span>
          )}
          <button
            onClick={() => setSearchOpen(false)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div
          ref={resultsContainerRef}
          className="max-h-[52vh] overflow-y-auto styled-scroll p-2"
        >
          {!query.trim() ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">
                Start typing to search
              </p>
              <p className="text-xs">
                Instant search across titles, descriptions, tags, and paths.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px]">
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
                  ↑↓ navigate
                </kbd>
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
                  ↵ open
                </kbd>
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
                  esc close
                </kbd>
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              No notes match{" "}
              <span className="text-foreground font-mono">{query}</span>
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.slug}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.slug)}
                className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                  i === activeIdx ? "bg-garden/10" : "hover:bg-surface"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText
                    className={`h-3.5 w-3.5 flex-shrink-0 ${
                      i === activeIdx
                        ? "text-garden"
                        : "text-muted-foreground/60"
                    }`}
                  />
                  <span className="font-medium text-sm text-foreground truncate">
                    {r.title}
                  </span>
                  {r.path && (
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground/50 truncate">
                      {r.path}
                    </span>
                  )}
                </div>
                {r.snippet && (
                  <p className="mt-1 pl-5 text-xs text-muted-foreground line-clamp-2">
                    {r.snippet}
                  </p>
                )}
                {r.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1 pl-5">
                    {r.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-garden/80"
                      >
                        <Hash className="h-2.5 w-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <span>{results.length} result(s)</span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" /> to open
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
