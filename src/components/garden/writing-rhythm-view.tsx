"use client";

import Link from "next/link";
import { Flame, Calendar, Target, Activity } from "lucide-react";
import type { WritingStatsSummary } from "@/lib/writing-stats";

export function WritingRhythmView({ stats }: { stats: WritingStatsSummary }) {
  const {
    currentStreak,
    longestStreak,
    todayWords,
    dailyGoal,
    totalActiveDays,
    totalWordsRecorded,
    avgWordsPerActiveDay,
    last30Days,
  } = stats;

  const maxWords = Math.max(1, ...last30Days.map((d) => d.words));
  const goalPct = Math.min(100, Math.round((todayWords / dailyGoal) * 100));

  return (
    <div className="garden-fade-in mx-auto max-w-4xl space-y-10">
      {/* Header */}
      <header className="border-b border-border pb-6">
        <nav className="mb-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-garden">
            ← back to garden
          </Link>
        </nav>
        <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-heading">
          <Flame className="h-7 w-7 text-garden" />
          Writing Rhythm
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tracked via Obsidian <span className="font-mono text-garden">keep-the-rhythm</span> — daily note-taking habit, writing velocity, and active streaks.
        </p>
      </header>

      {/* Summary stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center">
          <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
            {currentStreak} <span className="text-xs font-mono text-muted-foreground">days</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            current streak
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center">
          <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
            {longestStreak} <span className="text-xs font-mono text-muted-foreground">days</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            longest streak
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center">
          <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
            {todayWords.toLocaleString()} <span className="text-xs font-mono text-muted-foreground">words</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            today&apos;s output
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center">
          <div className="font-serif text-2xl font-semibold text-heading sm:text-3xl">
            {avgWordsPerActiveDay.toLocaleString()} <span className="text-xs font-mono text-muted-foreground">w/day</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            active pace
          </div>
        </div>
      </div>

      {/* Target Progress */}
      <section className="rounded-lg border border-border bg-surface/30 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold text-heading">
          <Target className="h-5 w-5 text-garden" />
          Daily Target Progress
        </h2>

        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
          <span>{todayWords} of {dailyGoal} words written today</span>
          <span>{goalPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface border border-border">
          <div
            className="h-full rounded-full bg-garden transition-all duration-300"
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </section>

      {/* 30-Day Grid */}
      <section className="rounded-lg border border-border bg-surface/30 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold text-heading">
          <Calendar className="h-5 w-5 text-garden" />
          30-Day Activity History
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 md:grid-cols-6">
          {last30Days.map((d) => (
            <div
              key={d.date}
              className={`rounded-md border p-3 text-center transition-colors ${
                d.goalMet
                  ? "border-garden/40 bg-garden/10"
                  : d.words > 0
                  ? "border-border bg-surface/60"
                  : "border-border/40 bg-surface/10 opacity-60"
              }`}
            >
              <div className="text-[10px] font-mono text-muted-foreground">
                {d.formattedDate}
              </div>
              <div className="mt-1 font-serif text-base font-semibold text-heading">
                {d.words}
              </div>
              <div className="mt-0.5 text-[9px] font-mono text-muted-foreground/70">
                {d.words > 0 ? "words" : "0 words"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Totals */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface/30 p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-garden" />
            Total Active Days
          </div>
          <div className="mt-2 font-serif text-3xl font-semibold text-heading">
            {totalActiveDays} <span className="text-xs font-mono text-muted-foreground">days</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface/30 p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-garden" />
            Total Words Recorded
          </div>
          <div className="mt-2 font-serif text-3xl font-semibold text-heading">
            {totalWordsRecorded.toLocaleString()} <span className="text-xs font-mono text-muted-foreground">words</span>
          </div>
        </div>
      </section>
    </div>
  );
}
