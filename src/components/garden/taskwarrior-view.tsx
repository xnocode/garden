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

function getDhakaTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function checkIsOverdue(task: TaskData, todayDhakaStr: string): boolean {
  if (task.overdue) return true;
  if (!task.due) return false;
  const dueDhakaStr = formatDueDate(task.due);
  if (!dueDhakaStr) return false;
  return dueDhakaStr < todayDhakaStr;
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

function calcCalendarDaysDiff(dateStrA: string, dateStrB: string): number {
  if (!dateStrA || !dateStrB) return 0;
  const [y1, m1, d1] = dateStrA.split("-").map(Number);
  const [y2, m2, d2] = dateStrB.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

/** Projected XP for completing a pending task TODAY:
 *  - Overdue   → negative penalty scaled by days late (+50%/day, capped 10×)
 *  - On due day→ base reward (no bonus/penalty)
 *  - Early     → positive reward boosted by days early (+30%/day, capped 3×)
 */
function calcPendingXp(
  task: TaskData,
  isOverdue: boolean = false,
  todayDhakaStr: string = getDhakaTodayStr()
): { xp: number; daysLate: number; daysEarly: number; isDueToday: boolean } {
  // Base reward
  let base = 150;
  if (task.priority === "H") base += 100;
  else if (task.priority === "M") base += 50;
  else if (task.priority === "L") base += 20;

  if (!task.due) {
    return { xp: base, daysLate: 0, daysEarly: 0, isDueToday: false };
  }

  const dueDhakaStr = formatDueDate(task.due);
  if (!dueDhakaStr) {
    return { xp: base, daysLate: 0, daysEarly: 0, isDueToday: false };
  }

  const diffDays = calcCalendarDaysDiff(dueDhakaStr, todayDhakaStr);
  const effectiveOverdue = Boolean(task.overdue || isOverdue || diffDays < 0);

  // ── Overdue path (due date was in the past) ──
  if (effectiveOverdue && diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    let penaltyBase = 200;
    if (task.priority === "H") penaltyBase += 150;
    else if (task.priority === "M") penaltyBase += 50;
    else if (task.priority === "L") penaltyBase += 20;
    const extraDays = Math.max(0, daysLate - 1);
    const scale = Math.min(10, 1 + extraDays * 0.5);
    return { xp: -Math.round(penaltyBase * scale), daysLate, daysEarly: 0, isDueToday: false };
  }

  // ── Early path: deadline is in the future (diffDays > 0) ──
  if (diffDays > 0) {
    const daysEarly = diffDays;
    const scale = Math.min(3, 1 + daysEarly * 0.3);
    return { xp: Math.round(base * scale), daysLate: 0, daysEarly, isDueToday: false };
  }

  // ── On due day (diffDays === 0) ──
  return { xp: base, daysLate: 0, daysEarly: 0, isDueToday: true };
}

/* ── component ── */

export function TaskwarriorView({ data, writingStats }: { data: TaskSnapshot; writingStats?: any }) {
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [taskData, setTaskData] = useState<TaskSnapshot>(data);
  const [currentDhakaDate, setCurrentDhakaDate] = useState<string>(getDhakaTodayStr);

  // Daily interval check so remaining days and 'Finish Today' XP auto-updates across midnight
  useEffect(() => {
    const interval = setInterval(() => {
      const today = getDhakaTodayStr();
      setCurrentDhakaDate((prev) => (prev !== today ? today : prev));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);
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

  // Dynamically evaluate overdue status in Dhaka time
  const { processedTasks, effectiveOverdueCount } = useMemo(() => {
    let overdueCount = 0;
    const list = tasks.map((task) => {
      const isOverdue = checkIsOverdue(task, currentDhakaDate);
      if (isOverdue) overdueCount++;
      return {
        ...task,
        overdue: isOverdue,
      };
    });

    // Sort: overdue tasks first (by urgency desc), then on-schedule tasks (by urgency desc)
    list.sort((a, b) => {
      if (a.overdue && !b.overdue) return -1;
      if (!a.overdue && b.overdue) return 1;
      return (b.urgency || 0) - (a.urgency || 0);
    });

    return {
      processedTasks: list,
      effectiveOverdueCount: Math.max(stats.overdue ?? 0, overdueCount),
    };
  }, [tasks, stats.overdue, currentDhakaDate]);

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

  // Pending Tasks Pagination (10 per page)
  const [pendingPage, setPendingPage] = useState(1);
  const PENDING_PAGE_SIZE = 10;
  const totalPendingPages = Math.max(1, Math.ceil(processedTasks.length / PENDING_PAGE_SIZE));
  const validPendingPage = Math.min(pendingPage, totalPendingPages);

  const pagedPending = useMemo(() => {
    const start = (validPendingPage - 1) * PENDING_PAGE_SIZE;
    return processedTasks.slice(start, start + PENDING_PAGE_SIZE);
  }, [processedTasks, validPendingPage]);

  const pendingPageNumbers = useMemo(() => {
    if (totalPendingPages <= 6) {
      return Array.from({ length: totalPendingPages }, (_, i) => i + 1);
    }
    if (validPendingPage <= 3) {
      return [1, 2, 3, 4, "…", totalPendingPages];
    }
    if (validPendingPage >= totalPendingPages - 2) {
      return [1, "…", totalPendingPages - 3, totalPendingPages - 2, totalPendingPages - 1, totalPendingPages];
    }
    return [1, "…", validPendingPage - 1, validPendingPage, validPendingPage + 1, "…", totalPendingPages];
  }, [validPendingPage, totalPendingPages]);

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
              <span>XP Progressing</span>
              <span className="font-semibold text-garden">{profile.levelProgressPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-garden to-emerald-400 transition-all duration-700"
                style={{ width: `${profile.levelProgressPct}%` }}
              />
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono text-muted-foreground/50">
              {profile.currentLevelXp.toLocaleString()} / {profile.nextLevelXp.toLocaleString()} XP
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
            {effectiveOverdueCount > 0 ? `${effectiveOverdueCount} missed` : "all on track"}
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
              {processedTasks.length}
            </span>
          </div>
          <span className="font-mono text-xs text-muted-foreground/60">
            {effectiveOverdueCount > 0 ? `${effectiveOverdueCount} overdue` : "all on schedule"}
          </span>
        </div>

        {sessionStatus === "loading" || !isMounted ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-surface/10 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-garden" />
          </div>
        ) : processedTasks.length > 0 ? (
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
                    <th
                      className="whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-right text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      title="XP you will receive if completed today (auto-updates daily based on days before deadline)"
                    >
                      XP (Today)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPending.map((task, i) => (
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
                          const { xp, daysLate, daysEarly, isDueToday } = calcPendingXp(
                            task,
                            Boolean(task.overdue),
                            currentDhakaDate
                          );
                          if (xp < 0) return (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-red-400"
                              title={`Overdue by ${daysLate}d — if completed today, penalty is ${xp} XP`}
                            >
                              {xp}
                            </span>
                          );
                          if (daysEarly > 0) return (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300 shadow-sm"
                              title={`Finish today: +${xp} XP (${daysEarly}d before deadline: +${Math.round(daysEarly * 30)}% Early Bird bonus)`}
                            >
                              +{xp} ⚡
                            </span>
                          );
                          return (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400"
                              title={isDueToday ? "Due today: standard on-time XP" : "Standard completion XP"}
                            >
                              +{xp}
                            </span>
                          );
                        })()}
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
                    {(validPendingPage - 1) * PENDING_PAGE_SIZE + 1}–
                    {Math.min(validPendingPage * PENDING_PAGE_SIZE, processedTasks.length)}
                  </span>{" "}
                  of <span className="font-semibold text-foreground">{processedTasks.length}</span> pending tasks
                </div>

                {totalPendingPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                      disabled={validPendingPage <= 1}
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-medium transition hover:border-garden hover:text-garden disabled:pointer-events-none disabled:opacity-40"
                      title="Previous page"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Prev
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {pendingPageNumbers.map((p, idx) =>
                        typeof p === "number" ? (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPendingPage(p)}
                            className={`min-w-[24px] rounded border px-1.5 py-0.5 text-center text-[11px] font-medium transition ${
                              p === validPendingPage
                                ? "border-amber-500/40 bg-amber-500/15 font-bold text-amber-300"
                                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        ) : (
                          <span key={`ellipsis-pending-${idx}`} className="px-1 text-muted-foreground/40">
                            …
                          </span>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPendingPage((p) => Math.min(totalPendingPages, p + 1))}
                      disabled={validPendingPage >= totalPendingPages}
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

      {/* ── Admin-only Analytics ── */}
      {isAdmin && <TaskwarriorAnalytics />}

      {/* Updated at */}
      <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/35">
        <Clock className="h-3 w-3" />
        <span>Snapshot from {formattedDate}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Admin-only Taskwarrior Analytics Panel
   Strictly follows garden design system. ZERO SVG elements used.
   ───────────────────────────────────────────────────────────────────────────── */

interface AnalyticsData {
  generatedAt: string;
  summary: { project: string; remaining: number; avgAge: string; completePct: number }[];
  ghistoryMonthly: { year: string; month: string; added: number; completed: number; deleted: number }[];
  ghistoryAnnual:  { year: string; month: string; added: number; completed: number; deleted: number }[];
  historyMonthly:  { year: string; month: string; added: number; completed: number; deleted: number; net: number; isAverage?: boolean }[];
  historyAnnual:   { year: string; month: string; added: number; completed: number; deleted: number; net: number; isAverage?: boolean }[];
  burndownDaily:   { title: string; netFixRate: string; estimatedCompletion: string; dataPoints: { label: string; pending: number; started: number; done: number }[] };
  burndownMonthly: { title: string; netFixRate: string; estimatedCompletion: string; dataPoints: { label: string; pending: number; started: number; done: number }[] };
  burndownWeekly:  { title: string; netFixRate: string; estimatedCompletion: string; dataPoints: { label: string; pending: number; started: number; done: number }[] };
  raw?: {
    summary: string;
    ghistoryMonthly: string;
    ghistoryAnnual: string;
    historyMonthly: string;
    historyAnnual: string;
    burndownDaily: string;
    burndownMonthly: string;
    burndownWeekly: string;
  };
}

type BurndownMode = "daily" | "weekly" | "monthly";
type HistoryMode  = "monthly" | "annual";
type AnalyticsTab = "summary" | "ghistory" | "burndown";

function TaskwarriorAnalytics() {
  const [analytics, setAnalytics]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [open, setOpen]                 = useState(false);
  const [activeTab, setActiveTab]       = useState<AnalyticsTab>("summary");
  const [historyMode, setHistoryMode]   = useState<HistoryMode>("monthly");
  const [burndownMode, setBurndownMode] = useState<BurndownMode>("daily");
  const [viewFormat, setViewFormat]     = useState<"visual" | "terminal">("visual");

  useEffect(() => {
    fetch("/api/tasks/analytics")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d) => {
        setAnalytics(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  const burndownData =
    burndownMode === "daily"
      ? analytics?.burndownDaily
      : burndownMode === "weekly"
      ? analytics?.burndownWeekly
      : analytics?.burndownMonthly;

  const historyRows =
    historyMode === "monthly" ? analytics?.historyMonthly : analytics?.historyAnnual;
  const ghistoryRows =
    historyMode === "monthly" ? analytics?.ghistoryMonthly : analytics?.ghistoryAnnual;

  const rawText =
    activeTab === "summary"
      ? historyMode === "monthly"
        ? `${analytics?.raw?.summary || ""}\n\n${analytics?.raw?.historyMonthly || ""}`
        : `${analytics?.raw?.summary || ""}\n\n${analytics?.raw?.historyAnnual || ""}`
      : activeTab === "ghistory"
      ? historyMode === "monthly"
        ? analytics?.raw?.ghistoryMonthly || ""
        : analytics?.raw?.ghistoryAnnual || ""
      : burndownMode === "daily"
      ? analytics?.raw?.burndownDaily || ""
      : burndownMode === "weekly"
      ? analytics?.raw?.burndownWeekly || ""
      : analytics?.raw?.burndownMonthly || "";

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface/20">
      {/* ── Header ── */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 text-left transition hover:bg-surface/30"
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex items-center rounded border border-garden/30 bg-garden/10 px-2 py-0.5 font-mono text-[10px] font-bold text-garden">
            ADMIN
          </span>
          <span className="font-serif text-base font-semibold text-heading">
            Task Analytics
          </span>
          <span className="hidden font-mono text-[11px] text-muted-foreground/60 sm:inline">
            summary · history · ghistory · burndown
          </span>
        </div>

        <div className="flex items-center gap-3">
          {analytics?.generatedAt && (
            <span className="hidden font-mono text-[10px] text-muted-foreground/40 sm:inline">
              Snapshot:{" "}
              {new Date(analytics.generatedAt).toLocaleDateString("en-CA", {
                timeZone: "Asia/Dhaka",
              })}
            </span>
          )}
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border font-mono text-xs text-muted-foreground transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* ── Content ── */}
      {open && (
        <div className="border-t border-border">
          {loading && (
            <div className="flex items-center justify-center py-12 font-mono text-xs text-muted-foreground/60">
              Loading Taskwarrior analytics…
            </div>
          )}

          {error && (
            <div className="p-4">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-400">
                {error}
              </div>
            </div>
          )}

          {analytics && !loading && (
            <div>
              {/* Tab Bar matching Taskwarrior filter pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface/10 p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { key: "summary", label: "Summary & History" },
                      { key: "ghistory", label: "Graphical History" },
                      { key: "burndown", label: "Burndown Chart" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                      className={`rounded-lg border px-3 py-1 font-mono text-xs font-medium transition ${
                        activeTab === t.key
                          ? "border-garden/50 bg-garden/15 text-garden font-semibold shadow-xs"
                          : "border-border bg-surface/20 text-muted-foreground hover:border-garden/30 hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Sub controls: Period Toggle & View Format Toggle */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Monthly / Annual for summary & ghistory */}
                  {(activeTab === "summary" || activeTab === "ghistory") && (
                    <div className="flex items-center rounded-md border border-border bg-surface/30 p-0.5 font-mono text-[11px]">
                      {(["monthly", "annual"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setHistoryMode(m)}
                          className={`rounded px-2 py-0.5 capitalize transition ${
                            historyMode === m
                              ? "bg-surface-2 font-medium text-foreground"
                              : "text-muted-foreground/70 hover:text-foreground"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Daily / Weekly / Monthly for burndown */}
                  {activeTab === "burndown" && (
                    <div className="flex items-center rounded-md border border-border bg-surface/30 p-0.5 font-mono text-[11px]">
                      {(["daily", "weekly", "monthly"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setBurndownMode(m)}
                          className={`rounded px-2 py-0.5 capitalize transition ${
                            burndownMode === m
                              ? "bg-surface-2 font-medium text-foreground"
                              : "text-muted-foreground/70 hover:text-foreground"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Visual vs Terminal Toggle */}
                  <div className="flex items-center rounded-md border border-border bg-surface/30 p-0.5 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => setViewFormat("visual")}
                      className={`rounded px-2 py-0.5 transition ${
                        viewFormat === "visual"
                          ? "bg-garden/20 font-medium text-garden"
                          : "text-muted-foreground/70 hover:text-foreground"
                      }`}
                    >
                      Visual
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewFormat("terminal")}
                      className={`rounded px-2 py-0.5 transition ${
                        viewFormat === "terminal"
                          ? "bg-garden/20 font-medium text-garden"
                          : "text-muted-foreground/70 hover:text-foreground"
                      }`}
                    >
                      Terminal
                    </button>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5">
                {viewFormat === "terminal" ? (
                  <div className="space-y-2">
                    <div className="font-mono text-[10px] text-muted-foreground/50">
                      $ task{" "}
                      {activeTab === "summary"
                        ? `summary && task history.${historyMode}`
                        : activeTab === "ghistory"
                        ? `ghistory.${historyMode}`
                        : `burndown.${burndownMode}`}
                    </div>
                    <pre className="overflow-x-auto rounded-xl border border-border/80 bg-[#09090c] p-4 font-mono text-xs leading-relaxed text-muted-foreground/90 whitespace-pre">
                      {rawText || "No raw terminal output captured."}
                    </pre>
                  </div>
                ) : (
                  <>
                    {/* ── TAB 1: Summary & History ── */}
                    {activeTab === "summary" && (
                      <div className="space-y-6">
                        {/* Project Summary */}
                        <div className="space-y-2.5">
                          <div className="font-mono text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                            task summary
                          </div>
                          {analytics.summary.length === 0 ? (
                            <p className="text-xs text-muted-foreground/50">
                              No project summary data.
                            </p>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-border bg-surface/10">
                              <table className="w-full border-collapse text-left font-mono text-xs">
                                <thead>
                                  <tr className="border-b border-border bg-surface/30 text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">Project</th>
                                    <th className="px-4 py-2.5 font-medium text-right">
                                      Remaining
                                    </th>
                                    <th className="px-4 py-2.5 font-medium text-right">
                                      Avg Age
                                    </th>
                                    <th className="px-4 py-2.5 font-medium text-right">
                                      Complete
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {analytics.summary.map((p, i) => (
                                    <tr
                                      key={p.project || i}
                                      className="border-b border-border/40 transition-colors last:border-0 hover:bg-surface/15"
                                    >
                                      <td className="px-4 py-2.5 font-medium text-garden">
                                        {p.project}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-amber-400 font-semibold">
                                        {p.remaining}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                                        {p.avgAge}
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-2.5">
                                          <div className="h-1.5 w-16 sm:w-24 overflow-hidden rounded-full bg-surface-2">
                                            <div
                                              className="h-full rounded-full bg-garden transition-all duration-500"
                                              style={{ width: `${p.completePct}%` }}
                                            />
                                          </div>
                                          <span className="font-semibold text-emerald-400 w-9 text-right">
                                            {p.completePct}%
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* History Table */}
                        <div className="space-y-2.5">
                          <div className="font-mono text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                            task history ({historyMode})
                          </div>
                          <div className="overflow-x-auto rounded-xl border border-border bg-surface/10">
                            <table className="w-full border-collapse text-left font-mono text-xs">
                              <thead>
                                <tr className="border-b border-border bg-surface/30 text-muted-foreground">
                                  <th className="px-4 py-2.5 font-medium">Period</th>
                                  <th className="px-4 py-2.5 font-medium text-right text-blue-400/90">
                                    Added (+)
                                  </th>
                                  <th className="px-4 py-2.5 font-medium text-right text-emerald-400/90">
                                    Done (X)
                                  </th>
                                  <th className="px-4 py-2.5 font-medium text-right text-red-400/90">
                                    Deleted (-)
                                  </th>
                                  <th className="px-4 py-2.5 font-medium text-right">Net</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(historyRows || []).map((row, i) => {
                                  const label =
                                    historyMode === "annual"
                                      ? row.isAverage
                                        ? "Average"
                                        : row.year
                                      : row.isAverage
                                      ? "Average"
                                      : `${row.year} ${row.month}`.trim();
                                  return (
                                    <tr
                                      key={i}
                                      className={`border-b border-border/40 transition-colors last:border-0 ${
                                        row.isAverage
                                          ? "bg-surface/20 font-bold italic"
                                          : "hover:bg-surface/15"
                                      }`}
                                    >
                                      <td className="px-4 py-2.5 text-foreground/90">
                                        {label}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-blue-400">
                                        {row.added}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-emerald-400">
                                        {row.completed}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-red-400">
                                        {row.deleted}
                                      </td>
                                      <td
                                        className={`px-4 py-2.5 text-right font-semibold ${
                                          row.net >= 0 ? "text-amber-400" : "text-red-400"
                                        }`}
                                      >
                                        {row.net > 0 ? `+${row.net}` : row.net}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── TAB 2: Graphical History (ghistory) ── */}
                    {activeTab === "ghistory" && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-mono text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                            task ghistory ({historyMode})
                          </div>
                          {/* Legend */}
                          <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground/70">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-xs bg-blue-500/80" />
                              <span>Added (+)</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500/80" />
                              <span>Completed (X)</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-xs bg-red-500/80" />
                              <span>Deleted (-)</span>
                            </span>
                          </div>
                        </div>

                        <GHistoryBarList rows={ghistoryRows || []} />
                      </div>
                    )}

                    {/* ── TAB 3: Burndown ── */}
                    {activeTab === "burndown" && burndownData && (
                      <div className="space-y-4">
                        <div className="font-mono text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                          task burndown ({burndownMode})
                        </div>
                        <BurndownChart burndown={burndownData} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Pure CSS Components (No SVGs)
   ───────────────────────────────────────────────────────────────────────────── */

function GHistoryBarList({
  rows,
}: {
  rows: { year: string; month: string; added: number; completed: number; deleted: number }[];
}) {
  const maxVal = Math.max(1, ...rows.map((r) => Math.max(r.added, r.completed, r.deleted)));

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface/10 py-8 text-center font-mono text-xs text-muted-foreground/60">
        No ghistory data available.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        const period = r.month ? `${r.year} ${r.month}` : r.year;
        return (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface/10 p-3.5 sm:p-4 space-y-2"
          >
            <div className="font-mono text-xs font-semibold text-heading">{period}</div>
            <div className="space-y-1.5">
              <HorizontalBar label="Added" val={r.added} max={maxVal} colorClass="bg-blue-500/80" />
              <HorizontalBar label="Completed" val={r.completed} max={maxVal} colorClass="bg-emerald-500/80" />
              <HorizontalBar label="Deleted" val={r.deleted} max={maxVal} colorClass="bg-red-500/80" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBar({
  label,
  val,
  max,
  colorClass,
}: {
  label: string;
  val: number;
  max: number;
  colorClass: string;
}) {
  const pct = max > 0 ? (val / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5 font-mono text-xs">
      <span className="w-20 shrink-0 text-muted-foreground/60 text-[11px]">{label}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-xs bg-surface-2">
        <div
          className={`h-full rounded-xs ${colorClass} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 text-right font-medium text-muted-foreground/90 text-[11px]">
        {val}
      </span>
    </div>
  );
}

function BurndownChart({
  burndown,
}: {
  burndown: {
    title: string;
    netFixRate: string;
    estimatedCompletion: string;
    dataPoints: { label: string; pending: number; started: number; done: number }[];
  };
}) {
  const points = burndown.dataPoints;
  const maxTotal = Math.max(1, ...points.map((p) => p.pending + p.started + p.done));
  const yMax = Math.ceil(maxTotal / 10) * 10 || 10;
  const yMid = Math.round(yMax / 2);
  const CHART_HEIGHT = 160;

  if (points.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface/10 py-10 text-center font-mono text-xs text-muted-foreground/60">
        No burndown data available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top metrics pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface/20 px-4 py-2.5 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            <span className="text-muted-foreground/70">Net Fix Rate:</span>{" "}
            <span className="font-semibold text-garden">{burndown.netFixRate || "N/A"}</span>
          </span>
          <span>
            <span className="text-muted-foreground/70">Estimated Completion:</span>{" "}
            <span className="font-semibold text-amber-400">
              {burndown.estimatedCompletion || "N/A"}
            </span>
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-400/80" />
            <span>Pending (X)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-blue-400/80" />
            <span>Started (+)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-400/80" />
            <span>Done (.)</span>
          </span>
        </div>
      </div>

      {/* Chart container with Y-axis */}
      <div className="rounded-xl border border-border bg-surface/10 p-4">
        <div className="flex">
          {/* Y-axis labels */}
          <div
            className="flex flex-col justify-between pr-2.5 text-right font-mono text-[10px] text-muted-foreground/50 select-none shrink-0"
            style={{ height: `${CHART_HEIGHT}px` }}
          >
            <span>{yMax}</span>
            <span>{yMid}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="relative flex-1 overflow-x-auto pb-8">
            {/* Guide lines */}
            <div className="pointer-events-none absolute inset-x-0 top-0 border-b border-dashed border-border/30" />
            <div
              className="pointer-events-none absolute inset-x-0 border-b border-dashed border-border/30"
              style={{ top: `${CHART_HEIGHT / 2}px` }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 border-b border-border/60"
              style={{ top: `${CHART_HEIGHT}px` }}
            />

            {/* Bars container */}
            <div
              className="flex items-end gap-1.5 sm:gap-2 px-1"
              style={{
                height: `${CHART_HEIGHT}px`,
                minWidth: `${Math.max(points.length * 36, 280)}px`,
              }}
            >
              {points.map((p, idx) => {
                const total = p.pending + p.started + p.done;
                const pendingH = Math.round((p.pending / yMax) * CHART_HEIGHT);
                const startedH = Math.round((p.started / yMax) * CHART_HEIGHT);
                const doneH = Math.round((p.done / yMax) * CHART_HEIGHT);

                return (
                  <div
                    key={idx}
                    className="group relative flex flex-1 flex-col items-center justify-end"
                    style={{ height: `${CHART_HEIGHT}px`, minWidth: "24px" }}
                  >
                    {/* Hover tooltip */}
                    <div className="pointer-events-none absolute -top-11 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface px-2.5 py-1 font-mono text-[10px] text-foreground shadow-md group-hover:block left-1/2">
                      <div className="font-semibold text-garden">{p.label}</div>
                      <div className="text-muted-foreground">
                        Pending: <span className="text-amber-400 font-semibold">{p.pending}</span> · Done:{" "}
                        <span className="text-emerald-400 font-semibold">{p.done}</span> · Started:{" "}
                        <span className="text-blue-400 font-semibold">{p.started}</span>
                      </div>
                    </div>

                    {/* Stacked Bar Column */}
                    <div
                      className="relative w-full max-w-[28px] overflow-hidden rounded-xs bg-surface-2/40 flex flex-col justify-end"
                      style={{ height: `${Math.max(2, pendingH + startedH + doneH)}px` }}
                    >
                      {total === 0 ? (
                        <div className="h-0.5 w-full bg-border/40" />
                      ) : (
                        <>
                          {p.done > 0 && (
                            <div
                              className="w-full bg-emerald-400/80 transition-all duration-300 hover:brightness-110"
                              style={{ height: `${doneH}px` }}
                              title={`Done: ${p.done}`}
                            />
                          )}
                          {p.started > 0 && (
                            <div
                              className="w-full bg-blue-400/80 transition-all duration-300 hover:brightness-110"
                              style={{ height: `${startedH}px` }}
                              title={`Started: ${p.started}`}
                            />
                          )}
                          {p.pending > 0 && (
                            <div
                              className="w-full bg-amber-400/80 transition-all duration-300 hover:brightness-110"
                              style={{ height: `${pendingH}px` }}
                              title={`Pending: ${p.pending}`}
                            />
                          )}
                        </>
                      )}
                    </div>

                    {/* X-axis label */}
                    <div
                      className="absolute top-[164px] font-mono text-[9px] text-muted-foreground/60 whitespace-nowrap"
                      style={{
                        transform: "rotate(-45deg)",
                        transformOrigin: "top left",
                      }}
                    >
                      {p.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

