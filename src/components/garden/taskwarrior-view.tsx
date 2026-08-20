"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ListChecks,
  Clock,
  TrendingUp,
  CheckCircle2,
  Circle,
  Target,
  Trophy,
  Flame,
  Shield,
  Moon,
} from "lucide-react";
import {
  calculatePlayerProfile,
  type PlayerProfile,
  type TaskSnapshot as RpgTaskSnapshot,
} from "@/lib/life-rpg-engine";

interface TaskData {
  id: number;
  description: string;
  project: string | null;
  tags: string[];
  priority: string | null;
  due: string | null;
  entry: string | null;
  urgency: number;
  overdue?: boolean;
}

export interface CompletedTaskData {
  id?: number;
  uuid?: string;
  description: string;
  project: string | null;
  tags: string[];
  priority: string | null;
  due: string | null;
  entry: string | null;
  end: string | null;
  urgency?: number;
  xpAwarded: number;
  xpPenalty?: number;  // negative; only on missed (overdue-completed) tasks
  wasMissed?: boolean;
}

interface TaskSnapshot {
  exportedAt: string;
  stats: {
    total: number;
    pending: number;
    completed: number;
    overdue?: number;
  };
  tasks: TaskData[];
  completedTasks?: CompletedTaskData[];
}

/* ── helpers ── */

