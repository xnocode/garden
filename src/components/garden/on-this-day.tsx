import Link from "next/link";
import { Calendar, ArrowRight, Clock } from "lucide-react";
import type { NoteSummary } from "@/lib/notes";

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function OnThisDay({
  notes,
  fallback,
}: {
  notes: NoteSummary[];
  fallback: NoteSummary[];
}) {
  const today = new Date();
  const monthName = today.toLocaleDateString("en-US", { month: "long" });
  const day = today.getDate();

  // If we have "on this day" notes, show them; otherwise show the fallback
  // (recently tended) so the section is never empty.
  const isOnThisDay = notes.length > 0;
  const display = isOnThisDay ? notes : fallback.slice(0, 3);
  if (display.length === 0) return null;

  return (
    <section className="mb-14">
      <h2 className="mb-5 flex items-center gap-2 font-serif text-xl font-semibold text-heading">
        {isOnThisDay ? (
          <>
            <Calendar className="h-5 w-5 text-garden" />
            On this day — {monthName} {day}
          </>
        ) : (
          <>
            <Clock className="h-5 w-5 text-garden" />
            Recently tended
          </>
        )}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {isOnThisDay
          ? "Notes tended on this date in years past."
          : "Notes most recently updated in the garden."}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {display.map((n) => {
          const year = n.publishDate
            ? new Date(n.publishDate).getFullYear()
            : null;
          return (
            <Link
              key={n.slug}
              href={`/?p=${encodeURIComponent(n.slug)}`}
              className="card-elevated group relative block overflow-hidden p-5"
            >
              <span className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-garden opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-lg font-semibold text-heading leading-snug transition-colors group-hover:text-garden">
                  {n.title}
                </h3>
                {isOnThisDay && year ? (
                  <span className="flex-shrink-0 rounded-full border border-garden/30 bg-garden/10 px-2 py-0.5 font-mono text-[10px] text-garden">
                    {year}
                  </span>
                ) : (
                  <span className="flex-shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {relativeTime(n.updatedAt)}
                  </span>
                )}
              </div>
              {n.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {n.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-1 text-xs text-garden opacity-0 transition-opacity group-hover:opacity-100">
                <span>Read note</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
