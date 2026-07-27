import { ListChecks, Clock, TrendingUp, CheckCircle2, Circle, Target } from "lucide-react";

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

interface TaskSnapshot {
  exportedAt: string;
  stats: {
    total: number;
    pending: number;
    completed: number;
    overdue?: number;
  };
  tasks: TaskData[];
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
  const m = dateStr.match(/^(\d{4})(\d{2})(\d{2})T/);
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
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
    <div className="garden-fade-in mx-auto max-w-4xl">
      {/* ── Hero panel ── */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface/50 to-surface/20">
        {/* Top section with title + progress ring */}
        <div className="flex flex-col items-center gap-6 px-6 pt-8 pb-6 sm:flex-row sm:items-start sm:gap-8 sm:px-8">
          {/* Progress ring */}
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-sm">
              {/* Background ring */}
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-surface-2"
              />
              {/* Progress arc */}
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke="url(#progress-gradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${completionRate * 3.14} ${314 - completionRate * 3.14}`}
                transform="rotate(-90 60 60)"
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--garden)" />
                  <stop offset="100%" stopColor="#4ade80" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold text-heading">{completionRate}%</span>
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50">done</span>
            </div>
          </div>

          {/* Title + description */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="flex items-center justify-center gap-3 font-serif text-3xl font-semibold text-heading sm:justify-start">
              <ListChecks className="h-6 w-6 text-garden" />
              Taskwarrior
            </h1>
            <p className="mt-2 text-sm text-muted-foreground/70 leading-relaxed">
              A snapshot of what I&apos;m working on — powered by{" "}
              <span className="font-mono text-foreground/60">taskwarrior</span>.
              Updated each deploy.
            </p>
            {/* Inline stats — match site pill badge style */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                <span className="font-semibold text-heading">{stats.total}</span>
                total
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                <span className="font-semibold text-green-400">{stats.completed}</span>
                completed
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                <span className="font-semibold text-amber-400">{stats.pending}</span>
                remaining
              </span>
              {(stats.overdue ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                  <span className="font-semibold text-red-400">{stats.overdue}</span>
                  missed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom progress bar */}
        <div className="h-1 bg-surface-2">
          <div
            className="h-full bg-gradient-to-r from-garden/50 to-green-400/50 transition-all duration-700"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* ── Taskwarrior table ── */}
      {tasks.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-[#0c0c0f]">
          <table className="w-full border-collapse font-mono text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/40 text-left">
                <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  ID
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Age
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  P
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Project
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Due
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                  <td className={`whitespace-nowrap px-4 py-2.5 ${ task.overdue ? "text-red-400/70" : "text-foreground/80" }`}>
                    {task.overdue ? (
                      <span className="flex items-center gap-1">
                        <span className="text-red-400">!</span>{task.id}
                      </span>
                    ) : task.id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {calcAge(task.entry)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-2.5 font-semibold ${priorityColor(
                      task.priority
                    )}`}
                  >
                    {priorityLabel(task.priority)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-garden">
                    {task.project || ""}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-2.5 ${ task.overdue ? "text-red-400 font-semibold" : "text-amber-300/80" }`}>
                    {formatDueDate(task.due)}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
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
                    className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold ${urgencyColor(
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
          <div className="border-t border-border bg-surface/20 px-4 py-2 text-xs text-muted-foreground/60 font-mono">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/10 py-14 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-400/20" />
          <p className="mt-4 font-serif text-lg text-heading">All clear</p>
          <p className="mt-1 text-sm text-muted-foreground/50">
            No tasks due today or tomorrow.
          </p>
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
