import Link from "next/link";
import { Clock } from "lucide-react";
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

export function RecentNotes({ notes }: { notes: NoteSummary[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="border-t border-sidebar-border">
      <div className="flex items-center justify-between px-4 py-2.5">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3 w-3" />
          Recent
        </h2>
      </div>
      <div className="px-2 pb-3">
        <ul className="space-y-0.5">
          {notes.map((n) => (
            <li key={n.slug}>
              <Link
                href={`/?p=${encodeURIComponent(n.slug)}`}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-muted-foreground group-hover:text-foreground">
                    {n.title}
                  </span>
                </span>
                <span className="flex-shrink-0 text-[10px] font-mono text-muted-foreground/50">
                  {relativeTime(n.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
