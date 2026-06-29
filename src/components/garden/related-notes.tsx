import Link from "next/link";
import { Sparkles, Hash, ArrowRight } from "lucide-react";
import type { RelatedNote } from "@/lib/notes";

const REASON_LABELS: Record<RelatedNote["reason"], string> = {
  "shared-tags": "shared tags",
  "2-hop": "connected via",
  "shared-links": "links to same",
};

export function RelatedNotes({ notes }: { notes: RelatedNote[] }) {
  if (notes.length === 0) return null;
  return (
    <section
      aria-label="Related notes"
      className="rounded-xl border border-border bg-gradient-to-b from-surface/40 to-transparent p-5 shadow-sm"
    >
      <header className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-heading">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-garden/10 text-garden ring-1 ring-garden/20">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          Related notes
        </h3>
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {notes.length} found
        </span>
      </header>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {notes.map((n) => (
          <li key={n.slug}>
            <Link
              href={`/?p=${encodeURIComponent(n.slug)}`}
              className="group flex h-full flex-col gap-1.5 rounded-lg border border-border bg-surface/40 p-3 transition-all hover:border-garden/40 hover:bg-surface/70 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-foreground transition-colors group-hover:text-garden line-clamp-1">
                  {n.title}
                </span>
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              {n.description && (
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {n.description}
                </span>
              )}
              <div className="mt-auto flex items-center gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-garden/8 px-1.5 py-0.5 text-[9px] font-mono text-garden/80">
                  <Hash className="h-2 w-2" />
                  {REASON_LABELS[n.reason]}
                </span>
                {n.tags.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[9px] text-muted-foreground/60"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
