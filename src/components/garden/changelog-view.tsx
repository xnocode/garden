"use client";

import { GitCommit, Sparkles, Layers, ShieldCheck, CheckCircle2, Calendar, Tag } from "lucide-react";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  badge?: string;
  category?: "feature" | "ai" | "core" | "security" | string;
  changes: string[];
}

interface ChangelogViewProps {
  entries: ChangelogEntry[];
}

export function ChangelogView({ entries }: ChangelogViewProps) {
  return (
    <div className="garden-fade-in mx-auto max-w-4xl">
      {/* Header */}
      <header className="mb-10 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-garden/10 text-garden ring-1 ring-garden/30">
            <GitCommit className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-heading">
              Changelog
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Official release notes and website feature updates.
            </p>
          </div>
        </div>
      </header>

      {/* Timeline entries */}
      <div className="relative space-y-8 before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/60 sm:before:left-6">
        {entries.map((entry, idx) => (
          <div key={entry.version} className="relative flex gap-4 sm:gap-6">
            {/* Timeline point */}
            <div className="relative z-10 flex h-8 w-8 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm text-garden">
              {entry.category === "ai" ? (
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
              ) : entry.category === "security" ? (
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
              ) : entry.category === "core" ? (
                <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              ) : (
                <GitCommit className="h-4 w-4 sm:h-5 sm:w-5 text-garden" />
              )}
            </div>

            {/* Entry card */}
            <div className="flex-1 rounded-xl border border-border bg-surface/50 p-5 sm:p-6 shadow-sm backdrop-blur-sm transition-all hover:border-garden/30">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-garden">
                    {entry.version}
                  </span>
                  {entry.badge && (
                    <span className="inline-flex items-center rounded-md bg-garden/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-garden ring-1 ring-inset ring-garden/30">
                      {entry.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{entry.date}</span>
                </div>
              </div>

              <h2 className="mt-3 font-serif text-xl font-semibold text-heading">
                {entry.title}
              </h2>

              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {entry.changes.map((change, cIdx) => (
                  <li key={cIdx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-garden/70" />
                    <span className="leading-relaxed">{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
