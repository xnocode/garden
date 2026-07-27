/**
 * export-tasks.ts — Snapshot Taskwarrior data for static deploy.
 *
 * Runs `wsl task export` and writes a curated JSON file to src/data/tasks.json.
 * Only pending tasks due today/tomorrow (or with no due date) are included.
 * Completed tasks are counted but their descriptions are never stored.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
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

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = parseTWDate(dateStr);
  if (!d) return false;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d < todayStart;
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
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(trimmed);
  } catch {
    return [];
  }
}

/** Taskwarrior modifier prefixes (e.g. due:today, priority:H) */
const TW_MODIFIER_PREFIX_RE = /^(due:|priority:|project:|tag:|tags:|until:|wait:|recur:|scheduled:|depends:)\S*/i;
/** Taskwarrior virtual tag syntax: +tag or -tag */
const TW_TAG_RE = /^[+-]\S+$/;

/**
 * Split a raw task string like "Buy groceries due:today priority:H +work"
 * into a quoted description + separate modifier tokens so Taskwarrior
 * parses them correctly instead of stuffing everything into the description.
 */
function buildTaskAddArgs(raw: string): string {
  const tokens = raw.trim().split(/\s+/);
  const modifiers: string[] = [];
  const descWords: string[] = [];

  for (const token of tokens) {
    if (TW_MODIFIER_PREFIX_RE.test(token) || TW_TAG_RE.test(token)) {
      modifiers.push(token);
    } else {
      descWords.push(token);
    }
  }

  const desc = descWords.join(" ").replace(/'/g, "'\\''");
  const mods = modifiers.map((m) => m.replace(/'/g, "'\\''")).join(" ");
  return `'${desc}' ${mods}`.trim();
}

async function main() {
  console.log("  ▸ Snapshotting Taskwarrior data…");

  // 1a. Mark tasks done that were queued via Telegram /done command
  const pendingDoneFile = resolve(import.meta.dir, "..", "src", "data", "pending-done.json");
  if (existsSync(pendingDoneFile)) {
    try {
      const raw = readFileSync(pendingDoneFile, "utf8");
      const ids: number[] = JSON.parse(raw);
      if (Array.isArray(ids) && ids.length > 0) {
        console.log(`    ▸ Marking ${ids.length} task(s) done from Telegram /done queue…`);
        for (const id of ids) {
          const out = runCmd(`wsl -- bash -c "task rc.confirmation=off ${id} done 2>/dev/null"`);
          if (out.includes("Completed") || out.includes("completed")) {
            console.log(`      ✓ Marked done: task #${id}`);
          } else {
            console.log(`      ⚠ Task #${id} may already be done or ID shifted`);
          }
        }
        writeFileSync(pendingDoneFile, "[]\n", "utf8");
      }
    } catch (e: any) {
      console.warn("    ⚠️ Failed to process pending-done tasks:", e.message);
    }
  }

  // 1b. Process any pending tasks sent via Telegram /task command
  const pendingFile = resolve(import.meta.dir, "..", "src", "data", "pending-tasks.json");
  if (existsSync(pendingFile)) {
    try {
      const content = readFileSync(pendingFile, "utf8");
      const items: { raw: string; addedAt: string }[] = JSON.parse(content);
      if (Array.isArray(items) && items.length > 0) {
        console.log(`    ▸ Importing ${items.length} pending task(s) from Telegram into WSL Taskwarrior…`);
        for (const item of items) {
          if (!item.raw) continue;
          const args = buildTaskAddArgs(item.raw);
          runCmd(`wsl -- bash -c "task add ${args} 2>/dev/null"`);
          console.log(`      ✓ Added to WSL: "${item.raw}"`);
        }
        // Clear queue after importing
        writeFileSync(pendingFile, "[]\n", "utf8");
      }
    } catch (e: any) {
      console.warn("    ⚠️ Failed to process pending Telegram tasks:", e.message);
    }
  }

  const pendingRaw = runCmd(
    'wsl -- bash -c "task rc.json.array=on status:pending export 2>/dev/null"'
  );
  const pendingTasks = parseTaskOutput(pendingRaw);

  const completedRaw = runCmd(
    'wsl -- bash -c "task rc.json.array=on status:completed export 2>/dev/null"'
  );
  const completedTasks = parseTaskOutput(completedRaw);

  // Categorize pending tasks
  const overdueTasks = pendingTasks.filter((t) => isOverdue(t.due));
  const todayTomorrow = pendingTasks.filter((t) => isTodayOrTomorrow(t.due));
  // Tasks with no due date or future due dates are NOT shown publicly

  const mapTask = (t: RawTask, overdue: boolean) => ({
    id: t.id,
    description: t.description,
    project: t.project || null,
    tags: t.tags || [],
    priority: t.priority || null,
    due: t.due || null,
    entry: t.entry || null,
    urgency: t.urgency ?? 0,
    overdue,
  });

  // Sort order: overdue first (by urgency), then today/tomorrow (by urgency)
  const visibleTasks = [
    ...overdueTasks.sort((a, b) => (b.urgency || 0) - (a.urgency || 0)).map((t) => mapTask(t, true)),
    ...todayTomorrow.sort((a, b) => (b.urgency || 0) - (a.urgency || 0)).map((t) => mapTask(t, false)),
  ];

  const snapshot = {
    exportedAt: new Date().toISOString(),
    stats: {
      total: pendingTasks.length + completedTasks.length,
      pending: pendingTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks.length,
    },
    tasks: visibleTasks,
  };

  const outDir = resolve(import.meta.dir, "..", "src", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "tasks.json");
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8");

  console.log(
    `    ✓ ${visibleTasks.length} visible task(s) (${overdueTasks.length} overdue), ` +
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
      stats: { total: 0, pending: 0, completed: 0 },
      tasks: [],
    }),
    "utf8"
  );
});
