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
      {/* Header */}
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-heading">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-garden/10 text-garden ring-1 ring-garden/30">
            <ListChecks className="h-5 w-5" />
          </span>
          Taskwarrior
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          A snapshot of my current tasks — updated each time the garden is
          deployed.
        </p>
      </header>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Target className="h-4 w-4 text-garden/60" />
            <span className="font-mono text-2xl font-bold text-heading">
              {stats.total}
            </span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/60">
            total
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400/60" />
            <span className="font-mono text-2xl font-bold text-heading">
              {stats.completed}
            </span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/60">
            completed
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Circle className="h-4 w-4 text-amber-400/60" />
            <span className="font-mono text-2xl font-bold text-heading">
              {stats.pending}
            </span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/60">
            remaining
          </div>
        </div>
      </div>

      {/* Progress */}
      {stats.total > 0 && (
        <div className="mb-8 rounded-lg border border-border bg-surface/20 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-garden/50" />
              Progress
            </span>
            <span className="font-mono text-xs text-foreground">
              {completionRate}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-garden/70"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}

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
                  className={`border-b border-border/50 transition-colors hover:bg-surface/30 ${
                    i % 2 === 0 ? "bg-transparent" : "bg-surface/10"
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-foreground/80">
                    {task.id}
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
                  <td className="whitespace-nowrap px-4 py-2.5 text-amber-300/80">
                    {formatDueDate(task.due)}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {task.description}
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
