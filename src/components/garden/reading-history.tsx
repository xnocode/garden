"use client";

import Link from "next/link";
import { useSyncExternalStore, useEffect } from "react";
import { History, X } from "lucide-react";

interface HistoryEntry {
  slug: string;
  title: string;
  visitedAt: number; // epoch ms
}

const HISTORY_KEY = "garden-reading-history";
const MAX_ENTRIES = 8;

// --- External store backed by localStorage, hydration-safe ---
let historyEntries: HistoryEntry[] = [];
let initialized = false;
let clientMounted = false;
const listeners = new Set<() => void>();

function ensureInit() {
  if (initialized) return;
  initialized = true;
  clientMounted = true;
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) historyEntries = JSON.parse(raw);
  } catch {
    /* ignore */
  }
}

function persist() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historyEntries));
  } catch {
    /* ignore */
  }
}

function subscribe(cb: () => void) {
  ensureInit();
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot(): HistoryEntry[] {
  ensureInit();
  return historyEntries;
}
function getServerSnapshot(): HistoryEntry[] {
  return EMPTY;
}
const EMPTY: HistoryEntry[] = [];

/**
 * Returns true once the store has initialized on the client (i.e. after
 * the first call to getSnapshot in a browser). On the server it's always
 * false. This lets us avoid hydration mismatches without setState-in-effect.
 */
function useClientMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => clientMounted,
    () => false
  );
}

export function recordVisit(slug: string, title: string) {
  ensureInit();
  // Remove existing entry for this slug, then prepend
  historyEntries = historyEntries.filter((e) => e.slug !== slug);
  historyEntries.unshift({ slug, title, visitedAt: Date.now() });
  historyEntries = historyEntries.slice(0, MAX_ENTRIES);
  persist();
  listeners.forEach((l) => l());
}

export function clearHistory() {
  historyEntries = [];
  persist();
  listeners.forEach((l) => l());
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/**
 * Records the current note visit on mount (client-only, after hydration).
 * Separate hook to keep ReadingHistory render-pure.
 */
function useRecordVisit(slug: string | null, title: string | null) {
  useEffect(() => {
    if (slug && title) {
      recordVisit(slug, title);
    }
  }, [slug, title]);
}

export function ReadingHistory({
  currentSlug,
}: {
  currentSlug: string | null;
}) {
  const entries = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const mounted = useClientMounted();

  if (!mounted) return null;
  const visible = entries.filter((e) => e.slug !== currentSlug).slice(0, 5);
  if (visible.length === 0) return null;

  return (
    <div className="border-t border-sidebar-border">
      <div className="flex items-center justify-between px-4 py-2.5">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <History className="h-3 w-3" />
          Visited
        </h2>
        <button
          onClick={() => clearHistory()}
          className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
          aria-label="Clear reading history"
          title="Clear history"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="px-2 pb-3">
        <ul className="space-y-0.5">
          {visible.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/?p=${encodeURIComponent(e.slug)}`}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-muted-foreground group-hover:text-foreground">
                    {e.title}
                  </span>
                </span>
                <span className="flex-shrink-0 text-[10px] font-mono text-muted-foreground/50">
                  {relativeTime(e.visitedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export { useRecordVisit };
