import Link from "next/link";
import { Link2, ArrowUpRight, CornerDownRight, Quote } from "lucide-react";
import type { BacklinkNote } from "@/lib/notes";
import { formatDate } from "./note-card";

export function Backlinks({
  backlinks,
  currentSlug,
}: {
  backlinks: BacklinkNote[];
  currentSlug: string;
}) {
  if (backlinks.length === 0) return null;
  return (
    <section
      aria-label="Backlinks"
      className="rounded-xl border border-border bg-gradient-to-b from-surface/60 to-surface/20 p-5 shadow-sm"
    >
      <header className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-heading">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-garden/10 text-garden ring-1 ring-garden/20">
            <Link2 className="h-3.5 w-3.5" />
          </span>
          Linked from this note
        </h3>
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {backlinks.length} {backlinks.length === 1 ? "ref" : "refs"}
        </span>
      </header>
      <ul className="space-y-1">
        {backlinks.map((b) => (
          <li key={b.slug}>
            <Link
              href={`/?p=${encodeURIComponent(b.slug)}`}
              className="group flex items-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2 transition-all hover:border-border hover:bg-surface/80"
            >
              <CornerDownRight className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 transition-colors group-hover:text-garden" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-medium text-foreground transition-colors group-hover:text-garden">
                    {b.title}
                  </span>
                  <ArrowUpRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                {/* Context preview (the sentence referencing this note) */}
                {b.context ? (
                  <span className="mt-1 block border-l-2 border-garden/30 pl-2 text-xs italic leading-relaxed text-muted-foreground line-clamp-2">
                    {b.context}
                  </span>
                ) : b.description ? (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {b.description}
                  </span>
                ) : null}
                <span className="mt-1 flex items-center gap-2 text-[10px] font-mono text-muted-foreground/50">
                  {b.publishDate && <span>{formatDate(b.publishDate)}</span>}
                  {b.folder && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span>{b.folder}</span>
                    </>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
