/**
 * export-tasks.ts — Snapshot Taskwarrior data for static deploy.
 *
 * Categorizes tasks into: overdue, today, tomorrow, and no-due.
 * Completed task descriptions are never stored — only counted.
 */

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

interface RawTask {
  id: number;
  uuid: string;
  description: string;
  status: string;
  project?: string;
  tags?: string[];
  priority?: string;
  due?: string;
  entry?: string;
  end?: string;
  modified?: string;
  urgency?: number;
  [key: string]: unknown;
}

function parseTWDate(dateStr: string): Date | null {
  const m = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
}

function categorize(dateStr: string | undefined): "overdue" | "today" | "tomorrow" | "future" | "no-due" {
  if (!dateStr) return "no-due";
  const d = parseTWDate(dateStr);
  if (!d) return "no-due";
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(todayStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  if (d < todayStart) return "overdue";
  if (d < tomorrowStart) return "today";
  if (d < dayAfterTomorrow) return "tomorrow";
  return "future";
}

function runCmd(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 15000 });
  } catch {
    return "";
  }
}

function parseTaskOutput(raw: string): RawTask[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(trimmed);
  } catch {
    return [];
  }
}

function mapTask(t: RawTask) {
  return {
    id: t.id,
    description: t.description,
    project: t.project || null,
    tags: t.tags || [],
    priority: t.priority || null,
    due: t.due || null,
    entry: t.entry || null,
    urgency: t.urgency ?? 0,
  };
}

async function main() {
  console.log("  ▸ Exporting Taskwarrior snapshot…");

  const pendingRaw = runCmd(
    'wsl -- bash -c "task rc.json.array=on status:pending export 2>/dev/null"'
  );
  const pendingTasks = parseTaskOutput(pendingRaw);

  const completedRaw = runCmd(
    'wsl -- bash -c "task rc.json.array=on status:completed export 2>/dev/null"'
  );
  const completedTasks = parseTaskOutput(completedRaw);

  // Categorize pending tasks
  const overdue: typeof pendingTasks = [];
  const today: typeof pendingTasks = [];
  const tomorrow: typeof pendingTasks = [];
  const noDue: typeof pendingTasks = [];

  for (const t of pendingTasks) {
    const cat = categorize(t.due);
    if (cat === "overdue") overdue.push(t);
    else if (cat === "today") today.push(t);
    else if (cat === "tomorrow") tomorrow.push(t);
    else if (cat === "no-due") noDue.push(t);
    // "future" tasks are excluded from public view
  }

  const sortByUrgency = (a: RawTask, b: RawTask) => (b.urgency || 0) - (a.urgency || 0);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    stats: {
      total: pendingTasks.length + completedTasks.length,
      pending: pendingTasks.length,
      completed: completedTasks.length,
      overdue: overdue.length,
    },
    overdue: overdue.sort(sortByUrgency).map(mapTask),
    upcoming: [...today, ...tomorrow, ...noDue].sort(sortByUrgency).map(mapTask),
  };

  const outDir = resolve(import.meta.dir, "..", "src", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "tasks.json");
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8");

  const visible = snapshot.overdue.length + snapshot.upcoming.length;
  console.log(
    `    ✓ ${visible} visible (${snapshot.overdue.length} overdue, ` +
      `${snapshot.upcoming.length} upcoming), ` +
      `${pendingTasks.length} pending, ${completedTasks.length} completed`
  );
}

main().catch((e) => {
  console.error("  ✗ Task export failed:", e.message);
  const outDir = resolve(import.meta.dir, "..", "src", "data");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "tasks.json"),
    JSON.stringify({
      exportedAt: new Date().toISOString(),
      stats: { total: 0, pending: 0, completed: 0, overdue: 0 },
      overdue: [],
      upcoming: [],
    }),
    "utf8"
  );
});
