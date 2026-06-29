import Link from "next/link";
import { Hash } from "lucide-react";
import type { TagInfo } from "@/lib/notes";

export function TagCloud({ tags }: { tags: TagInfo[] }) {
  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No tags yet.</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <Link
          key={t.tag}
          href={`/?tag=${encodeURIComponent(t.tag)}`}
          className="tag-pill"
          title={`${t.count} ${t.count === 1 ? "note" : "notes"}`}
        >
          <Hash className="h-3 w-3" />
          {t.tag}
          <span className="ml-1 text-muted-foreground/60">{t.count}</span>
        </Link>
      ))}
    </div>
  );
}
