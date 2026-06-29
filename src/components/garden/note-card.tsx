import Link from "next/link";
import { FileText, Clock, Hash } from "lucide-react";
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
    <Link
      href={`/?p=${encodeURIComponent(note.slug)}`}
      className="card-elevated group relative block overflow-hidden p-5"
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-garden opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-lg font-semibold text-heading leading-snug transition-colors group-hover:text-garden">
          {note.title}
        </h3>
        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground/30 transition-colors group-hover:text-garden" />
      </div>
      {note.description && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {note.description}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground/80">
        {note.publishDate && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(note.publishDate)}
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
    </Link>
  );
}

export { formatDate, readingTime };
