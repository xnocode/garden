/**
 * generate-task-analytics.ts
 *
 * Runs the Taskwarrior analytics commands and writes structured JSON data
 * to src/data/task-analytics.json. Called by publish.ts at publish time.
 *
 * Usage: bun run scripts/generate-task-analytics.ts
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

function runTask(args: string[]): string {
  const result = spawnSync("task", ["rc.color=0", "rc.detection=0", ...args], {
    encoding: "utf8",
    cwd: ROOT,
    timeout: 15_000,
  });
  if (result.error) throw result.error;
  // Strip "Configuration override" lines
  return (result.stdout || "")
    .split("\n")
    .filter((l) => !l.startsWith("Configuration override"))
    .join("\n");
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface SummaryProject {
  project: string;
  remaining: number;
  avgAge: string;
  completePct: number;
}

export interface GHistoryRow {
  year: string;
  month: string; // empty for annual
  added: number;
  completed: number;
  deleted: number;
}

export interface HistoryRow {
  year: string;
  month: string; // empty for annual, "Average" for average row
  added: number;
  completed: number;
  deleted: number;
  net: number;
  isAverage?: boolean;
}

export interface BurndownDataPoint {
  label: string;
  pending: number;
  started: number;
  done: number;
}

export interface BurndownData {
  title: string;
  netFixRate: string;
  estimatedCompletion: string;
  dataPoints: BurndownDataPoint[];
}

export interface TaskAnalytics {
  generatedAt: string;
  summary: SummaryProject[];
  ghistoryMonthly: GHistoryRow[];
  ghistoryAnnual: GHistoryRow[];
  historyMonthly: HistoryRow[];
  historyAnnual: HistoryRow[];
  burndownDaily: BurndownData;
  burndownMonthly: BurndownData;
  burndownWeekly: BurndownData;
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

// ─────────────────────────────────────────────
// Parsers
// ─────────────────────────────────────────────

function parseSummary(raw: string): SummaryProject[] {
  const projects: SummaryProject[] = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Za-z][\w.]*)\s+(\d+)\s+(\S+)\s+(\d+)%/);
    if (m) {
      projects.push({
        project: m[1],
        remaining: parseInt(m[2], 10),
        avgAge: m[3],
        completePct: parseInt(m[4], 10),
      });
    }
  }
  return projects;
}

function parseGHistory(raw: string, isAnnual: boolean): GHistoryRow[] {
  const rows: GHistoryRow[] = [];
  let currentYear = "";

  for (const line of raw.split("\n")) {
    if (!line.trim() || line.startsWith("Year") || line.startsWith("Legend")) continue;

    if (isAnnual) {
      // "2026 +++++++++++++++X---..."
      const m = line.match(/^(\d{4})\s+([\+X\-\s]+)/);
      if (m) {
        const bar = m[2];
        rows.push({
          year: m[1],
          month: "",
          added: (bar.match(/\+/g) || []).length,
          completed: (bar.match(/X/g) || []).length,
          deleted: (bar.match(/-/g) || []).length,
        });
      }
    } else {
      // "2026 July   ++++++...X...------"
      const full = line.match(/^(\d{4})\s+([A-Za-z]+)\s+([\+X\-\s]+)/);
      // "     August  +++...------"
      const cont = line.match(/^\s+([A-Za-z]+)\s+([\+X\-\s]+)/);

      if (full) {
        currentYear = full[1];
        const bar = full[3];
        rows.push({
          year: currentYear,
          month: full[2],
          added: (bar.match(/\+/g) || []).length,
          completed: (bar.match(/X/g) || []).length,
          deleted: (bar.match(/-/g) || []).length,
        });
      } else if (cont && currentYear) {
        const bar = cont[2];
        rows.push({
          year: currentYear,
          month: cont[1],
          added: (bar.match(/\+/g) || []).length,
          completed: (bar.match(/X/g) || []).length,
          deleted: (bar.match(/-/g) || []).length,
        });
      }
    }
  }
  return rows;
}

function parseHistory(raw: string, isAnnual: boolean): HistoryRow[] {
  const rows: HistoryRow[] = [];
  let currentYear = "";

  for (const line of raw.split("\n")) {
    if (!line.trim() || line.startsWith("Year")) continue;

    if (isAnnual) {
      // "2026      146         6      91  49"
      const m = line.match(/^(\d{4})\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
      if (m) {
        rows.push({
          year: m[1], month: "",
          added: +m[2], completed: +m[3], deleted: +m[4], net: +m[5],
        });
      }
      // "Average   146   6   91  49"
      const avg = line.match(/^\s*Average\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
      if (avg) {
        rows.push({
          year: "", month: "Average",
          added: +avg[1], completed: +avg[2], deleted: +avg[3], net: +avg[4],
          isAverage: true,
        });
      }
    } else {
      // "2026 July         54         0      37  17"
      const full = line.match(/^(\d{4})\s+([A-Za-z]+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
      // "     August       28         0      36  -8"
      const cont = line.match(/^\s+([A-Za-z]+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
      // "     Average      48         2      30  16"
      const avg = line.match(/^\s*Average\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);

      if (full) {
        currentYear = full[1];
        rows.push({
          year: currentYear, month: full[2],
          added: +full[3], completed: +full[4], deleted: +full[5], net: +full[6],
        });
      } else if (avg) {
        rows.push({
          year: "", month: "Average",
          added: +avg[1], completed: +avg[2], deleted: +avg[3], net: +avg[4],
          isAverage: true,
        });
      } else if (cont && currentYear && cont[1] !== "Average") {
        rows.push({
          year: currentYear, month: cont[1],
          added: +cont[2], completed: +cont[3], deleted: +cont[4], net: +cont[5],
        });
      }
    }
  }
  return rows;
}

function parseBurndown(raw: string): BurndownData {
  const lines = raw.split("\n");

  const titleLine = lines.find((l) => l.includes("Burndown"));
  const title = titleLine?.trim() || "Burndown";

  const fixRateLine = lines.find((l) => l.includes("Net Fix Rate"));
  const estLine = lines.find((l) => l.includes("Estimated completion"));
  const netFixRate = fixRateLine?.match(/:\s*(.+)/)?.[1]?.trim() || "";
  const estimatedCompletion = estLine?.match(/:\s*(.+)/)?.[1]?.trim() || "";

  // Find " 0 +" line separating chart from labels
  const zeroLineIdx = lines.findIndex((l) => /^\s+0\s+\+/.test(l));
  if (zeroLineIdx < 0) {
    return { title, netFixRate, estimatedCompletion, dataPoints: [] };
  }

  // The axis label numbers are on zeroLineIdx+1
  const labelLine = lines[zeroLineIdx + 1] || "";
  // Period line (e.g. "     Sep" or "     2025         2026" or "     2026")
  const periodLine = lines[zeroLineIdx + 2] || "";

  // Match all label tokens and their character positions
  const labelMatches = [...labelLine.matchAll(/(\S+)/g)];
  if (labelMatches.length === 0) {
    return { title, netFixRate, estimatedCompletion, dataPoints: [] };
  }

  // Build human-readable labels
  const periodTokens = periodLine.trim().split(/\s{2,}/); // split on 2+ spaces for multi-year
  const colLabels: string[] = labelMatches.map((m) => {
    const num = m[1];
    if (periodTokens.length === 1) {
      const p = periodTokens[0];
      if (/^\d{4}$/.test(p)) return `W${num}`;  // weekly: just week numbers with year
      return `${p} ${num}`;                       // daily: "Sep 03"
    }
    // monthly with potential year wrap — just return the number
    return num;
  });

  // Find chart content rows (lines with only "|" as axis + chart chars)
  const chartLines = lines
    .slice(0, zeroLineIdx + 1)
    .filter((l) => /^\s+\|/.test(l));

  // The chart symbol for each column sits 1 char to the RIGHT of where the
  // label token starts (Taskwarrior left-aligns 2-digit numbers in 3-char
  // columns: "10 " → symbol at slot[2] = labelIndex+1... actually the symbol
  // appears at labelIndex+1 based on empirical measurement).
  const colPositions = labelMatches.map((m) => m.index! + 1);
  const numCols = colPositions.length;

  const pending = new Array(numCols).fill(0);
  const started = new Array(numCols).fill(0);
  const done = new Array(numCols).fill(0);

  for (const chartLine of chartLines) {
    for (let ci = 0; ci < numCols; ci++) {
      const pos = colPositions[ci];
      if (pos >= chartLine.length) continue;
      const ch = chartLine[pos];
      if (ch === "X") pending[ci]++;
      else if (ch === ".") done[ci]++;
      else if (ch === "+") started[ci]++;
    }
  }

  const dataPoints: BurndownDataPoint[] = labelMatches.map((_, i) => ({
    label: colLabels[i],
    pending: pending[i],
    started: started[i],
    done: done[i],
  }));

  // Keep only columns that have any data
  const nonEmpty = dataPoints.filter((d) => d.pending + d.started + d.done > 0);
  return { title, netFixRate, estimatedCompletion, dataPoints: nonEmpty.length > 0 ? nonEmpty : dataPoints };
}

// ─────────────────────────────────────────────
// Main export function
// ─────────────────────────────────────────────

export async function generateTaskAnalytics(): Promise<TaskAnalytics> {
  console.log("  📊 generating task analytics…");

  const rawSummary      = runTask(["summary"]);
  const rawGHistMonthly = runTask(["ghistory.monthly"]);
  const rawGHistAnnual  = runTask(["ghistory.annual"]);
  const rawHistMonthly  = runTask(["history.monthly"]);
  const rawHistAnnual   = runTask(["history.annual"]);
  const rawBurnDaily    = runTask(["burndown.daily"]);
  const rawBurnMonthly  = runTask(["burndown.monthly"]);
  const rawBurnWeekly   = runTask(["burndown.weekly"]);

  return {
    generatedAt:      new Date().toISOString(),
    summary:          parseSummary(rawSummary),
    ghistoryMonthly:  parseGHistory(rawGHistMonthly, false),
    ghistoryAnnual:   parseGHistory(rawGHistAnnual, true),
    historyMonthly:   parseHistory(rawHistMonthly, false),
    historyAnnual:    parseHistory(rawHistAnnual, true),
    burndownDaily:    parseBurndown(rawBurnDaily),
    burndownMonthly:  parseBurndown(rawBurnMonthly),
    burndownWeekly:   parseBurndown(rawBurnWeekly),
    raw: {
      summary: rawSummary,
      ghistoryMonthly: rawGHistMonthly,
      ghistoryAnnual: rawGHistAnnual,
      historyMonthly: rawHistMonthly,
      historyAnnual: rawHistAnnual,
      burndownDaily: rawBurnDaily,
      burndownMonthly: rawBurnMonthly,
      burndownWeekly: rawBurnWeekly,
    },
  };
}

// ─────────────────────────────────────────────
// CLI entry point
// ─────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const dataDir = join(ROOT, "src", "data");
  await mkdir(dataDir, { recursive: true });

  const analytics = await generateTaskAnalytics();
  await writeFile(
    join(dataDir, "task-analytics.json"),
    JSON.stringify(analytics, null, 2),
    "utf8"
  );

  console.log("  ✓ task-analytics.json written");
  console.log(`    summary:          ${analytics.summary.length} projects`);
  console.log(`    history monthly:  ${analytics.historyMonthly.length} rows`);
  console.log(`    history annual:   ${analytics.historyAnnual.length} rows`);
  console.log(`    burndown daily:   ${analytics.burndownDaily.dataPoints.length} points`);
  console.log(`    burndown weekly:  ${analytics.burndownWeekly.dataPoints.length} points`);
  console.log(`    burndown monthly: ${analytics.burndownMonthly.dataPoints.length} points`);
}