function calcAge(entryStr: string | null): string {
  if (!entryStr) return "";
  const m = entryStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return "";
  const entry = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  const now = new Date();
  const diffMs = now.getTime() - entry.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

function formatXp(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M XP`;
  if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}k XP`;
  return `${xp} XP`;
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const m = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function urgencyColor(urg: number): string {
  if (urg >= 10) return "text-red-400";
  if (urg >= 5) return "text-amber-400";
  if (urg >= 2) return "text-green-400";
  return "text-blue-400";
}

function priorityLabel(p: string | null): string {
  if (!p) return "";
  return p; // H, M, L — same as taskwarrior
}

function priorityColor(p: string | null): string {
  if (p === "H") return "text-red-400";
  if (p === "M") return "text-amber-400";
  if (p === "L") return "text-blue-400";
  return "text-muted-foreground/40";
}

/* ── component ── */

export function TaskwarriorView({ data, writingStats }: { data: TaskSnapshot; writingStats?: any }) {
  const { stats, tasks, exportedAt, completedTasks = [] } = data;
  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const exportDate = new Date(exportedAt);
  const formattedDate = exportDate.toLocaleDateString("en-US", {
    timeZone: "Asia/Dhaka",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // RPG Profile
  const profile = useMemo(() => calculatePlayerProfile(data as RpgTaskSnapshot, writingStats), [data, writingStats]);

  return (
    <div className="garden-fade-in mx-auto max-w-4xl space-y-8">
      {/* ── Page Header ── */}
      <header className="border-b border-border pb-6">
        <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-heading">
          <ListChecks className="h-7 w-7 text-garden" />
          Taskwarrior
        </h1>
        <p className="mt-2 text-muted-foreground">
          Task completion, study projects, and workflow — tracked with taskwarrior.
        </p>
      </header>

      {/* ── Metric Summary Grid (Mobile & Android Optimized) ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
        {/* Metric 1: Level & XP Progress */}
        <div className="rounded-xl border border-border bg-surface/30 p-3 sm:p-4 transition-all hover:border-garden/30 hover:bg-surface/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono text-muted-foreground">
              <span>Lvl {profile.level}</span>
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-garden" />
            </div>
            <div className="mt-1 font-serif text-base sm:text-lg font-bold text-heading truncate" title={profile.title}>
              {profile.title}
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 space-y-1">
            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-muted-foreground">
              <span>XP Progress</span>
              <span className="font-semibold text-garden">{profile.levelProgressPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-garden to-emerald-400 transition-all duration-700"
                style={{ width: `${profile.levelProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Task Completion */}
        <div className="rounded-xl border border-border bg-surface/30 p-3 sm:p-4 transition-all hover:border-garden/30 hover:bg-surface/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono text-muted-foreground">
            <span>Completion</span>
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-garden" />
          </div>
          <div className="mt-1.5 sm:mt-2 font-mono text-xl sm:text-2xl font-bold text-heading">
            {completionRate}%
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground/70 truncate">
            {stats.completed} of {stats.total} done
          </div>
        </div>

        {/* Metric 3: Remaining Tasks */}
        <div className="rounded-xl border border-border bg-surface/30 p-3 sm:p-4 transition-all hover:border-garden/30 hover:bg-surface/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono text-muted-foreground">
            <span>Remaining</span>
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 font-mono text-xl sm:text-2xl font-bold text-amber-400">
            {stats.pending}
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground/70 truncate">
            {(stats.overdue ?? 0) > 0 ? `${stats.overdue} missed` : "all on track"}
          </div>
        </div>

        {/* Metric 4: Streak & XP */}
        <div className="rounded-xl border border-border bg-surface/30 p-3 sm:p-4 transition-all hover:border-garden/30 hover:bg-surface/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono text-muted-foreground">
            <span>Rhythm Streak</span>
            <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 animate-pulse" />
          </div>
          <div className="mt-1.5 sm:mt-2 font-mono text-xl sm:text-2xl font-bold text-amber-400">
            {profile.streakDays}d
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground/70 truncate">
            {profile.streakDays > 0 ? "active rhythm" : "no streak"}
          </div>
        </div>
      </div>

      {/* ── Pending Tasks ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-amber-400" />
            <h2 className="font-serif text-lg font-semibold text-heading">
              Pending Tasks
            </h2>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {tasks.length}
            </span>
          </div>
          <span className="font-mono text-xs text-muted-foreground/60">
            {(stats.overdue ?? 0) > 0 ? `${stats.overdue} overdue` : "all on schedule"}
          </span>
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-[10px] font-mono text-muted-foreground/50 sm:hidden">
              <span>Tasks Queue</span>
              <span>← scroll table →</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-[#0c0c0f] touch-pan-x scrollbar-thin">
              <table className="w-full border-collapse font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/40 text-left">
                    <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      ID
                    </th>
                    <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Age
                    </th>
                    <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      P
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Project
                    </th>
                    <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Due
                    </th>
                    <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Description
                    </th>
                    <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-right text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Urg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, i) => (
                    <tr
                      key={task.id}
                      className={`border-b transition-colors ${
                        task.overdue
                          ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                          : `border-border/50 hover:bg-surface/30 ${i % 2 === 0 ? "bg-transparent" : "bg-surface/10"}`
                      }`}
                    >
                      <td className={`whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 ${ task.overdue ? "text-red-400/70" : "text-foreground/80" }`}>
                        {task.overdue ? (
                          <span className="flex items-center gap-1">
                            <span className="text-red-400">!</span>{task.id}
                          </span>
                        ) : task.id}
                      </td>
                      <td className="whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 text-muted-foreground">
                        {calcAge(task.entry)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 font-semibold ${priorityColor(
                          task.priority
                        )}`}
                      >
                        {priorityLabel(task.priority)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 sm:py-2.5 text-garden">
                        {task.project || ""}
                      </td>
                      <td className={`whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 ${ task.overdue ? "text-red-400 font-semibold" : "text-amber-300/80" }`}>
                        {formatDueDate(task.due)}
                      </td>
                      <td className="px-2.5 sm:px-4 py-2 sm:py-2.5 text-foreground min-w-[200px] sm:min-w-0">
                        <span className="flex items-center gap-2">
                          {task.overdue && (
                            <span className="inline-flex items-center rounded border border-red-500/30 bg-red-500/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
                              MISSED
                            </span>
                          )}
                          {task.description}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 text-right font-semibold ${urgencyColor(
                          task.urgency
                        )}`}
                      >
                        {task.urgency.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Task count footer like real taskwarrior */}
              <div className="border-t border-border bg-surface/20 px-3 sm:px-4 py-2 text-[11px] sm:text-xs text-muted-foreground/60 font-mono">
                {tasks.length} pending task{tasks.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/10 py-12 text-center">
            <CheckCircle2 className="h-9 w-9 text-green-400/30" />
            <p className="mt-3 font-serif text-base text-heading">All clear</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              No pending tasks right now. Great job staying on top of things!
            </p>
          </div>
        )}
      </div>

      {/* ── Recently Completed Tasks (XP Harvested) ── */}
      {completedTasks && completedTasks.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <h2 className="font-serif text-lg font-semibold text-heading">
                Recently Completed Tasks
              </h2>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-mono text-xs text-emerald-400">
                Last {completedTasks.length}
              </span>
            </div>
            <span className="font-mono text-xs text-emerald-400/80 flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              XP Harvested · <span className="text-red-400/80">red = penalty</span>
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-[#0c0c0f] touch-pan-x scrollbar-thin">
            <table className="w-full border-collapse font-mono text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/40 text-left">
                  <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Done
                  </th>
                  <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Finished
                  </th>
                  <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    P
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Project
                  </th>
                  <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </th>
                  <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-right text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    XP Collected
                  </th>
                </tr>
              </thead>
              <tbody>
                {completedTasks.map((task, i) => (
                  <tr
                    key={task.uuid || task.id || i}
                    className={`border-b transition-colors ${
                      task.wasMissed
                        ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                        : `border-border/40 hover:bg-emerald-500/5 ${i % 2 === 0 ? "bg-transparent" : "bg-surface/10"}`
                    }`}
                  >
                    <td className={`whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 ${ task.wasMissed ? "text-red-400" : "text-emerald-400" }`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </td>
                    <td className="whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 text-muted-foreground">
                      {calcAge(task.end) || formatDueDate(task.end) || "done"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 font-semibold ${priorityColor(
                        task.priority
                      )}`}
                    >
                      {priorityLabel(task.priority)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 sm:py-2.5 text-garden">
                      {task.project || ""}
                    </td>
                    <td className="px-2.5 sm:px-4 py-2 sm:py-2.5 text-foreground/90 min-w-[200px] sm:min-w-0">
                      <span className="flex items-center gap-2">
                        {task.wasMissed && (
                          <span className="inline-flex items-center rounded border border-red-500/30 bg-red-500/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
                            LATE
                          </span>
                        )}
                        <span className={`line-through decoration-muted-foreground/40 ${ task.wasMissed ? "text-red-400/70" : "text-muted-foreground/80 hover:text-foreground" } transition-colors`}>
                          {task.description}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 text-right">
                      {task.wasMissed ? (
                        <span className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-red-400 shadow-sm">
                          {task.xpPenalty ?? 0} XP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400 shadow-sm">
                          +{task.xpAwarded || 150} XP
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-border bg-surface/20 px-3 sm:px-4 py-2 text-[11px] sm:text-xs text-muted-foreground/60 font-mono flex items-center justify-between">
              <span>Showing {completedTasks.length} most recent completed tasks</span>
              <span className="text-emerald-400/80">{stats.completed} total completed all time</span>
            </div>
          </div>
        </div>
      )}

      {/* Updated at */}
      <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/35">
        <Clock className="h-3 w-3" />
        <span>Snapshot from {formattedDate}</span>
      </div>
    </div>
  );
}
