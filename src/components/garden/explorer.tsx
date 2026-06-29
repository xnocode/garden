"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import type { ExplorerNode } from "@/lib/notes";

// --- Collapsed-folders store backed by localStorage, hydration-safe ---
const COLLAPSED_KEY = "garden-explorer-collapsed";
let collapsedSet: Set<string> = new Set();
let initialized = false;
const listeners = new Set<() => void>();

function ensureInit() {
  if (initialized) return;
  initialized = true;
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    if (raw) collapsedSet = new Set(JSON.parse(raw));
  } catch {
    /* ignore */
  }
}

function persist() {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsedSet]));
  } catch {
    /* ignore */
  }
}

function subscribe(cb: () => void) {
  ensureInit();
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot(): Set<string> {
  ensureInit();
  return collapsedSet;
}
function getServerSnapshot(): Set<string> {
  return EMPTY_SET;
}
const EMPTY_SET: Set<string> = new Set();

function toggleFolder(path: string) {
  const next = new Set(collapsedSet);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  collapsedSet = next;
  persist();
  listeners.forEach((l) => l());
}

// --- Tree node ---
function TreeNode({
  node,
  depth,
  currentSlug,
}: {
  node: ExplorerNode;
  depth: number;
  currentSlug: string | null;
}) {
  const collapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const isCollapsed = collapsed.has(node.path);

  if (node.type === "file") {
    const isActive = currentSlug === node.slug;
    return (
      <Link
        href={`/?p=${encodeURIComponent(node.slug!)}`}
        className={`group flex items-center gap-1.5 rounded-md py-1 pr-2 text-sm transition-colors ${
          isActive
            ? "bg-garden/10 text-garden font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-surface"
        }`}
        style={{ paddingLeft: depth * 12 + 8 }}
      >
        <FileText
          className={`h-3.5 w-3.5 flex-shrink-0 ${
            isActive
              ? "text-garden"
              : "text-muted-foreground/60 group-hover:text-foreground"
          }`}
        />
        <span className="truncate">{node.name}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => toggleFolder(node.path)}
        className="group flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-surface"
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${
            isCollapsed ? "" : "rotate-90"
          }`}
        />
        {isCollapsed ? (
          <Folder className="h-3.5 w-3.5 text-muted-foreground/70" />
        ) : (
          <FolderOpen className="h-3.5 w-3.5 text-garden/70" />
        )}
        <span className="truncate font-medium">{node.name}</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
          {node.children?.length ?? 0}
        </span>
      </button>
      {!isCollapsed && (
        <div>
          {node.children?.map((child, i) => (
            <TreeNode
              key={`${child.path}-${i}`}
              node={child}
              depth={depth + 1}
              currentSlug={currentSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Explorer({ tree }: { tree: ExplorerNode[] }) {
  const sp = useSearchParams();
  const currentSlug = sp.get("p");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground/50">
          {tree.length} folders
        </span>
      </div>
      <div className="styled-scroll flex-1 overflow-y-auto px-2 py-2">
        {tree.map((node, i) => (
          <TreeNode
            key={`${node.path}-${i}`}
            node={node}
            depth={0}
            currentSlug={currentSlug}
          />
        ))}
      </div>
    </div>
  );
}
