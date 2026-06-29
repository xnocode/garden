import Link from "next/link";
import { Sprout, Rss, Network, BookMarked, Github } from "lucide-react";

export function SiteFooter({ noteCount }: { noteCount: number }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-border bg-surface/30">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sprout className="h-4 w-4 text-garden" />
          <span>
            a digital garden —{" "}
            <span className="text-foreground font-medium">{noteCount}</span>{" "}
            notes growing
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link
            href="/?view=index"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <BookMarked className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">index</span>
          </Link>
          <Link
            href="/?view=graph"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Network className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">graph</span>
          </Link>
          <Link
            href="/?view=colophon"
            className="hover:text-foreground transition-colors"
          >
            colophon
          </Link>
          <a
            href="/api/rss"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            title="RSS feed"
          >
            <Rss className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">rss</span>
          </a>
          <a
            href="https://github.com/xnocode"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">xnocode</span>
          </a>
        </div>
        <div className="text-xs text-muted-foreground/70 font-mono">
          © {year} · grown with care
        </div>
      </div>
    </footer>
  );
}
