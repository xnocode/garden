/**
 * Copyright (c) 2026 xnocode. All rights reserved.
 * Source-Available License applies. See LICENSE file in repository root.
 */

import { GardenLink } from "./garden-link";
import { Sprout, Rss, Network, BookMarked, Github } from "lucide-react";
import { InstallButton } from "./pwa";

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
          <GardenLink
            href="/?view=index"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <BookMarked className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">index</span>
          </GardenLink>
          <GardenLink
            href="/?view=graph"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Network className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">graph</span>
          </GardenLink>
          <GardenLink
            href="/?view=rhythm"
            className="hover:text-foreground transition-colors"
          >
            rhythm
          </GardenLink>
          <GardenLink
            href="/?view=tasks"
            className="hover:text-foreground transition-colors"
          >
            taskwarrior
          </GardenLink>
          <GardenLink
            href="/?view=changelog"
            className="hover:text-foreground transition-colors"
          >
            changelog
          </GardenLink>
          <GardenLink
            href="/?view=colophon"
            className="hover:text-foreground transition-colors"
          >
            colophon
          </GardenLink>
          <InstallButton />
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
          © {year} xnocode · All Rights Reserved
        </div>
      </div>
    </footer>
  );
}
