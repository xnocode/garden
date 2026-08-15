import {
  getExplorer,
  getGraph,
  getTags,
  getStats,
  getOnThisDay,
  listNotes,
} from "@/lib/notes";
import { SiteHeader } from "@/components/garden/site-header";
import { SiteFooter } from "@/components/garden/site-footer";
import { Sidebar } from "@/components/garden/sidebar";
import { MobileSidebar } from "@/components/garden/mobile-sidebar";
import { CommandPalette } from "@/components/garden/command-palette";
import { ReadingProgress } from "@/components/garden/reading-progress";
import { ShortcutsHelp } from "@/components/garden/shortcuts-help";
import { getTotalVisitors } from "@/lib/analytics";
import { getWritingStats } from "@/lib/writing-stats";
import { GardenClientRouter } from "@/components/garden/garden-client-router";
import { Suspense } from "react";
import type { NoteDetail } from "@/lib/notes";
import notesData from "@/data/notes.json";

// Build time: load all data once. No dynamic rendering on every click.
// All navigation happens purely on the client side — zero server round trips.
export const dynamic = "force-static";
export const revalidate = false;

export default async function Page() {
  // Load all data in parallel at build time
  const [notes, explorer, graph, tags, stats, onThisDay, writingStats, totalVisitors] =
    await Promise.all([
      listNotes(),
      getExplorer(),
      getGraph(),
      getTags(),
      getStats(),
      getOnThisDay(),
      getWritingStats(),
      getTotalVisitors(),
    ]);

  // Pre-build a slug→detail map for instant O(1) client-side lookups
  // We import the raw notes data and build details client-side from notes.json
  const noteDetails: Record<string, NoteDetail> = {};
  
  // Build the note details index from the precomputed data
  // We do this by importing all details from lib/notes precomputed map
  const { getNote } = await import("@/lib/notes");
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

  const recentNotes = [...notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const appData = {
    notes,
    noteDetails,
    graph,
    tags,
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
      <MobileSidebar
        tree={explorer}
        recentNotes={recentNotes}
        showExplorer={true}
      />
      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 flex-shrink-0 border-r border-sidebar-border bg-sidebar/40 lg:block">
          <Sidebar tree={explorer} recentNotes={recentNotes} />
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mx-auto px-4 py-8 sm:px-6 lg:py-10">
            <Suspense>
              <GardenClientRouter data={appData} />
            </Suspense>
          </div>
        </main>
      </div>
      <SiteFooter noteCount={notes.length} />
      <CommandPalette />
      <ShortcutsHelp />
    </div>
  );
}
