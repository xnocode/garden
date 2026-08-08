"use client";

import Link from "next/link";
import { Flame, Trophy, Target, Activity, ArrowRight, Zap } from "lucide-react";
import type { WritingStatsSummary } from "@/lib/writing-stats";

export function WritingRhythmWidget({ stats }: { stats: WritingStatsSummary }) {
  const {
    currentStreak,
    longestStreak,
    todayWords,
    dailyGoal,
    todayGoalMet,
    last30Days,
    avgWordsPerActiveDay,
  } = stats;

  const goalPct = Math.min(100, Math.round((todayWords / dailyGoal) * 100));
  const maxWords30 = Math.max(1, ...last30Days.map((d) => d.words));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-garden/30 bg-surface/40 p-6 backdrop-blur-xl shadow-lg transition-all hover:border-garden/50">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-garden/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-500 shadow-inner">
            <Flame className="h-6 w-6 animate-pulse text-amber-500" />
            {currentStreak > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                {currentStreak}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-heading">
                Writing Rhythm
              </h3>
              <span className="rounded-full border border-garden/40 bg-garden/10 px-2 py-0.5 font-mono text-[10px] font-medium text-garden">
                Keep the Rhythm
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Daily habit tracking & writing velocity
            </p>
          </div>
        </div>

        <Link
          href="/?view=rhythm"
          className="inline-flex items-center gap-1 text-xs font-medium text-garden transition-colors hover:text-garden-hover hover:underline"
        >
          View detailed rhythm <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Grid Stats */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Streak */}
        <div className="rounded-xl border border-border bg-background/50 p-3.5 text-center transition-colors hover:border-amber-500/40">
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            Streak
          </div>
          <div className="mt-1 font-serif text-2xl font-bold text-amber-500 sm:text-3xl">
            {currentStreak} <span className="text-sm font-sans font-normal text-muted-foreground">days</span>
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground/80">
            Best: {longestStreak} days
          </div>
        </div>

        {/* Today's Words */}
        <div className="rounded-xl border border-border bg-background/50 p-3.5 text-center transition-colors hover:border-garden/40">
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-garden" />
            Today
          </div>
          <div className="mt-1 font-serif text-2xl font-bold text-heading sm:text-3xl">
            {todayWords.toLocaleString()} <span className="text-sm font-sans font-normal text-muted-foreground">words</span>
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground/80">
            Goal: {dailyGoal} words
          </div>
        </div>

        {/* Longest streak */}
        <div className="rounded-xl border border-border bg-background/50 p-3.5 text-center transition-colors hover:border-amber-500/40">
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            Record
          </div>
          <div className="mt-1 font-serif text-2xl font-bold text-heading sm:text-3xl">
            {longestStreak} <span className="text-sm font-sans font-normal text-muted-foreground">days</span>
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground/80">
            All-time streak
          </div>
        </div>

        {/* Average per session */}
        <div className="rounded-xl border border-border bg-background/50 p-3.5 text-center transition-colors hover:border-garden/40">
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-chart-3" />
            Pace
          </div>
          <div className="mt-1 font-serif text-2xl font-bold text-heading sm:text-3xl">
            {avgWordsPerActiveDay.toLocaleString()} <span className="text-sm font-sans font-normal text-muted-foreground">w/day</span>
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground/80">
            Active writing pace
          </div>
        </div>
      </div>

      {/* Daily Progress Bar */}
      <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-1.5 text-foreground">
            <Activity className="h-3.5 w-3.5 text-garden" />
            Daily Goal Progress
          </span>
          <span className="font-mono text-muted-foreground">
            {todayWords} / {dailyGoal} words ({goalPct}%)
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-garden to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </div>

      {/* 30-Day Activity Bar Chart */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>30-Day Writing Rhythm</span>
          <span className="font-mono text-[10px]">Past 30 Days</span>
        </div>
        <div className="flex h-16 items-end gap-1.5 rounded-xl border border-border bg-background/30 p-2.5">
          {last30Days.map((d, i) => {
            const heightPct = d.words > 0 ? Math.max(15, Math.round((d.words / maxWords30) * 100)) : 6;
            return (
              <div
                key={d.date}
                className="group relative flex flex-1 flex-col items-center h-full justify-end"
              >
                <div
                  className={`w-full rounded-sm transition-all group-hover:brightness-125 ${
                    d.words > 0
                      ? d.goalMet
                        ? "bg-garden"
                        : "bg-garden/50"
                      : "bg-muted/40"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded-md bg-popover px-2 py-1 text-[10px] font-mono text-popover-foreground shadow-md group-hover:block z-20 whitespace-nowrap border border-border">
                  {d.formattedDate}: {d.words} words
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
