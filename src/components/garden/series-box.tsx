"use client";

import Link from "next/link";
import { BookOpen, ListOrdered } from "lucide-react";
import type { SeriesInfo, NoteSummary } from "@/lib/notes";

interface Props {
  series: SeriesInfo;
  prev: NoteSummary | null;
  next: NoteSummary | null;
}

/**
 * Reading-path banner for series notes: "Series name · Part 2 of 5"
 * with prev/next within the series and a link to the full ordered list.
 */
export function SeriesBox({ series, prev, next }: Props) {
  return (
    <nav
      aria-label={`Series: ${series.name}`}
      className="mb-8 rounded-lg border border-garden/25 bg-garden/5 px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4 flex-shrink-0 text-garden" />
          <Link
            href={`/?view=series&name=${encodeURIComponent(series.name)}`}
            className="truncate font-medium text-foreground hover:text-garden"
          >
            {series.name}
          </Link>
          <span className="flex-shrink-0 font-mono text-xs text-muted-foreground">
            Part {series.part} of {series.total}
          </span>
        </div>
        <Link
          href={`/?view=series&name=${encodeURIComponent(series.name)}`}
          className="inline-flex flex-shrink-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-garden"
        >
          <ListOrdered className="h-3.5 w-3.5" />
          All {series.total} parts
        </Link>
      </div>
      {(prev || next) && (
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-garden/15 pt-2 text-xs">
          {prev ? (
            <Link
              href={`/?p=${encodeURIComponent(prev.slug)}`}
              className="min-w-0 truncate text-muted-foreground transition-colors hover:text-garden"
              title={prev.title}
            >
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/?p=${encodeURIComponent(next.slug)}`}
              className="min-w-0 truncate text-right text-muted-foreground transition-colors hover:text-garden"
              title={next.title}
            >
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </nav>
  );
}
