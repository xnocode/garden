"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ListChecks,
  CheckCircle2,
  Circle,
  Clock,
  FolderKanban,
  Tag,
  AlertTriangle,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  RefreshCw,
  Loader2,
  CalendarDays,
  Flame,
} from "lucide-react";

interface TaskwarriorTask {
  id: number;
  uuid: string;
  description: string;
  status: "pending" | "completed" | "deleted" | "recurring" | "waiting";
  project?: string;
  tags?: string[];
  priority?: "H" | "M" | "L";
  due?: string;
  entry?: string;
  end?: string;
  modified?: string;
  urgency?: number;
  scheduled?: string;
  [key: string]: unknown;
}

interface TaskStats {
  pending: number;
  completed: number;
  projects: number;
  tags: number;
}

function formatTWDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  // Taskwarrior dates: "20240507T120000Z" format
  const match = dateStr.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
  );
  if (!match) return dateStr;
  const [, y, m, d] = match;
  const date = new Date(`${y}-${m}-${d}`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeTime(dateStr?: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
  );
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1) return "yesterday";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays <= 7) return `in ${diffDays}d`;
  if (diffDays <= 30) return `in ${Math.round(diffDays / 7)}w`;
  return `in ${Math.round(diffDays / 30)}mo`;
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null;
  const config = {
    H: {
      icon: ArrowUpCircle,
      label: "High",
      className:
        "bg-red-500/10 text-red-400 border-red-500/30",
    },
    M: {
      icon: ArrowRightCircle,
      label: "Medium",
      className:
        "bg-amber-500/10 text-amber-400 border-amber-500/30",
    },
    L: {
      icon: ArrowDownCircle,
      label: "Low",
      className:
        "bg-blue-500/10 text-blue-400 border-blue-500/30",
    },
  }[priority];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function DueBadge({ due }: { due?: string }) {
  if (!due) return null;
  const rel = relativeTime(due);
  const isOverdue = rel?.includes("overdue");
  const isToday = rel === "today";
  const isSoon = rel === "tomorrow" || rel?.startsWith("in 1") || rel?.startsWith("in 2");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        isOverdue
          ? "border-red-500/40 bg-red-500/10 text-red-400"
          : isToday
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
          : isSoon
          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
          : "border-border bg-surface/60 text-muted-foreground"
      }`}
    >
      <CalendarDays className="h-3 w-3" />
      {rel}
    </span>
  );
}

function TaskRow({ task }: { task: TaskwarriorTask }) {
  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border bg-surface/30 p-4 transition-all hover:border-garden/40 hover:bg-surface/60">
      <div className="mt-0.5 flex-shrink-0">
        <Circle className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-garden" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">
            {task.description}
          </span>
          <PriorityBadge priority={task.priority} />
          <DueBadge due={task.due} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {task.project && (
            <span className="inline-flex items-center gap-1 rounded-md bg-garden/8 px-1.5 py-0.5 font-mono text-garden/80">
              <FolderKanban className="h-3 w-3" />
              {task.project}
            </span>
          )}
          {task.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 font-mono text-muted-foreground/70"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
          {task.urgency !== undefined && (
            <span className="inline-flex items-center gap-1 text-muted-foreground/50">
              <Flame className="h-3 w-3" />
              {task.urgency.toFixed(1)}
            </span>
          )}
          {task.entry && (
            <span className="text-muted-foreground/40">
              added {formatTWDate(task.entry)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TaskwarriorView() {
  const [tasks, setTasks] = useState<TaskwarriorTask[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    pending: 0,
    completed: 0,
    projects: 0,
    tags: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "project">("all");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      }
      setTasks(data.tasks || []);
      setStats(
        data.stats || { pending: 0, completed: 0, projects: 0, tags: 0 }
      );
      setLastRefresh(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTasks, 30_000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Derive projects from tasks
  const projects = [
    ...new Set(tasks.map((t) => t.project).filter(Boolean)),
  ] as string[];

  // Filter tasks
  let displayed = tasks;
  if (filter === "high") {
    displayed = tasks.filter((t) => t.priority === "H");
  } else if (filter === "project" && selectedProject) {
    displayed = tasks.filter((t) => t.project === selectedProject);
  }

  // Sort by urgency (highest first)
  displayed = [...displayed].sort(
    (a, b) => (b.urgency || 0) - (a.urgency || 0)
  );

  const completionRate =
    stats.pending + stats.completed > 0
      ? Math.round(
          (stats.completed / (stats.pending + stats.completed)) * 100
        )
      : 0;

  return (
    <div className="garden-fade-in mx-auto max-w-4xl">
      {/* Header */}
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-heading">
          <ListChecks className="h-7 w-7 text-garden" />
          Taskwarrior
        </h1>
        <p className="mt-2 text-muted-foreground">
          Live task progress from{" "}
          <span className="font-mono text-foreground">taskwarrior</span> — what
          I&apos;m working on right now.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface/30 p-4 text-center transition-colors hover:border-garden/30">
          <div className="flex items-center justify-center gap-2">
            <Circle className="h-4 w-4 text-amber-400" />
            <span className="font-serif text-2xl font-semibold text-heading">
              {stats.pending}
            </span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            pending
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface/30 p-4 text-center transition-colors hover:border-garden/30">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="font-serif text-2xl font-semibold text-heading">
              {stats.completed}
            </span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            completed
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface/30 p-4 text-center transition-colors hover:border-garden/30">
          <div className="flex items-center justify-center gap-2">
            <FolderKanban className="h-4 w-4 text-blue-400" />
            <span className="font-serif text-2xl font-semibold text-heading">
              {stats.projects}
            </span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            projects
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface/30 p-4 text-center transition-colors hover:border-garden/30">
          <div className="flex items-center justify-center gap-2">
            <Tag className="h-4 w-4 text-purple-400" />
            <span className="font-serif text-2xl font-semibold text-heading">
              {stats.tags}
            </span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            tags
          </div>
        </div>
      </div>

      {/* Completion progress bar */}
      {(stats.pending > 0 || stats.completed > 0) && (
        <div className="mb-8 rounded-xl border border-border bg-surface/30 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall progress</span>
            <span className="font-mono text-foreground">{completionRate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-garden to-green-400 transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground/60">
            <span>
              {stats.completed} done · {stats.pending} remaining
            </span>
            <span>
              {stats.pending + stats.completed} total
            </span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setFilter("all");
              setSelectedProject(null);
            }}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
              filter === "all"
                ? "border-garden/50 bg-garden/10 text-garden"
                : "border-border bg-surface/30 text-muted-foreground hover:border-garden/30 hover:text-foreground"
            }`}
          >
            All tasks
          </button>
          <button
            onClick={() => setFilter("high")}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
              filter === "high"
                ? "border-red-500/50 bg-red-500/10 text-red-400"
                : "border-border bg-surface/30 text-muted-foreground hover:border-red-500/30 hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1">
              <ArrowUpCircle className="h-3 w-3" />
              High priority
            </span>
          </button>
          {projects.length > 0 && (
            <select
              value={filter === "project" ? (selectedProject || "") : ""}
              onChange={(e) => {
                if (e.target.value) {
                  setFilter("project");
                  setSelectedProject(e.target.value);
                } else {
                  setFilter("all");
                  setSelectedProject(null);
                }
              }}
              className="rounded-md border border-border bg-surface/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-garden/30 focus:border-garden/50 focus:outline-none"
            >
              <option value="">Filter by project…</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={fetchTasks}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-garden/30 hover:text-foreground disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Could not fetch tasks</p>
              <p className="mt-1 text-amber-400/70">{error}</p>
              <p className="mt-2 text-amber-400/50 text-xs">
                Make sure Taskwarrior is installed in WSL and <code className="rounded bg-amber-500/10 px-1">wsl task</code> works from PowerShell.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface/20 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-garden/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            Fetching tasks from taskwarrior…
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface/20 py-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-400/40" />
          <p className="mt-4 font-serif text-lg text-heading">
            {filter !== "all" ? "No matching tasks" : "All clear!"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter !== "all"
              ? "Try changing the filter."
              : "No pending tasks right now. Time to add some!"}
          </p>
        </div>
      )}

      {/* Task list */}
      {displayed.length > 0 && (
        <div className="space-y-2">
          {displayed.map((task) => (
            <TaskRow key={task.uuid} task={task} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-[11px] text-muted-foreground/50">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {lastRefresh
            ? `Last updated ${lastRefresh.toLocaleTimeString()}`
            : "Loading…"}
        </span>
        <span>Auto-refreshes every 30s</span>
      </div>
    </div>
  );
}
