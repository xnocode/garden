"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type {
  NoteSummary,
  NoteDetail,
  GraphData,
  TagInfo,
  ExplorerNode,
  SeriesEntry,
} from "@/lib/notes";
import { NoteView } from "@/components/garden/note-view";
import { PrivateNoteLoader } from "@/components/garden/private-note-loader";
import { GardenHome } from "@/components/garden/garden-home";
import {
  IndexView,
  TagsView,
  TagView,
  GraphPage,
  SearchView,
  ColophonView,
  SeriesListView,
  SeriesView,
} from "@/components/garden/views";
import { TaskwarriorView } from "@/components/garden/taskwarrior-view";
import { ChangelogView } from "@/components/garden/changelog-view";
import { WritingRhythmView } from "@/components/garden/writing-rhythm-view";
import { Sidebar } from "@/components/garden/sidebar";
import { MobileSidebar } from "@/components/garden/mobile-sidebar";

export interface GardenAppData {
  notes: NoteSummary[];
  noteDetails: Record<string, NoteDetail>;
  graph: GraphData;
  tags: TagInfo[];
  series: SeriesEntry[];
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
  const seriesName = searchParams.get("name") ?? undefined;

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
          n.tags.some((tg) => tg.toLowerCase().includes(query))
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

  const recentNotes = useMemo(
    () =>
      [...data.notes]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6),
    [data.notes]
  );

  // Per-view layout config — exactly matching the original design
  let showExplorer = true;
  let mainWidthClass = "max-w-[1600px]";
  let content: React.ReactNode;

  if (p) {
    const note = data.noteDetails[p];
    // Missing from the static bundle → private note; the loader asks the
    // API, which only serves it to a signed-in admin.
    content = note ? (
      <NoteView note={note} />
    ) : (
      <PrivateNoteLoader slug={p} />
    );
    mainWidthClass = "max-w-5xl";
  } else if (tag) {
    content = <TagView tag={tag} notes={tagNotes} />;
    mainWidthClass = "max-w-[1600px]";
  } else if (view === "index") {
    content = <IndexView notes={data.notes} />;
    mainWidthClass = "max-w-5xl";
  } else if (view === "graph") {
    content = <GraphPage graph={data.graph} />;
    showExplorer = false;
    mainWidthClass = "max-w-[1600px]";
  } else if (view === "tags") {
    content = <TagsView tags={data.tags} />;
    mainWidthClass = "max-w-4xl";
  } else if (view === "series") {
    if (seriesName) {
      const entry = data.series.find((s) => s.name === seriesName);
      content = (
        <SeriesView
          name={seriesName}
          notes={entry?.notes ?? []}
          series={data.series}
        />
      );
    } else {
      content = <SeriesListView series={data.series} />;
    }
    mainWidthClass = "max-w-4xl";
  } else if (view === "colophon") {
    content = <ColophonView noteCount={data.stats.totalNotes} stats={data.stats} />;
    mainWidthClass = "max-w-3xl";
  } else if (view === "tasks") {
    content = <TaskwarriorView data={data.taskData} writingStats={data.writingStats} />;
    mainWidthClass = "max-w-4xl";
  } else if (view === "changelog") {
    content = <ChangelogView entries={data.changelogEntries} />;
    mainWidthClass = "max-w-4xl";
  } else if (view === "rhythm") {
    content = <WritingRhythmView stats={data.writingStats} />;
    mainWidthClass = "max-w-4xl";
  } else if (q) {
    content = <SearchView q={q} results={searchResults} />;
    mainWidthClass = "max-w-3xl";
  } else {
    // Home
    const recent = recentNotes;
    const featured = [...data.notes]
      .sort((a, b) =>
        (b.publishDate ?? b.createdAt).localeCompare(a.publishDate ?? a.createdAt)
      )
      .slice(0, 6);
    content = (
      <GardenHome
        data={{
          recent,
          featured,
          tags: data.tags,
          series: data.series,
          graph: data.graph,
          onThisDay: data.onThisDay,
          writingStats: data.writingStats,
          stats: data.stats,
        }}
      />
    );
    mainWidthClass = "max-w-[1600px]";
  }

  return (
    <>
      <MobileSidebar
        tree={data.explorer}
        recentNotes={recentNotes}
        showExplorer={showExplorer}
      />
      <div className="flex flex-1">
        {showExplorer && (
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 flex-shrink-0 border-r border-sidebar-border bg-sidebar/40 lg:block">
            <Sidebar tree={data.explorer} recentNotes={recentNotes} />
          </aside>
        )}
        <main className="min-w-0 flex-1">
          <div className={`mx-auto ${mainWidthClass} px-4 py-8 sm:px-6 lg:py-10`}>
            {content}
          </div>
        </main>
      </div>
    </>
  );
}
