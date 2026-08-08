"use client";

import Link from "next/link";
import { Flame, Trophy, Calendar, Target, Activity, Zap, Sprout, ArrowLeft, CheckCircle2 } from "lucide-react";
import type { WritingStatsSummary } from "@/lib/writing-stats";

export function WritingRhythmView({ stats }: { stats: WritingStatsSummary }) {
  const {
    currentStreak,
    longestStreak,
    todayWords,
    dailyGoal,
    todayGoalMet,
    totalActiveDays,
    totalWordsRecorded,
    avgWordsPerActiveDay,
    last30Days,
  } = stats;

  const maxWords = Math.max(1, ...last30Days.map((d) => d.words));
  const goalPct = Math.min(100, Math.round((todayWords / dailyGoal) * 100));

  return (
    <div className="garden-fade-in mx-auto max-w-4xl space-y-8">
      {/* Top Header */}
      <header className="border-b border-border pb-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-garden transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Garden
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-500">
            <Flame className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-heading">
              Writing Rhythm & Habits
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Powered by Obsidian <span className="font-mono text-garden font-medium">keep-the-rhythm</span> — tracking writing consistency, word velocity, and streak momentum over time.
            </p>
          </div>
        </div>
      </header>

      {/* Main Stats Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-center backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-center gap-1 text-xs font-mono uppercase tracking-wider text-amber-500 font-semibold">
            <Flame className="h-4 w-4" /> Current Streak
          </div>
          <div className="mt-2 font-serif text-4xl font-extrabold text-amber-500">
            {currentStreak} <span className="text-sm font-sans font-normal text-muted-foreground">days</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Keep writing daily to hold the flame!
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/50 p-5 text-center backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-center gap-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <Trophy className="h-4 w-4 text-amber-400" /> Longest Streak
          </div>
          <div className="mt-2 font-serif text-4xl font-extrabold text-heading">
            {longestStreak} <span className="text-sm font-sans font-normal text-muted-foreground">days</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            All-time consistency record
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/50 p-5 text-center backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-center gap-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <Zap className="h-4 w-4 text-garden" /> Words Today
          </div>
          <div className="mt-2 font-serif text-4xl font-extrabold text-heading">
            {todayWords.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Goal: {dailyGoal} words/day
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/50 p-5 text-center backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-center gap-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <Activity className="h-4 w-4 text-chart-3" /> Average Output
          </div>
          <div className="mt-2 font-serif text-4xl font-extrabold text-heading">
            {avgWordsPerActiveDay.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Words written per active day
          </p>
        </div>
      </div>

      {/* Today's Goal Progress Card */}
      <section className="rounded-2xl border border-garden/30 bg-surface/40 p-6 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-garden" />
            <h2 className="font-serif text-xl font-semibold text-heading">
              Today&apos;s Writing Goal
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {todayGoalMet ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Goal Achieved!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                {dailyGoal - todayWords} words remaining
              </span>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 font-mono">
            <span>Progress: {todayWords} words</span>
            <span>Target: {dailyGoal} words ({goalPct}%)</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-garden to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* 30-Day Activity History */}
      <section className="rounded-2xl border border-border bg-surface/40 p-6 backdrop-blur-md shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold text-heading">
          <Calendar className="h-5 w-5 text-garden" />
          30-Day Writing Activity Log
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 md:grid-cols-6">
          {last30Days.map((d) => (
            <div
              key={d.date}
              className={`rounded-xl border p-3 text-center transition-all ${
                d.goalMet
                  ? "border-garden/40 bg-garden/10"
                  : d.words > 0
                  ? "border-border bg-surface"
                  : "border-border/40 bg-background/30 opacity-60"
              }`}
            >
              <div className="text-[10px] font-mono text-muted-foreground">
                {d.formattedDate}
              </div>
              <div className="mt-1 font-serif text-lg font-bold text-heading">
                {d.words}
              </div>
              <div className="mt-0.5 text-[9px] font-mono text-muted-foreground">
                {d.words > 0 ? `${d.words} words` : "No activity"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lifetime Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface/40 p-5">
          <h3 className="font-serif text-base font-semibold text-heading flex items-center gap-2">
            <Sprout className="h-4 w-4 text-garden" />
            Total Recorded Active Days
          </h3>
          <p className="mt-2 text-3xl font-serif font-bold text-heading">
            {totalActiveDays} <span className="text-sm font-sans font-normal text-muted-foreground">days</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Days with active note creation or updates recorded in your garden.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/40 p-5">
          <h3 className="font-serif text-base font-semibold text-heading flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-500" />
            Total Words Recorded
          </h3>
          <p className="mt-2 text-3xl font-serif font-bold text-heading">
            {totalWordsRecorded.toLocaleString()} <span className="text-sm font-sans font-normal text-muted-foreground">words</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cumulative words written across all garden sessions.
          </p>
        </div>
      </section>
    </div>
  );
}
