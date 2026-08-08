"use client";

import Link from "next/link";
import { Flame, ArrowRight } from "lucide-react";
import type { WritingStatsSummary } from "@/lib/writing-stats";

export function WritingRhythmWidget({ stats }: { stats: WritingStatsSummary }) {
  const {
    currentStreak,
    longestStreak,
    todayWords,
    dailyGoal,
    last30Days,
    avgWordsPerActiveDay,
  } = stats;

  const goalPct = Math.min(100, Math.round((todayWords / dailyGoal) * 100));
  const maxWords30 = Math.max(1, ...last30Days.map((d) => d.words));

  return (
    <section className="mb-14">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-heading">
          <Flame className="h-5 w-5 text-garden" />
          Writing rhythm
        </h2>
        <Link
          href="/?view=rhythm"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-garden transition-colors"
        >
          view rhythm analytics <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface/30 p-5">
        {/* Top summary stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pb-5 border-b border-border">
          <div className="text-center">
            <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
              {currentStreak} <span className="text-xs font-mono font-normal text-muted-foreground">days</span>
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              current streak
            </div>
          </div>

          <div className="text-center">
            <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
              {todayWords.toLocaleString()} <span className="text-xs font-mono font-normal text-muted-foreground">words</span>
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              today&apos;s output
            </div>
          </div>

          <div className="text-center">
            <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
              {longestStreak} <span className="text-xs font-mono font-normal text-muted-foreground">days</span>
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              longest streak
            </div>
          </div>

          <div className="text-center">
            <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
              {avgWordsPerActiveDay.toLocaleString()} <span className="text-xs font-mono font-normal text-muted-foreground">w/day</span>
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              avg active pace
            </div>
          </div>
        </div>

        {/* Daily Progress */}
        <div className="pt-4 pb-3">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
            <span>daily target: {dailyGoal} words</span>
            <span>{todayWords} / {dailyGoal} words ({goalPct}%)</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface border border-border">
            <div
              className="h-full rounded-full bg-garden transition-all duration-300 ease-out"
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </div>

        {/* 30-Day Activity Bar Chart */}
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              writing output past 30 days
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              keep the rhythm
            </span>
          </div>
          <div className="flex h-14 items-end gap-1">
            {last30Days.map((d) => {
              const heightPct = d.words > 0 ? Math.max(12, Math.round((d.words / maxWords30) * 100)) : 6;
              return (
                <div
                  key={d.date}
                  className="group relative flex flex-1 flex-col items-center h-full justify-end"
                >
                  <div
                    className={`w-full rounded-xs transition-colors ${
                      d.words > 0
                        ? d.goalMet
                          ? "bg-garden"
                          : "bg-garden/60"
                        : "bg-border/40"
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground shadow-sm group-hover:block z-10 whitespace-nowrap">
                    {d.formattedDate}: {d.words} words
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
