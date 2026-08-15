"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type {
  NoteSummary,
  NoteDetail,
  GraphData,
  TagInfo,
  ExplorerNode,
} from "@/lib/notes";
import { NoteView } from "@/components/garden/note-view";
import { GardenHome } from "@/components/garden/garden-home";
import {
  IndexView,
  TagsView,
  TagView,
  GraphPage,
  SearchView,
  ColophonView,
  NotFoundView,
} from "@/components/garden/views";
import { TaskwarriorView } from "@/components/garden/taskwarrior-view";
import { ChangelogView } from "@/components/garden/changelog-view";
import { WritingRhythmView } from "@/components/garden/writing-rhythm-view";

export interface GardenAppData {
  notes: NoteSummary[];
  noteDetails: Record<string, NoteDetail>;
  graph: GraphData;
  tags: TagInfo[];
  explorer: ExplorerNode[];
  stats: {
    totalNotes: number;
    totalWords: number;
    totalLinks: number;
    totalTags: number;
    lastUpdated: string | null;
    totalVisitors: number;
  };
  onThisDay: NoteSummary[];
  taskData: any;
  changelogEntries: any[];
  writingStats: any;
}

interface Props {
  data: GardenAppData;
}

export function GardenClientRouter({ data }: Props) {
  const searchParams = useSearchParams();
  const p = searchParams.get("p") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const view = searchParams.get("view") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  // All search/filter operations run in-browser against the pre-loaded data
  const searchResults = useMemo(() => {
    if (!q) return [];
    const query = q.trim().toLowerCase();
    return data.notes
      .filter((n) => {
        const t = n.title.toLowerCase();
        const d = (n.description ?? "").toLowerCase();
        return (
          t.includes(query) ||
          d.includes(query) ||
          n.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      })
      .map((n) => ({
        ...n,
        snippet: n.description?.slice(0, 120) ?? "",
      }))
      .sort((a, b) => {
        const at = a.title.toLowerCase().includes(query) ? 0 : 1;
        const bt = b.title.toLowerCase().includes(query) ? 0 : 1;
        if (at !== bt) return at - bt;
        return b.updatedAt > a.updatedAt ? 1 : -1;
      });
  }, [q, data.notes]);

  const tagNotes = useMemo(() => {
    if (!tag) return [];
    return data.notes.filter((n) => n.tags.includes(tag));
  }, [tag, data.notes]);

  // Routing — pure client-side, zero network requests
  if (p) {
    const note = data.noteDetails[p];
    return note ? <NoteView note={note} /> : <NotFoundView slug={p} />;
  }

  if (tag) {
    return <TagView tag={tag} notes={tagNotes} />;
  }

  if (view === "index") {
    return <IndexView notes={data.notes} />;
  }

  if (view === "graph") {
    return <GraphPage graph={data.graph} />;
  }

  if (view === "tags") {
    return <TagsView tags={data.tags} />;
  }

  if (view === "colophon") {
    return <ColophonView noteCount={data.stats.totalNotes} stats={data.stats} />;
  }

  if (view === "tasks") {
    return <TaskwarriorView data={data.taskData} writingStats={data.writingStats} />;
  }

  if (view === "changelog") {
    return <ChangelogView entries={data.changelogEntries} />;
  }

  if (view === "rhythm") {
    return <WritingRhythmView stats={data.writingStats} />;
  }

  if (q) {
    return <SearchView q={q} results={searchResults} />;
  }

  // Home
  const recent = [...data.notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);
  const featured = [...data.notes]
    .sort((a, b) =>
      (b.publishDate ?? b.createdAt).localeCompare(a.publishDate ?? a.createdAt)
    )
    .slice(0, 6);

  return (
    <GardenHome
      data={{
        recent,
        featured,
        tags: data.tags,
        graph: data.graph,
        onThisDay: data.onThisDay,
        writingStats: data.writingStats,
        stats: data.stats,
      }}
    />
  );
}

// Also export a hook for getting current view info (used by Sidebar, MobileSidebar)
export function useCurrentView() {
  const searchParams = useSearchParams();
  return {
    p: searchParams.get("p") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    view: searchParams.get("view") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  };
}
