import { GardenLink } from "./garden-link";
import { FileText, Clock, Hash, Lock } from "lucide-react";
import type { NoteSummary } from "@/lib/notes";

function readingTime(words: number): string {
  const mins = Math.max(1, Math.round(words / 220));
  return `${mins} min`;
}

function formatDate(d: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function NoteCard({ note }: { note: NoteSummary }) {
  return (
    <GardenLink
      href={`/?p=${encodeURIComponent(note.slug)}`}
      className="card-elevated group relative block overflow-hidden p-5"
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-garden opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-lg font-semibold text-heading leading-snug transition-colors group-hover:text-garden">
          {note.title}
        </h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {note.visibility === "private" && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500 border border-amber-500/20" title="Private note">
              <Lock className="h-2.5 w-2.5" />
              Private
            </span>
          )}
          {note.visibility === "members" && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/20" title="Members only">
              <Lock className="h-2.5 w-2.5" />
              Members
            </span>
          )}
          <FileText className="h-4 w-4 text-muted-foreground/30 transition-colors group-hover:text-garden" />
        </div>
      </div>
      {note.description && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {note.description}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground/80">
        {(note.updatedAt || note.publishDate) && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {note.updatedAt && note.updatedAt.slice(0, 10) !== (note.publishDate || "").slice(0, 10)
              ? `Updated ${formatDate(note.updatedAt)}`
              : formatDate(note.publishDate || note.updatedAt)}
          </span>
        )}
        <span>{readingTime(note.wordCount)}</span>
        <span className="text-muted-foreground/30">·</span>
        {note.tags.slice(0, 3).map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-0.5 font-mono text-garden/70"
          >
            <Hash className="h-2.5 w-2.5" />
            {t}
          </span>
        ))}
      </div>
    </GardenLink>
  );
}

export { formatDate, readingTime };
