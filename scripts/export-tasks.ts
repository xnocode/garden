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
  // Normalize colon or dot date separators: due:2026:08:04 -> due:2026-08-04
  const normalizedRaw = raw.replace(/\b(due|until|wait|scheduled):(\d{4})[:.](\d{2})[:.](\d{2})\b/gi, "$1:$2-$3-$4");

  const tokens = normalizedRaw.trim().split(/\s+/);
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
  const pendingDoneFile = resolve((import.meta as any).dir, "..", "src", "data", "pending-done.json");
  if (existsSync(pendingDoneFile)) {
    try {
      const raw = readFileSync(pendingDoneFile, "utf8");
      const uuids: string[] = JSON.parse(raw);
      if (Array.isArray(uuids) && uuids.length > 0) {
        console.log(`    ▸ Marking ${uuids.length} task(s) done from Telegram /done queue…`);
        for (const uuid of uuids) {
          // UUID is stable — never shifts when other tasks complete
          const out = runCmd(`wsl -- bash -c "task rc.confirmation=off uuid:${uuid} done 2>/dev/null"`);
          if (out.includes("Completed") || out.includes("completed")) {
            console.log(`      ✓ Marked done: ${uuid.slice(0, 8)}…`);
          } else if (out.includes("No matches") || out.includes("No tasks")) {
            console.log(`      ⚠ Already done or not found: ${uuid.slice(0, 8)}…`);
          } else {
            console.log(`      ⚠ Unexpected result for ${uuid.slice(0, 8)}…`);
          }
        }
        writeFileSync(pendingDoneFile, "[]\n", "utf8");
      }
    } catch (e: any) {
      console.warn("    ⚠️ Failed to process pending-done tasks:", e.message);
    }
  }

  // 1b. Process any pending tasks sent via Telegram /task command
  const pendingFile = resolve((import.meta as any).dir, "..", "src", "data", "pending-tasks.json");
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
  const noDueDateTasks = pendingTasks.filter((t) => !t.due);
  const futureTasks = pendingTasks.filter((t) => t.due && !isOverdue(t.due) && !isTodayOrTomorrow(t.due));

  const mapTask = (t: RawTask, overdue: boolean) => ({
    id: t.id,
    uuid: t.uuid,          // stable identifier — never shifts
    description: t.description,
    project: t.project || null,
    tags: t.tags || [],
    priority: t.priority || null,
    due: t.due || null,
    entry: t.entry || null,
    urgency: t.urgency ?? 0,
    overdue,
  });

  // Calculate XP awarded for completing a task on time
  function calculateCompletedTaskXp(t: RawTask): number {
    let xp = 150; // base task completion XP
    if (t.priority === "H") xp += 100; // 250 XP for high priority
    else if (t.priority === "M") xp += 50; // 200 XP for medium priority
    else if (t.priority === "L") xp += 20; // 170 XP for low priority
    return xp;
  }

  // Calculate XP penalty for completing a task AFTER its due date (missed)
  // Penalty is harsher than the reward to enforce real accountability.
  function calculateMissedTaskXpPenalty(t: RawTask): number {
    let penalty = 200; // base penalty (vs 150 base reward)
    if (t.priority === "H") penalty += 150; // -350 XP (vs +250 reward)
    else if (t.priority === "M") penalty += 50;  // -250 XP (vs +200 reward)
    else if (t.priority === "L") penalty += 20;  // -220 XP (vs +170 reward)
    return -penalty; // always negative
  }

  // Categorize and sort ALL pending tasks:
  // Order: overdue first, then today/tomorrow, then no due date, then future tasks
  const visibleTasks = [
    ...overdueTasks.sort((a, b) => (b.urgency || 0) - (a.urgency || 0)).map((t) => mapTask(t, true)),
    ...todayTomorrow.sort((a, b) => (b.urgency || 0) - (a.urgency || 0)).map((t) => mapTask(t, false)),
    ...noDueDateTasks.sort((a, b) => (b.urgency || 0) - (a.urgency || 0)).map((t) => mapTask(t, false)),
    ...futureTasks.sort((a, b) => (b.urgency || 0) - (a.urgency || 0)).map((t) => mapTask(t, false)),
  ];

  // Most recent 10 completed tasks (sorted by end timestamp descending)
  const recentCompleted = [...completedTasks]
    .sort((a, b) => {
      const dateA = a.end ? (parseTWDate(a.end)?.getTime() ?? 0) : (a.modified ? (parseTWDate(a.modified)?.getTime() ?? 0) : 0);
      const dateB = b.end ? (parseTWDate(b.end)?.getTime() ?? 0) : (b.modified ? (parseTWDate(b.modified)?.getTime() ?? 0) : 0);
      return dateB - dateA;
    })
    .slice(0, 10)
    .map((t) => {
      // A task is "missed" if it had a due date and was completed after that due date
      const endTime = t.end ? parseTWDate(t.end)?.getTime() : null;
      const dueTime = t.due ? parseTWDate(t.due)?.getTime() : null;
      const wasMissed = !!(dueTime && endTime && endTime > dueTime);
      return {
        id: t.id,
        uuid: t.uuid,
        description: t.description,
        project: t.project || null,
        tags: t.tags || [],
        priority: t.priority || null,
        due: t.due || null,
        entry: t.entry || null,
        end: t.end || t.modified || null,
        urgency: t.urgency ?? 0,
        wasMissed,
        xpAwarded: wasMissed ? 0 : calculateCompletedTaskXp(t),
        xpPenalty: wasMissed ? calculateMissedTaskXpPenalty(t) : 0,
      };
    });

  const snapshot = {
    exportedAt: new Date().toISOString(),
    stats: {
      total: pendingTasks.length + completedTasks.length,
      pending: pendingTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks.length,
    },
    tasks: visibleTasks,
    completedTasks: recentCompleted,
  };

  const outDir = resolve((import.meta as any).dir, "..", "src", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "tasks.json");
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8");

  const missedCount = recentCompleted.filter((t) => t.wasMissed).length;
  console.log(
    `    ✓ ${visibleTasks.length} pending task(s) (${overdueTasks.length} overdue), ` +
      `${recentCompleted.length} recent completed task(s) (${missedCount} missed/penalized), ` +
      `${completedTasks.length} total completed`
  );
}

main().catch((e) => {
  console.error("  ✗ Task export failed:", e.message);
  const outDir = resolve((import.meta as any).dir, "..", "src", "data");
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
