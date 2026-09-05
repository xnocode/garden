"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ListChecks,
  Clock,
  CheckCircle2,
  Circle,
  Trophy,
  Flame,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  Loader2,
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
  daysLate?: number;
  daysEarly?: number;
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
  isBlurred?: boolean;
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

/** Projected XP for a still-pending task:
 *  - Overdue   → negative penalty scaled by days late (+50%/day, capped 10×)
 *  - On due day→ base reward (no bonus/penalty)
 *  - Early     → positive reward boosted by days early (+30%/day, capped 3×)
 */
function calcPendingXp(task: TaskData): { xp: number; daysLate: number; daysEarly: number } {
  // Base reward
  let base = 150;
  if (task.priority === "H") base += 100;
  else if (task.priority === "M") base += 50;
  else if (task.priority === "L") base += 20;

  // ── Overdue path ──
  if (task.overdue && task.due) {
    const m = task.due.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (!m) return { xp: base, daysLate: 0, daysEarly: 0 };
    const dueDate = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
    const daysLate = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / 86_400_000));
    let penaltyBase = 200;
    if (task.priority === "H") penaltyBase += 150;
    else if (task.priority === "M") penaltyBase += 50;
    else if (task.priority === "L") penaltyBase += 20;
    const scale = Math.min(10, 1 + daysLate * 0.5);
    return { xp: -Math.round(penaltyBase * scale), daysLate, daysEarly: 0 };
  }

  // ── Early path: task has a future due date ──
  if (!task.overdue && task.due) {
    const m = task.due.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (m) {
      const dueDate = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
      const daysEarly = Math.max(0, Math.floor((dueDate.getTime() - Date.now()) / 86_400_000));
      if (daysEarly > 0) {
        const scale = Math.min(3, 1 + daysEarly * 0.3);
        return { xp: Math.round(base * scale), daysLate: 0, daysEarly };
      }
    }
  }

  // On due day or no due date — plain base
  return { xp: base, daysLate: 0, daysEarly: 0 };
}

/* ── component ── */

