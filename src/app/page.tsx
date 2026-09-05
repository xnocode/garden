import {
  getExplorer,
  getGraph,
  getTags,
  getSeries,
  getStats,
  getOnThisDay,
  listNotes,
  getNote,
  type NoteDetail,
} from "@/lib/notes";
import { SiteHeader } from "@/components/garden/site-header";
import { SiteFooter } from "@/components/garden/site-footer";
import { CommandPalette } from "@/components/garden/command-palette";
import { ReadingProgress } from "@/components/garden/reading-progress";
import { ShortcutsHelp } from "@/components/garden/shortcuts-help";
import { getTotalVisitors } from "@/lib/analytics";
import { getWritingStats } from "@/lib/writing-stats";
import { GardenClientRouter } from "@/components/garden/garden-client-router";
import { Suspense } from "react";
import type { Metadata } from "next";

// The garden is a single fully static page: all views (?p=, ?view=, ?tag=,
// ?q=) are rendered client-side from data embedded at build time. Without
// this, reading searchParams in metadata opts the route into dynamic
// rendering — and every client navigation re-renders the whole page on
// the server (seconds of latency per click).
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Garden — a digital garden",
  description:
    "A personal digital garden. Notes, essays, and ideas grown in Obsidian and published with a single command.",
  alternates: {
    canonical: "https://gardenx.qzz.io",
  },
  openGraph: {
    title: "Garden — a digital garden",
    description: "Notes grown in Obsidian, published with a single command.",
    url: "https://gardenx.qzz.io",
    siteName: "Garden",
    type: "website",
  },
};

export default async function Page() {
  // Load all data in parallel at build time
  const [notes, explorer, graph, tags, series, stats, onThisDay, writingStats, totalVisitors] =
    await Promise.all([
      listNotes(),
      getExplorer(),
      getGraph(),
      getTags(),
      getSeries(),
      getStats(),
      getOnThisDay(),
      getWritingStats(),
      getTotalVisitors(),
    ]);

  // Pre-build slug→detail map for instant O(1) client-side note lookups.
  // `content` (raw markdown) is stripped — the client renders from `html`,
  // and dropping the duplicate roughly halves the page payload size.
  const noteDetails: Record<string, NoteDetail> = {};
  await Promise.all(
    notes.map(async (n) => {
      const detail = await getNote(n.slug);
      if (detail) {
        const { content: _content, ...rest } = detail;
        noteDetails[n.slug] = rest;
      }
    })
  );

  // Load static JSON data files
  let taskData: any = { exportedAt: new Date().toISOString(), stats: { total: 0, pending: 0, completed: 0 }, tasks: [] };
  let changelogEntries: any[] = [];
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const [taskRaw, changelogRaw] = await Promise.all([
      fs.readFile(path.join(process.cwd(), "src/data/tasks.json"), "utf8").catch(() => "null"),
      fs.readFile(path.join(process.cwd(), "src/data/changelog.json"), "utf8").catch(() => "[]"),
    ]);
    taskData = JSON.parse(taskRaw) ?? taskData;
    changelogEntries = JSON.parse(changelogRaw) ?? [];

    const { isTaskwarriorPublic } = await import("@/lib/settings");
    const isPublic = await isTaskwarriorPublic();
    if (!isPublic && taskData) {
      taskData = {
        ...taskData,
        isBlurred: true,
        tasks: (taskData.tasks || []).map((t: any) => ({
          ...t,
          description: "",
          project: t.project ? "" : null,
        })),
        completedTasks: (taskData.completedTasks || []).map((t: any) => ({
          ...t,
          description: "",
          project: t.project ? "" : null,
        })),
      };
    }
  } catch { /* use defaults */ }

  const appData = {
    notes,
    noteDetails,
    graph,
    tags,
    series,
    explorer,
    stats: { ...stats, totalVisitors },
    onThisDay,
    taskData,
    changelogEntries,
    writingStats,
  };

  return (
    <Suspense fallback={null}>
      <div className="garden-ambience relative flex min-h-screen flex-col bg-background">
        <ReadingProgress />
        <SiteHeader />
        {/* GardenClientRouter owns sidebar + layout + routing — all client-side */}
        <GardenClientRouter data={appData} />
        <SiteFooter noteCount={notes.length} />
        <CommandPalette />
        <ShortcutsHelp />
      </div>
    </Suspense>
  );
}
