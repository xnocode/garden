import {
  ListChecks,
  CheckCircle2,
  Circle,
  Clock,
  FolderKanban,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  CalendarDays,
  Flame,
  Target,
  TrendingUp,
} from "lucide-react";

interface TaskData {
  id: number;
  description: string;
  project: string | null;
  tags: string[];
  priority: string | null;
  due: string | null;
  entry: string | null;
  urgency: number;
}

interface TaskSnapshot {
  exportedAt: string;
  stats: {
    total: number;
    pending: number;
    completed: number;
  };
  tasks: TaskData[];
}

function formatTWDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
  );
  if (!match) return dateStr;
  const [, y, m, d] = match;
  const date = new Date(`${y}-${m}-${d}`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function relativeDay(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
  );
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = date.getTime() - todayStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return `in ${diffDays}d`;
}

function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) return null;
  const config: Record<string, { icon: typeof ArrowUpCircle; label: string; className: string }> = {
    H: {
      icon: ArrowUpCircle,
      label: "High",
      className: "bg-red-500/15 text-red-400 border-red-500/25",
    },
    M: {
      icon: ArrowRightCircle,
      label: "Medium",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    },
    L: {
      icon: ArrowDownCircle,
      label: "Low",
      className: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    },
  };
  const c = config[priority];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${c.className}`}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function TaskCard({ task }: { task: TaskData }) {
  const rel = relativeDay(task.due);
  const isOverdue = rel === "overdue";
  const isToday = rel === "today";

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-4 transition-all ${
        isOverdue
          ? "border-red-500/30 bg-red-500/5"
          : isToday
          ? "border-amber-500/20 bg-amber-500/5"
          : "border-border bg-surface/30 hover:border-garden/30"
      }`}
    >
      {/* Subtle left accent bar */}
      <div
        className={`absolute left-0 top-0 h-full w-0.5 ${
          isOverdue
            ? "bg-red-500/60"
            : isToday
            ? "bg-amber-400/60"
            : "bg-garden/30"
        }`}
      />

      <div className="flex items-start gap-3 pl-2">
        <div className="mt-0.5 flex-shrink-0">
          <Circle
            className={`h-[14px] w-[14px] ${
              isOverdue
                ? "text-red-400/60"
                : isToday
                ? "text-amber-400/60"
                : "text-muted-foreground/30"
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-medium text-foreground">
              {task.description}
            </span>
            <PriorityBadge priority={task.priority} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
            {task.project && (
              <span className="inline-flex items-center gap-1 rounded-md bg-garden/8 px-1.5 py-0.5 font-mono text-garden/70">
                <FolderKanban className="h-3 w-3" />
                {task.project}
              </span>
            )}
            {rel && (
              <span
                className={`inline-flex items-center gap-1 ${
                  isOverdue
                    ? "text-red-400"
                    : isToday
                    ? "text-amber-400"
                    : "text-muted-foreground/60"
                }`}
              >
                <CalendarDays className="h-3 w-3" />
                {isOverdue ? "Overdue" : isToday ? "Due today" : `Due ${rel}`}
              </span>
            )}
            {task.urgency > 0 && (
              <span className="inline-flex items-center gap-1 text-muted-foreground/40">
                <Flame className="h-3 w-3" />
                {task.urgency.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskwarriorView({ data }: { data: TaskSnapshot }) {
  const { stats, tasks, exportedAt } = data;
  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const exportDate = new Date(exportedAt);
  const formattedDate = exportDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="garden-fade-in mx-auto max-w-3xl">
      {/* Header */}
      <header className="mb-10 border-b border-border pb-6">
        <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-heading">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-garden/10 text-garden ring-1 ring-garden/30">
            <ListChecks className="h-5 w-5" />
          </span>
          Taskwarrior
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          A snapshot of what I&apos;m working on — showing today and tomorrow&apos;s
          tasks. Updated each time the garden is deployed.
        </p>
      </header>

      {/* Stats — 3 cards */}
      <div className="mb-10 grid grid-cols-3 gap-3">
        {/* Total */}
        <div className="rounded-xl border border-border bg-surface/30 p-5 text-center transition-colors hover:border-garden/20">
          <div className="flex items-center justify-center gap-2">
            <Target className="h-4 w-4 text-blue-400/70" />
            <span className="font-serif text-3xl font-bold text-heading">
              {stats.total}
            </span>
          </div>
          <div className="mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60">
            total tasks
          </div>
        </div>

        {/* Completed */}
        <div className="rounded-xl border border-border bg-surface/30 p-5 text-center transition-colors hover:border-green-500/20">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400/70" />
            <span className="font-serif text-3xl font-bold text-heading">
              {stats.completed}
            </span>
          </div>
          <div className="mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60">
            completed
          </div>
        </div>

        {/* Remaining */}
        <div className="rounded-xl border border-border bg-surface/30 p-5 text-center transition-colors hover:border-amber-500/20">
          <div className="flex items-center justify-center gap-2">
            <Circle className="h-4 w-4 text-amber-400/70" />
            <span className="font-serif text-3xl font-bold text-heading">
              {stats.pending}
            </span>
          </div>
          <div className="mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60">
            remaining
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="mb-10 rounded-xl border border-border bg-surface/20 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-garden/60" />
              Progress
            </span>
            <span className="font-mono text-sm font-medium text-foreground">
              {completionRate}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-garden/80 to-green-400/80 transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="mt-2.5 text-[11px] text-muted-foreground/50">
            {stats.completed} of {stats.total} tasks completed
          </div>
        </div>
      )}

      {/* Task list — only today/tomorrow */}
      {tasks.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-serif text-lg font-semibold text-heading">
              Upcoming
            </h2>
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] text-muted-foreground/50">
              {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
            </span>
          </div>
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/10 py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-400/30" />
          <p className="mt-4 font-serif text-lg text-heading">All clear</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            No tasks due today or tomorrow.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/40">
        <Clock className="h-3 w-3" />
        <span>Last updated {formattedDate}</span>
      </div>
    </div>
  );
}
