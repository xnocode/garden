"use client";

import { useEffect, useRef } from "react";
import {
  ListChecks,
  Clock,
  CheckCircle2,
  Circle,
  Target,
  AlertTriangle,
  FolderKanban,
  CalendarDays,
  Flame,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  Zap,
} from "lucide-react";

/* ── types ── */

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
    overdue: number;
  };
  overdue: TaskData[];
  upcoming: TaskData[];
}

/* ── helpers ── */

function calcAge(entryStr: string | null): string {
  if (!entryStr) return "";
  const m = entryStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return "";
  const entry = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  const diffMs = Date.now() - entry.getTime();
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
  return `${Math.floor(days / 365)}y`;
}

function formatDue(dateStr: string | null): string {
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

function priorityBadge(p: string | null) {
  if (!p) return null;
  const cfg: Record<string, { icon: typeof ArrowUpCircle; label: string; cls: string }> = {
    H: { icon: ArrowUpCircle, label: "H", cls: "text-red-400" },
    M: { icon: ArrowRightCircle, label: "M", cls: "text-amber-400" },
    L: { icon: ArrowDownCircle, label: "L", cls: "text-blue-400" },
  };
  const c = cfg[p];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-0.5 font-bold ${c.cls}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

/* ── Animated constellation ── */

function TaskConstellation({
  total,
  completed,
  pending,
  overdue,
}: {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 600;
    const h = 280;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;

    // Create nodes for each category
    interface Node {
      x: number;
      y: number;
      r: number;
      color: string;
      label: string;
      count: number;
      angle: number;
      orbit: number;
      speed: number;
    }

    const nodes: Node[] = [];

    // Completed nodes (green, inner orbit)
    const completedCount = Math.min(completed, 20);
    for (let i = 0; i < completedCount; i++) {
      nodes.push({
        x: 0, y: 0,
        r: 2 + Math.random() * 2,
        color: "rgba(74, 222, 128, 0.6)",
        label: "done",
        count: 0,
        angle: (Math.PI * 2 * i) / completedCount + Math.random() * 0.3,
        orbit: 40 + Math.random() * 25,
        speed: 0.002 + Math.random() * 0.003,
      });
    }

    // Pending nodes (amber, middle orbit)
    const pendingCount = Math.min(pending, 15);
    for (let i = 0; i < pendingCount; i++) {
      nodes.push({
        x: 0, y: 0,
        r: 3 + Math.random() * 2,
        color: "rgba(251, 191, 36, 0.7)",
        label: "pending",
        count: 0,
        angle: (Math.PI * 2 * i) / pendingCount + Math.random() * 0.4,
        orbit: 75 + Math.random() * 30,
        speed: 0.001 + Math.random() * 0.002,
      });
    }

    // Overdue nodes (red, outer orbit)
    const overdueCount = Math.min(overdue, 10);
    for (let i = 0; i < overdueCount; i++) {
      nodes.push({
        x: 0, y: 0,
        r: 3 + Math.random() * 2.5,
        color: "rgba(248, 113, 113, 0.8)",
        label: "overdue",
        count: 0,
        angle: (Math.PI * 2 * i) / overdueCount + Math.random() * 0.5,
        orbit: 110 + Math.random() * 20,
        speed: 0.0005 + Math.random() * 0.001,
      });
    }

    // Background stars
    const stars: { x: number; y: number; r: number; alpha: number; pulse: number }[] = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2,
        alpha: 0.1 + Math.random() * 0.3,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let frame = 0;
    let animId: number;

    function draw() {
      frame++;
      ctx!.clearRect(0, 0, w, h);

      // Stars
      for (const s of stars) {
        const a = s.alpha + Math.sin(frame * 0.02 + s.pulse) * 0.15;
        ctx!.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, a)})`;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Orbit rings
      const rings = [55, 90, 120];
      for (const ring of rings) {
        ctx!.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx!.lineWidth = 0.5;
        ctx!.beginPath();
        ctx!.ellipse(cx, cy, ring, ring * 0.55, 0, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // Center glow
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 30);
      grad.addColorStop(0, "rgba(132, 165, 157, 0.25)");
      grad.addColorStop(0.5, "rgba(132, 165, 157, 0.08)");
      grad.addColorStop(1, "rgba(132, 165, 157, 0)");
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx!.fill();

      // Center dot
      ctx!.fillStyle = "rgba(132, 165, 157, 0.8)";
      ctx!.beginPath();
      ctx!.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx!.fill();

      // Nodes
      for (const n of nodes) {
        n.angle += n.speed;
        n.x = cx + Math.cos(n.angle) * n.orbit;
        n.y = cy + Math.sin(n.angle) * n.orbit * 0.55;

        // Glow
        const glow = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
        glow.addColorStop(0, n.color);
        glow.addColorStop(1, "transparent");
        ctx!.fillStyle = glow;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
        ctx!.fill();

        // Core
        ctx!.fillStyle = n.color;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx!.fill();

        // Connection line to center (faint)
        ctx!.strokeStyle = n.color.replace(/[\d.]+\)$/, "0.08)");
        ctx!.lineWidth = 0.5;
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(n.x, n.y);
        ctx!.stroke();
      }

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [total, completed, pending, overdue]);

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-xl border border-border bg-[#060608]">
      <canvas
        ref={canvasRef}
        className="max-w-full"
        style={{ width: 600, height: 280 }}
      />
      {/* Legend overlay */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-6 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-400/60" />
          <span className="text-muted-foreground/50">Completed</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400/70" />
          <span className="text-muted-foreground/50">Pending</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400/80" />
          <span className="text-muted-foreground/50">Overdue</span>
        </span>
      </div>
    </div>
  );
}

/* ── Task table (Taskwarrior style) ── */

function TaskTable({ tasks, variant }: { tasks: TaskData[]; variant: "overdue" | "upcoming" }) {
  if (tasks.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-[#0c0c0f]">
      <table className="w-full border-collapse font-mono text-sm">
        <thead>
          <tr className="border-b border-border bg-surface/40 text-left">
            <th className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4">ID</th>
            <th className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4">Age</th>
            <th className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4">P</th>
            <th className="hidden whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell sm:px-4">Project</th>
            <th className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4">Due</th>
            <th className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4">Description</th>
            <th className="whitespace-nowrap px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4">Urg</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => (
            <tr
              key={task.id}
              className={`border-b border-border/40 transition-colors hover:bg-surface/30 ${
                i % 2 === 0 ? "bg-transparent" : "bg-surface/10"
              }`}
            >
              <td className="whitespace-nowrap px-3 py-2 text-foreground/70 sm:px-4">{task.id}</td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground sm:px-4">{calcAge(task.entry)}</td>
              <td className="whitespace-nowrap px-3 py-2 sm:px-4">{priorityBadge(task.priority)}</td>
              <td className="hidden whitespace-nowrap px-3 py-2 text-garden sm:table-cell sm:px-4">{task.project || ""}</td>
              <td className={`whitespace-nowrap px-3 py-2 sm:px-4 ${variant === "overdue" ? "text-red-400/80" : "text-amber-300/80"}`}>{formatDue(task.due)}</td>
              <td className="px-3 py-2 text-foreground sm:px-4">{task.description}</td>
              <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold sm:px-4 ${urgencyColor(task.urgency)}`}>{task.urgency.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border bg-surface/20 px-3 py-1.5 font-mono text-[11px] text-muted-foreground/50 sm:px-4">
        {tasks.length} task{tasks.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

/* ── Main view ── */

export function TaskwarriorView({ data }: { data: TaskSnapshot }) {
  const { stats, overdue, upcoming, exportedAt } = data;
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
          A living map of what I&apos;m working on — powered by{" "}
          <span className="font-mono text-foreground/80">taskwarrior</span>.
          Updated each time the garden is deployed.
        </p>
      </header>

      {/* Constellation animation */}
      <div className="mb-8">
        <TaskConstellation
          total={stats.total}
          completed={stats.completed}
          pending={stats.pending}
          overdue={stats.overdue}
        />
      </div>

      {/* Stats — 4 cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center transition-colors hover:border-garden/20">
          <div className="flex items-center justify-center gap-2">
            <Target className="h-4 w-4 text-garden/50" />
            <span className="font-mono text-2xl font-bold text-heading">{stats.total}</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/50">Total</div>
        </div>
        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center transition-colors hover:border-green-500/20">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400/50" />
            <span className="font-mono text-2xl font-bold text-heading">{stats.completed}</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/50">Completed</div>
        </div>
        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center transition-colors hover:border-amber-500/20">
          <div className="flex items-center justify-center gap-2">
            <Circle className="h-4 w-4 text-amber-400/50" />
            <span className="font-mono text-2xl font-bold text-heading">{stats.pending}</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/50">Remaining</div>
        </div>
        <div className="rounded-lg border border-border bg-surface/30 p-4 text-center transition-colors hover:border-red-500/20">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400/50" />
            <span className="font-mono text-2xl font-bold text-heading">{stats.overdue}</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/50">Overdue</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-10 rounded-lg border border-border bg-surface/20 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-garden/50" />
            Overall progress
          </span>
          <span className="font-mono text-xs text-foreground">{completionRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-garden/60 to-green-400/60 transition-all duration-700"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="mt-1.5 text-[10px] text-muted-foreground/40">
          {stats.completed} of {stats.total} tasks completed
        </div>
      </div>

      {/* Overdue section */}
      {overdue.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400/70" />
              <h2 className="font-serif text-lg font-semibold text-heading">Overdue</h2>
            </div>
            <span className="h-px flex-1 bg-red-500/10" />
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-mono text-[10px] text-red-400/70">
              {overdue.length} task{overdue.length !== 1 ? "s" : ""} past due
            </span>
          </div>
          <TaskTable tasks={overdue} variant="overdue" />
        </section>
      )}

      {/* Upcoming section */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-garden/60" />
            <h2 className="font-serif text-lg font-semibold text-heading">Upcoming</h2>
          </div>
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] text-muted-foreground/40">
            today &amp; tomorrow
          </span>
        </div>
        {upcoming.length > 0 ? (
          <TaskTable tasks={upcoming} variant="upcoming" />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/10 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-400/20" />
            <p className="mt-3 font-serif text-base text-heading/70">Nothing due soon</p>
            <p className="mt-1 text-xs text-muted-foreground/40">
              No tasks scheduled for today or tomorrow.
            </p>
          </div>
        )}
      </section>

      {/* Empty state — when absolutely no tasks exist */}
      {stats.total === 0 && (
        <div className="mb-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/10 py-16 text-center">
          <ListChecks className="h-12 w-12 text-muted-foreground/15" />
          <p className="mt-4 font-serif text-xl text-heading/60">No tasks yet</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground/40">
            Tasks will appear here once they&apos;re added to Taskwarrior and the
            garden is redeployed.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/30">
        <Clock className="h-3 w-3" />
        <span>Snapshot from {formattedDate}</span>
      </div>
    </div>
  );
}
