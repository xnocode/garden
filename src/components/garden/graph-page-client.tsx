"use client";

import { useMemo, useState } from "react";
import { Network, Filter, RotateCcw, X } from "lucide-react";
import type { GraphData } from "@/lib/notes";
import { GraphViewWrapper } from "./graph-view-wrapper";

interface GraphPageClientProps {
  graph: GraphData;
  currentSlug?: string | null;
}

export function GraphPageClient({ graph, currentSlug }: GraphPageClientProps) {
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [showOrphans, setShowOrphans] = useState(true);

  // Collect all tags with counts
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of graph.nodes) {
      for (const t of n.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
        // Count parent tags too
        const parts = t.split("/");
        for (let i = 1; i < parts.length; i++) {
          const parent = parts.slice(0, i).join("/");
          counts.set(parent, (counts.get(parent) ?? 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [graph.nodes]);

  // Compute the degree of each node for orphan detection
  const nodeDegree = useMemo(() => {
    const deg = new Map<string, number>();
    for (const n of graph.nodes) deg.set(n.id, 0);
    for (const e of graph.edges) {
      deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
      deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
    }
    return deg;
  }, [graph.nodes, graph.edges]);

  // Filtered graph data
  const filtered = useMemo(() => {
    if (activeTags.size === 0 && showOrphans) return graph;
    const visibleNodes = graph.nodes.filter((n) => {
      // Tag filter: if tags are selected, node must have at least one
      if (activeTags.size > 0) {
        const hasTag = n.tags.some((t) => {
          if (activeTags.has(t)) return true;
          // Check parent tags
          const parts = t.split("/");
          for (let i = 1; i < parts.length; i++) {
            if (activeTags.has(parts.slice(0, i).join("/"))) return true;
          }
          return false;
        });
        if (!hasTag) return false;
      }
      // Orphan filter
      if (!showOrphans && (nodeDegree.get(n.id) ?? 0) === 0) return false;
      return true;
    });
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = graph.edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
    );
    return { nodes: visibleNodes, edges: visibleEdges };
  }, [graph, activeTags, showOrphans, nodeDegree]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const clearFilters = () => {
    setActiveTags(new Set());
    setShowOrphans(true);
  };

  const hasFilters = activeTags.size > 0 || !showOrphans;

  return (
    <div className="garden-fade-in">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="flex items-center gap-3 font-serif text-2xl font-semibold text-heading">
            <Network className="h-6 w-6 text-garden" />
            Knowledge graph
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono text-foreground">{filtered.nodes.length}</span>
            {" / "}
            <span className="font-mono">{graph.nodes.length}</span> notes ·{" "}
            <span className="font-mono text-foreground">{filtered.edges.length}</span> links ·
            drag to pan, scroll to zoom, click a node
          </p>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-garden/40 hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Reset filters
          </button>
        )}
      </header>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/40 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </div>
        <div className="h-4 w-px bg-border" />
        {/* Orphan toggle */}
        <button
          onClick={() => setShowOrphans(!showOrphans)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono transition-colors ${
            showOrphans
              ? "border-border bg-surface text-muted-foreground"
              : "border-garden/40 bg-garden/10 text-garden"
          }`}
          title="Toggle orphan (unlinked) notes"
        >
          {showOrphans ? "showing" : "hiding"} orphans
        </button>
        {/* Tag chips */}
        {allTags.slice(0, 16).map(({ tag, count }) => {
          const active = activeTags.has(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-mono transition-all ${
                active
                  ? "border-garden bg-garden/15 text-garden shadow-sm"
                  : "border-border bg-surface text-muted-foreground hover:border-garden/40 hover:text-foreground"
              }`}
            >
              {active && <X className="h-2.5 w-2.5" />}
              #{tag}
              <span className="opacity-50">{count}</span>
            </button>
          );
        })}
        {activeTags.size > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {activeTags.size} tag{activeTags.size > 1 ? "s" : ""} active
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface/30">
        <GraphViewWrapper
          nodes={filtered.nodes}
          edges={filtered.edges}
          currentSlug={currentSlug ?? null}
          height={620}
        />
      </div>
    </div>
  );
}
