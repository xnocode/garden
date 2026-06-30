import Link from "next/link";
import { Sprout, Search, Network, ArrowRight, BookOpen, Link2 } from "lucide-react";
import type { NoteSummary, TagInfo, GraphData } from "@/lib/notes";
import { NoteCard } from "./note-card";
import { TagCloud } from "./tag-cloud";
import { GraphViewWrapper } from "./graph-view-wrapper";
import { SearchTrigger } from "./search-trigger";
import { OnThisDay } from "./on-this-day";

interface HomeData {
  recent: NoteSummary[];
  featured: NoteSummary[];
  tags: TagInfo[];
  graph: GraphData;
  onThisDay: NoteSummary[];
  stats: {
    totalNotes: number;
    totalWords: number;
    totalLinks: number;
    totalTags: number;
    lastUpdated: string | null;
    totalVisitors: number;
  };
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export function GardenHome({ data }: { data: HomeData }) {
  const { recent, featured, tags, graph, onThisDay, stats } = data;
  const lastUpdated = stats.lastUpdated
    ? new Date(stats.lastUpdated).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="garden-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-garden/10 blur-3xl" />
          <div className="absolute -top-16 right-1/4 h-64 w-64 rounded-full bg-chart-3/8 blur-3xl" />
          {/* Animated constellation dots */}
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.18]"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <defs>
              <radialGradient id="dotGrad">
                <stop offset="0%" stopColor="#84a59d" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#84a59d" stopOpacity="0" />
              </radialGradient>
            </defs>
            {[
              [8, 18], [15, 65], [22, 32], [30, 78], [38, 15], [45, 50],
              [52, 85], [60, 28], [68, 70], [75, 12], [82, 55], [90, 38],
              [12, 88], [28, 48], [48, 22], [65, 90], [80, 72], [93, 18],
            ].map(([x, y], i) => (
              <circle
                key={i}
                cx={`${x}%`}
                cy={`${y}%`}
                r={i % 3 === 0 ? 2.5 : 1.5}
                fill="url(#dotGrad)"
                className="garden-pulse"
                style={{ animationDelay: `${(i * 0.3) % 2.4}s` }}
              />
            ))}
          </svg>
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-garden/30 bg-garden/5 px-3.5 py-1.5 text-xs font-mono text-garden backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-garden opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-garden" />
            </span>
            a digital garden, growing
          </div>
          <h1 className="font-serif text-6xl font-bold tracking-tight text-heading sm:text-8xl">
            garden
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl">
            A collection of notes, essays, and ideas — grown in Obsidian,
            tended slowly, and published with a single command. Wander the
            paths between thoughts.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={featured[0] ? `/?p=${encodeURIComponent(featured[0].slug)}` : "/?view=index"}
              className="btn-glow inline-flex items-center gap-2 rounded-md bg-garden px-6 py-2.5 text-sm font-medium text-garden-foreground"
            >
              <Sprout className="h-4 w-4" />
              Start wandering
            </Link>
            <SearchTrigger className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/60 px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-garden/40 hover:bg-surface">
              <Search className="h-4 w-4" />
              Search notes
            </SearchTrigger>
            <Link
              href="/?view=graph"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/60 px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-garden/40 hover:bg-surface"
            >
              <Network className="h-4 w-4" />
              View graph
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-5">
            <Stat value={stats.totalNotes} label="notes" />
            <Stat
              value={stats.totalWords.toLocaleString()}
              label="words"
            />
            <Stat value={stats.totalLinks} label="links" />
            <Stat value={stats.totalTags} label="tags" />
            <Stat
              value={stats.totalVisitors.toLocaleString()}
              label="views"
            />
          </div>
          {lastUpdated && (
            <p className="mt-6 text-xs font-mono text-muted-foreground/60">
              last tended {lastUpdated}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* On this day (or recently tended fallback) */}
        <OnThisDay notes={onThisDay} fallback={recent} />

        {/* Featured */}
        {featured.length > 0 && (
          <section className="mb-14">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-heading">
                <BookOpen className="h-5 w-5 text-garden" />
                Featured
              </h2>
              <Link
                href="/?view=index"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-garden"
              >
                all notes <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((n) => (
                <NoteCard key={n.slug} note={n} />
              ))}
            </div>
          </section>
        )}

        {/* Graph preview + recent */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <h2 className="mb-5 flex items-center gap-2 font-serif text-xl font-semibold text-heading">
              <Network className="h-5 w-5 text-garden" />
              The graph
            </h2>
            <div className="overflow-hidden rounded-lg border border-border bg-surface/30">
              <GraphViewWrapper
                nodes={graph.nodes}
                edges={graph.edges}
                height={360}
              />
            </div>
            <Link
              href="/?view=graph"
              className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-garden"
            >
              explore the full graph <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <section>
            <h2 className="mb-5 flex items-center gap-2 font-serif text-xl font-semibold text-heading">
              <Link2 className="h-5 w-5 text-garden" />
              Recently tended
            </h2>
            <div className="space-y-2">
              {recent.map((n) => (
                <Link
                  key={n.slug}
                  href={`/?p=${encodeURIComponent(n.slug)}`}
                  className="group block rounded-md border border-border bg-surface/30 p-3 transition-colors hover:border-garden/40 hover:bg-surface/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-sm text-foreground group-hover:text-garden">
                      {n.title}
                    </span>
                    {n.publishDate && (
                      <span className="flex-shrink-0 text-[10px] font-mono text-muted-foreground/60">
                        {new Date(n.publishDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  {n.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {n.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 flex items-center gap-2 font-serif text-xl font-semibold text-heading">
              <Sprout className="h-5 w-5 text-garden" />
              Tags
            </h2>
            <TagCloud tags={tags} />
          </section>
        )}
      </div>
    </div>
  );
}
