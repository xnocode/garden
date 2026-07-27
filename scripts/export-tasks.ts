/**
 * export-tasks.ts — Snapshot Taskwarrior data for static deploy.
 *
 * Runs `wsl task export` and writes a curated JSON file to src/data/tasks.json.
 * Only pending tasks due today/tomorrow (or with no due date) are included.
 * Completed tasks are counted but their descriptions are never stored.
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

function isTodayOrTomorrow(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = parseTWDate(dateStr);
  if (!d) return false;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayAfterTomorrow = new Date(todayStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  return d >= todayStart && d < dayAfterTomorrow;
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
    // Try to find the JSON array in the output (may have shell warnings before it)
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(trimmed);
  } catch {
    return [];
  }
}

async function main() {
  console.log("  ▸ Exporting Taskwarrior snapshot…");

  // Use `wsl -- bash -c` to properly handle shell redirection on Windows
  const pendingRaw = runCmd(
    'wsl -- bash -c "task rc.json.array=on status:pending export 2>/dev/null"'
  );
  const pendingTasks = parseTaskOutput(pendingRaw);

  const completedRaw = runCmd(
    'wsl -- bash -c "task rc.json.array=on status:completed export 2>/dev/null"'
  );
  const completedTasks = parseTaskOutput(completedRaw);

  // Filter: today/tomorrow tasks + tasks with no due date
  const todayTomorrow = pendingTasks.filter((t) => isTodayOrTomorrow(t.due));
  const noDueTasks = pendingTasks.filter((t) => !t.due);
  const visibleTasks = [...todayTomorrow, ...noDueTasks]
    .sort((a, b) => (b.urgency || 0) - (a.urgency || 0))
    .map((t) => ({
      id: t.id,
      description: t.description,
      project: t.project || null,
      tags: t.tags || [],
      priority: t.priority || null,
      due: t.due || null,
      entry: t.entry || null,
      urgency: t.urgency ?? 0,
    }));

  const snapshot = {
    exportedAt: new Date().toISOString(),
    stats: {
      total: pendingTasks.length + completedTasks.length,
      pending: pendingTasks.length,
      completed: completedTasks.length,
    },
    tasks: visibleTasks,
  };

  // Write to src/data/tasks.json
  const outDir = resolve(import.meta.dir, "..", "src", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "tasks.json");
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8");

  console.log(
    `    ✓ ${visibleTasks.length} visible task(s), ` +
      `${pendingTasks.length} pending, ${completedTasks.length} completed`
  );
}

main().catch((e) => {
  console.error("  ✗ Task export failed:", e.message);
  // Non-fatal — write empty snapshot so the build doesn't break
  const outDir = resolve(import.meta.dir, "..", "src", "data");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "tasks.json"),
    JSON.stringify({
      exportedAt: new Date().toISOString(),
      stats: { total: 0, pending: 0, completed: 0 },
      tasks: [],
    }),
    "utf8"
  );
});
