import fs from "node:fs";
import path from "node:path";
import notesData from "@/data/notes.json";

export interface DayWritingStat {
  date: string; // YYYY-MM-DD
  words: number;
  goalMet: boolean;
  notesModified: number;
  formattedDate: string;
}

export interface WritingStatsSummary {
  currentStreak: number;
  longestStreak: number;
  todayWords: number;
  dailyGoal: number;
  todayGoalMet: boolean;
  totalActiveDays: number;
  totalWordsRecorded: number;
  avgWordsPerActiveDay: number;
  last30Days: DayWritingStat[];
  heatMapData: { [date: string]: number }; // YYYY-MM-DD -> word count
}

interface KeepTheRhythmData {
  settings?: {
    dailyWritingGoal?: string | number;
  };
  stats?: {
    currentStreak?: number;
    highestStreak?: number;
    daysWithCompletedGoal?: string[];
    dailyActivity?: Array<{
      date: string;
      filePath: string;
      changes?: Array<{
        w?: number;
        c?: number;
      }>;
    }>;
  };
}

export async function getWritingStats(): Promise<WritingStatsSummary> {
  const dailyGoal = 500;
  const wordCountsByDate: Map<string, { words: number; notes: Set<string> }> = new Map();

  // 1. First parse Keep the Rhythm data.json if present
  try {
    const pluginDataPath = path.join(
      process.cwd(),
      "content",
      ".obsidian",
      "plugins",
      "keep-the-rhythm",
      "data.json"
    );

    if (fs.existsSync(pluginDataPath)) {
      const raw = fs.readFileSync(pluginDataPath, "utf-8");
      const parsed: KeepTheRhythmData = JSON.parse(raw);

      if (parsed.stats?.dailyActivity) {
        for (const item of parsed.stats.dailyActivity) {
          if (!item.date) continue;
          if (!wordCountsByDate.has(item.date)) {
            wordCountsByDate.set(item.date, { words: 0, notes: new Set() });
          }
          const entry = wordCountsByDate.get(item.date)!;
          if (item.filePath) entry.notes.add(item.filePath);

          let fileNetWords = 0;
          if (item.changes && Array.isArray(item.changes)) {
            for (const ch of item.changes) {
              if (typeof ch.w === "number") {
                fileNetWords += ch.w;
              }
            }
          }
          if (fileNetWords > 0) {
            entry.words += fileNetWords;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error parsing keep-the-rhythm data:", err);
  }

  // Calculate actual total published words in garden
  const actualGardenTotalWords = (notesData as Array<{ wordCount: number }>).reduce(
    (acc, n) => acc + (n.wordCount || 0),
    0
  );

  // 2. Augment with notes.json published/updated dates so notes data is also counted
  for (const n of notesData as Array<{ slug: string; wordCount: number; updatedAt: string; publishDate: string | null }>) {
    const dStr = (n.publishDate || n.updatedAt || "").slice(0, 10);
    if (dStr && /^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      if (!wordCountsByDate.has(dStr)) {
        wordCountsByDate.set(dStr, { words: 0, notes: new Set() });
      }
      const entry = wordCountsByDate.get(dStr)!;
      entry.notes.add(n.slug);
      if (entry.words === 0) {
        entry.words = Math.max(entry.words, n.wordCount || 150);
      }
    }
  }

  // 3. Compute 30-day window
  const today = new Date();
  const last30Days: DayWritingStat[] = [];
  const heatMapData: { [date: string]: number } = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const record = wordCountsByDate.get(dateStr);
    const words = record ? record.words : 0;
    const notesCount = record ? record.notes.size : 0;

    heatMapData[dateStr] = words;

    last30Days.push({
      date: dateStr,
      words,
      goalMet: words > 0 && (words >= dailyGoal || notesCount > 0),
      notesModified: notesCount,
      formattedDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
  }

  // 4. Compute Streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let totalWordsRecorded = 0;
  let totalActiveDays = 0;

  // Sort all dates chronologically
  const sortedDates = Array.from(wordCountsByDate.keys()).sort();

  for (const dStr of sortedDates) {
    const entry = wordCountsByDate.get(dStr)!;
    if (entry.words > 0 || entry.notes.size > 0) {
      totalActiveDays++;
      totalWordsRecorded += entry.words;
    }
  }

  // Calculate streak backwards from today or yesterday
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let checkDate = new Date(today);
  // If no activity today, start checking from yesterday to preserve active streak
  if (!wordCountsByDate.has(todayStr) || (wordCountsByDate.get(todayStr)?.words === 0 && wordCountsByDate.get(todayStr)?.notes.size === 0)) {
    checkDate = yesterday;
  }

  while (true) {
    const dStr = checkDate.toISOString().slice(0, 10);
    const entry = wordCountsByDate.get(dStr);
    if (entry && (entry.words > 0 || entry.notes.size > 0)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak historically across sorted dates
  let prevTimestamp: number | null = null;
  for (const dStr of sortedDates) {
    const entry = wordCountsByDate.get(dStr)!;
    if (entry.words > 0 || entry.notes.size > 0) {
      const curTime = new Date(dStr).getTime();
      if (prevTimestamp === null || curTime - prevTimestamp === 86400000) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      prevTimestamp = curTime;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const todayRecord = wordCountsByDate.get(todayStr);
  const todayWords = todayRecord ? todayRecord.words : 0;
  const todayGoalMet = todayWords > 0 && (todayWords >= dailyGoal || (todayRecord ? todayRecord.notes.size > 0 : false));

  return {
    currentStreak,
    longestStreak,
    todayWords,
    dailyGoal,
    todayGoalMet,
    totalActiveDays,
    totalWordsRecorded: actualGardenTotalWords,
    avgWordsPerActiveDay: totalActiveDays > 0 ? Math.round(actualGardenTotalWords / totalActiveDays) : 0,
    last30Days,
    heatMapData,
  };
}