export function TaskwarriorView({ data, writingStats }: { data: TaskSnapshot; writingStats?: any }) {
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [taskData, setTaskData] = useState<TaskSnapshot>(data);
  // Initialise from SSR data so blur/visibility is correct on first paint.
  // page.tsx already pre-masks descriptions when tasks are private.
  const [isPublic, setIsPublic] = useState<boolean>(!data.isBlurred);
  const [isPageToggling, setIsPageToggling] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Fetch live tasks & visibility settings
  const refreshTasks = useCallback(async () => {
    try {
      const [tasksRes, settingsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/tasks/settings"),
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setIsPublic(Boolean(s.publicTasks));
      }

      if (tasksRes.ok) {
        const t = await tasksRes.json();
        setTaskData(t);
      }
    } catch {
      // Use fallback
    } finally {
      setIsMounted(true);
    }
  }, []);

  useEffect(() => {
    refreshTasks();
    const handlePrivacyChange = () => {
      refreshTasks();
    };
    window.addEventListener("taskwarrior-privacy-changed", handlePrivacyChange);
    return () => {
      window.removeEventListener("taskwarrior-privacy-changed", handlePrivacyChange);
    };
  }, [refreshTasks, session]);

  // Inline page-level toggle (admin only)
  const handlePageToggle = useCallback(async () => {
    if (isPageToggling) return;
    setIsPageToggling(true);
    const nextVal = !isPublic;
    try {
      const res = await fetch("/api/tasks/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicTasks: nextVal }),
      });
      if (res.ok) {
        setIsPublic(nextVal);
        window.dispatchEvent(new CustomEvent("taskwarrior-privacy-changed"));
      }
    } catch {
      // ignore
    } finally {
      setIsPageToggling(false);
    }
  }, [isPageToggling, isPublic]);

  const { stats, tasks = [], exportedAt, completedTasks = [] } = taskData;
  // Don't apply blur while the session is still resolving — prevents a flash
  // of blurred rows for admins whose session loads after first paint.
  const isBlurred = sessionStatus !== "loading" && !isPublic && !isAdmin;

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
  const profile = useMemo(() => calculatePlayerProfile(taskData as RpgTaskSnapshot, writingStats), [taskData, writingStats]);

  // Completed Tasks Pagination (10 per page, newest first)
  const [completedPage, setCompletedPage] = useState(1);
  const COMPLETED_PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(completedTasks.length / COMPLETED_PAGE_SIZE));
  const validPage = Math.min(completedPage, totalPages);

  const pagedCompleted = useMemo(() => {
    const start = (validPage - 1) * COMPLETED_PAGE_SIZE;
    return completedTasks.slice(start, start + COMPLETED_PAGE_SIZE);
  }, [completedTasks, validPage]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (validPage <= 3) {
      return [1, 2, 3, 4, "…", totalPages];
    }
    if (validPage >= totalPages - 2) {
      return [1, "…", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "…", validPage - 1, validPage, validPage + 1, "…", totalPages];
  }, [validPage, totalPages]);

  return (
    <div className="garden-fade-in mx-auto max-w-4xl space-y-8">
      {/* ── Page Header ── */}
      <header className="border-b border-border pb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-heading">
            <ListChecks className="h-7 w-7 text-garden" />
            Taskwarrior
          </h1>

          {/* Privacy toggle — admin only */}
          {isAdmin && (
            <button
              type="button"
              onClick={handlePageToggle}
              disabled={isPageToggling}
              className={`group mt-1 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                isPublic
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              } disabled:pointer-events-none disabled:opacity-60`}
              title={isPublic ? "Tasks are public — click to make private" : "Tasks are private — click to make public"}
            >
              {isPageToggling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isPublic ? (
                <Globe className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{isPublic ? "Public" : "Private"}</span>
              {/* Pill toggle track */}
              <span
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  isPublic ? "bg-emerald-500" : "bg-surface-2 border border-border"
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                    isPublic ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          )}
        </div>
        <p className="mt-2 text-muted-foreground">
          Task completion, study projects, and workflow — tracked with taskwarrior.
        </p>
      </header>

      {/* ── Metric Summary Grid ── */}
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
              <span>→ Lvl {profile.level + 1}</span>
              <span className="font-semibold text-garden">{profile.levelProgressPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-garden to-emerald-400 transition-all duration-700"
                style={{ width: `${profile.levelProgressPct}%` }}
              />
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono text-muted-foreground/50">
              {(profile.nextLevelXp - profile.currentLevelXp).toLocaleString()} XP to next level
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

        {sessionStatus === "loading" || !isMounted ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-surface/10 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-garden" />
          </div>
        ) : tasks.length > 0 ? (
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
                    <th className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-right text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      XP
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
                        {isBlurred ? (
                          <span className="inline-block h-3.5 w-14 select-none rounded bg-garden/15 backdrop-blur-md opacity-70 filter blur-[2px]" />
                        ) : (
                          task.project || ""
                        )}
                      </td>
                      <td className={`whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 ${ task.overdue ? "text-red-400 font-semibold" : "text-amber-300/80" }`}>
                        {formatDueDate(task.due)}
                      </td>
                      <td className="px-2.5 sm:px-4 py-2 sm:py-2.5 text-foreground min-w-[200px] sm:min-w-0">
                        <span className="flex items-center gap-2">
                          {task.overdue && !isBlurred && (
                            <span className="inline-flex items-center rounded border border-red-500/30 bg-red-500/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
                              MISSED
                            </span>
                          )}
                          {isBlurred ? (
                            <span
                              className="inline-block h-3.5 select-none rounded bg-surface-2/70 backdrop-blur-md opacity-60 filter blur-[2px]"
                              style={{ width: `${80 + ((task.id * 31) % 120)}px`, maxWidth: "100%" }}
                            />
                          ) : (
                            <span>{task.description}</span>
                          )}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 text-right font-semibold ${urgencyColor(
                          task.urgency
                        )}`}
                      >
                        {task.urgency.toFixed(1)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 text-right">
                        {(() => {
                          const { xp, daysLate, daysEarly } = calcPendingXp(task);
                          if (xp < 0) return (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-red-400"
                              title={`${daysLate}d late — penalty scales +50%/day`}
                            >
                              {xp}
                            </span>
                          );
                          if (daysEarly > 0) return (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300"
                              title={`${daysEarly}d early — bonus scales +30%/day`}
                            >
                              +{xp} ⚡
                            </span>
                          );
                          return (
                            <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
                              +{xp}
                            </span>
                          );
                        })()}
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

      {/* ── Completed Tasks (XP Harvested) with 10-Item Pagination ── */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h2 className="font-serif text-lg font-semibold text-heading">
              Completed Tasks
            </h2>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {completedTasks.length}
            </span>
          </div>
          <span className="font-mono text-xs text-emerald-400/80 flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" />
            XP Harvested · <span className="text-red-400/80">red = penalty</span>
          </span>
        </div>

        {sessionStatus === "loading" || !isMounted ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-surface/10 py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-garden" />
          </div>
        ) : completedTasks && completedTasks.length > 0 ? (
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
                {pagedCompleted.map((task, i) => (
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
                      {isBlurred ? (
                        <span className="inline-block h-3.5 w-14 select-none rounded bg-garden/15 backdrop-blur-md opacity-70 filter blur-[2px]" />
                      ) : (
                        task.project || ""
                      )}
                    </td>
                    <td className="px-2.5 sm:px-4 py-2 sm:py-2.5 text-foreground/90 min-w-[200px] sm:min-w-0">
                      <span className="flex items-center gap-2">
                        {!isBlurred && task.wasMissed && (
                          <span className="inline-flex items-center rounded border border-red-500/30 bg-red-500/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
                            LATE
                          </span>
                        )}
                        {!isBlurred && !task.wasMissed && (task.daysEarly ?? 0) > 0 && (
                          <span
                            className="inline-flex items-center rounded border border-amber-400/30 bg-amber-400/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300"
                            title={`Completed ${task.daysEarly}d early`}
                          >
                            EARLY ⚡
                          </span>
                        )}
                        {isBlurred ? (
                          <span
                            className="inline-block h-3.5 select-none rounded bg-surface-2/70 backdrop-blur-md opacity-60 filter blur-[2px]"
                            style={{ width: `${90 + (((task.id || i + 1) * 29) % 110)}px`, maxWidth: "100%" }}
                          />
                        ) : (
                          <span className={`line-through decoration-muted-foreground/40 ${ task.wasMissed ? "text-red-400/70" : "text-muted-foreground/80 hover:text-foreground" } transition-colors`}>
                            {task.description}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2.5 sm:px-4 py-2 sm:py-2.5 text-right">
                      {task.wasMissed ? (
                        <span className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-red-400 shadow-sm">
                          {task.xpPenalty ?? 0} XP
                        </span>
                      ) : (task.daysEarly ?? 0) > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300 shadow-sm"
                          title={`${task.daysEarly}d early — +30%/day bonus`}
                        >
                          +{task.xpAwarded} XP ⚡
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

            {/* Pagination Controls & Item Range */}
            <div className="border-t border-border bg-surface/20 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs text-muted-foreground/80 font-mono flex flex-wrap items-center justify-between gap-2">
              <div>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {(validPage - 1) * COMPLETED_PAGE_SIZE + 1}–
                  {Math.min(validPage * COMPLETED_PAGE_SIZE, completedTasks.length)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{completedTasks.length}</span> completed tasks
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
                    disabled={validPage <= 1}
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-medium transition hover:border-garden hover:text-garden disabled:pointer-events-none disabled:opacity-40"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Prev
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {pageNumbers.map((p, idx) =>
                      typeof p === "number" ? (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCompletedPage(p)}
                          className={`min-w-[24px] rounded border px-1.5 py-0.5 text-center text-[11px] font-medium transition ${
                            p === validPage
                              ? "border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-400"
                              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      ) : (
                        <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground/40">
                          …
                        </span>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCompletedPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage >= totalPages}
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-medium transition hover:border-garden hover:text-garden disabled:pointer-events-none disabled:opacity-40"
                    title="Next page"
                  >
                    Next
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/10 py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400/30" />
            <p className="mt-2.5 font-serif text-sm text-heading">No completed tasks recorded yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Finished tasks from Taskwarrior will appear here with harvested XP and completion timing.
            </p>
          </div>
        )}
      </div>

      {/* Updated at */}
      <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/35">
        <Clock className="h-3 w-3" />
        <span>Snapshot from {formattedDate}</span>
      </div>
    </div>
  );
}
