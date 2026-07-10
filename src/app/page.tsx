import {
  getExplorer,
  getNote,
  getGraph,
  getTags,
  getStats,
  getOnThisDay,
  listNotes,
  searchNotes,
  type NoteSummary,
} from "@/lib/notes";
import { SiteHeader } from "@/components/garden/site-header";
import { SiteFooter } from "@/components/garden/site-footer";
import { Explorer } from "@/components/garden/explorer";
import { RecentNotes } from "@/components/garden/recent-notes";
import { Sidebar } from "@/components/garden/sidebar";
import { MobileSidebar } from "@/components/garden/mobile-sidebar";
import { CommandPalette } from "@/components/garden/command-palette";
import { ReadingProgress } from "@/components/garden/reading-progress";
import { ShortcutsHelp } from "@/components/garden/shortcuts-help";
import { NoteView } from "@/components/garden/note-view";
import { GardenHome } from "@/components/garden/garden-home";
import { getTotalVisitors } from "@/lib/analytics";
import {
  IndexView,
  TagsView,
  TagView,
  GraphPage,
  SearchView,
  ColophonView,
  NotFoundView,
} from "@/components/garden/views";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;
  const p = sp.p;
  const tag = sp.tag;
  const view = sp.view;
  const q = sp.q;

  // Always-needed data (parallel)
  const [explorer, allNotes, recentNotes] = await Promise.all([
    getExplorer(),
    listNotes(),
    listNotes({ sort: "updated", limit: 6 }),
  ]);
  const noteCount = allNotes.length;

  let content: React.ReactNode;
  let showExplorer = true;
  let mainWidthClass = "max-w-[1600px]";

  if (p) {
    const note = await getNote(p);
    content = note ? (
      <NoteView note={note} />
    ) : (
      <NotFoundView slug={p} />
    );
    mainWidthClass = "max-w-5xl";
  } else if (tag) {
    const notes = await listNotes({ tag });
    content = <TagView tag={tag} notes={notes} />;
    mainWidthClass = "max-w-[1600px]";
  } else if (view === "index") {
    content = <IndexView notes={allNotes} />;
    mainWidthClass = "max-w-5xl";
  } else if (view === "graph") {
    const graph = await getGraph();
    content = <GraphPage graph={graph} />;
    showExplorer = false;
    mainWidthClass = "max-w-[1600px]";
  } else if (view === "tags") {
    const tags = await getTags();
    content = <TagsView tags={tags} />;
    mainWidthClass = "max-w-4xl";
  } else if (view === "colophon") {
    const stats = await getStats();
    content = <ColophonView noteCount={noteCount} stats={stats} />;
    mainWidthClass = "max-w-3xl";
  } else if (q) {
    const results = await searchNotes(q);
    content = <SearchView q={q} results={results} />;
    mainWidthClass = "max-w-3xl";
  } else {
    // Home
    const [recentRaw, tags, graph, stats, onThisDay, totalVisitors] = await Promise.all([
      listNotes({ sort: "updated", limit: 6 }),
      getTags(),
      getGraph(),
      getStats(),
      getOnThisDay(),
      getTotalVisitors(),
    ]);
    // Featured: a curated mix — most recent by publish date + a couple reference
    const featured = await listNotes({ sort: "newest", limit: 6 });
    content = (
      <GardenHome
        data={{
          recent: recentRaw,
          featured,
          tags,
          graph,
          onThisDay,
          stats: {
            ...stats,
            totalVisitors,
          },
        }}
      />
    );
    mainWidthClass = "max-w-[1600px]";
  }

  return (
    <div className="garden-ambience relative flex min-h-screen flex-col bg-background">
      <ReadingProgress />
      <SiteHeader />
      <MobileSidebar
        tree={explorer}
        recentNotes={recentNotes}
        showExplorer={showExplorer}
      />
      <div className="flex flex-1">
        {showExplorer && (
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 flex-shrink-0 border-r border-sidebar-border bg-sidebar/40 lg:block">
            <Sidebar tree={explorer} recentNotes={recentNotes} />
          </aside>
        )}
        <main className={`min-w-0 flex-1`}>
          <div className={`mx-auto ${mainWidthClass} px-4 py-8 sm:px-6 lg:py-10`}>
            {content}
          </div>
        </main>
      </div>
      <SiteFooter noteCount={noteCount} />
      <CommandPalette />
      <ShortcutsHelp />
    </div>
  );
}
