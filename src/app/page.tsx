import {
  getExplorer,
  getGraph,
  getTags,
  getSeries,
  getStats,
  getOnThisDay,
  listNotes,
  getNote,
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
import type { NoteDetail } from "@/lib/notes";

// Build time: load all data once. No dynamic rendering on every click.
// All navigation happens purely on the client side — zero server round trips.
export const dynamic = "force-static";
export const revalidate = false;

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

  // Pre-build slug→detail map for instant O(1) client-side note lookups
  const noteDetails: Record<string, NoteDetail> = {};
  await Promise.all(
    notes.map(async (n) => {
      const detail = await getNote(n.slug);
      if (detail) noteDetails[n.slug] = detail;
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
    <div className="garden-ambience relative flex min-h-screen flex-col bg-background">
      <ReadingProgress />
      <SiteHeader />
      {/* GardenClientRouter owns sidebar + layout + routing — all client-side */}
      <Suspense>
        <GardenClientRouter data={appData} />
      </Suspense>
      <SiteFooter noteCount={notes.length} />
      <CommandPalette />
      <ShortcutsHelp />
    </div>
  );
}
