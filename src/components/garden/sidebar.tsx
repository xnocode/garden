"use client";

import { useSearchParams } from "next/navigation";
import { ReadingHistory, useRecordVisit } from "./reading-history";
import { RecentNotes } from "./recent-notes";
import { Explorer } from "./explorer";
import type { ExplorerNode, NoteSummary } from "@/lib/notes";

/**
 * Client-side sidebar that composes the Explorer, Recent notes, and Reading
 * history widgets. The reading history records visits to note pages via
 * the current `?p=` search param.
 */
export function Sidebar({
  tree,
  recentNotes,
}: {
  tree: ExplorerNode[];
  recentNotes: NoteSummary[];
}) {
  const sp = useSearchParams();
  const currentSlug = sp.get("p");
  // Record the visit whenever the current note changes.
  // We don't have the title here easily, so we pass the slug and let the
  // note-view record with the full title. This hook is a no-op fallback
  // for when note-view isn't rendered.
  useRecordVisit(currentSlug, currentSlug);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Explorer tree={tree} />
      </div>
      <div className="max-h-[35%] overflow-y-auto styled-scroll">
        <RecentNotes notes={recentNotes} />
        <ReadingHistory currentSlug={currentSlug} />
      </div>
    </div>
  );
}
