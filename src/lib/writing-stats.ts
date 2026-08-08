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

export interface MonthWritingStat {
  monthName: string;
  yearMonth: string;
  days: DayWritingStat[];
  totalWords: number;
  activeDays: number;
}

export interface HourlyWritingStat {
  hour: number; // 0..23
  label: string; // "12 AM", "1 AM", etc.
  words: number;
}

export interface DayOfWeekWritingStat {
  dayName: string; // "Sun", "Mon", etc.
  dayIndex: number; // 0..6
  words: number;
  activeCount: number;
}

export interface TopTendedNoteStat {
  title: string;
  slug: string;
  words: number;
  edits: number;
  isPublished: boolean;
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
  monthlyHistory: MonthWritingStat[];
  heatMapData: { [date: string]: number }; // YYYY-MM-DD -> word count
  hourlyDistribution: HourlyWritingStat[];
  peakWritingTimeLabel: string;
  dayOfWeekDistribution: DayOfWeekWritingStat[];
  topTendedNotes: TopTendedNoteStat[];
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
        timeKey?: string;
        w?: number;
        c?: number;
      }>;
    }>;
  };
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getWritingStats(): Promise<WritingStatsSummary> {
  const dailyGoal = 500;
  const wordCountsByDate: Map<string, { words: number; notes: Set<string> }> = new Map();
  const hourlyMap = new Array<number>(24).fill(0);
  const dayOfWeekWords = new Array<number>(7).fill(0);
  const dayOfWeekActive = new Array<number>(7).fill(0);
  const noteStatsMap: Map<string, { words: number; edits: number }> = new Map();

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

          // Track Day of Week
          const dObj = new Date(item.date);
          const dow = dObj.getDay(); // 0 = Sun

          let fileNetWords = 0;
          if (item.changes && Array.isArray(item.changes)) {
            for (const ch of item.changes) {
              if (typeof ch.w === "number" && ch.w > 0) {
                fileNetWords += ch.w;

                // Track hourly stats
                if (ch.timeKey && typeof ch.timeKey === "string") {
                  const hour = parseInt(ch.timeKey.slice(0, 2), 10);
                  if (!isNaN(hour) && hour >= 0 && hour < 24) {
                    hourlyMap[hour] += ch.w;
                  }
                }
              }
            }
          }

          if (fileNetWords > 0) {
            entry.words += fileNetWords;
            dayOfWeekWords[dow] += fileNetWords;
            dayOfWeekActive[dow] += 1;

            if (item.filePath) {
              const cleanPath = item.filePath.replace(/\.md$/, "");
              if (!noteStatsMap.has(cleanPath)) {
                noteStatsMap.set(cleanPath, { words: 0, edits: 0 });
              }
              const nStat = noteStatsMap.get(cleanPath)!;
              nStat.words += fileNetWords;
              nStat.edits += item.changes ? item.changes.length : 1;
            }
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
    const dateStr = formatLocalDate(d);

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

  // 3b. Compute full monthly history across all recorded months
  const allRecordedDates = Array.from(wordCountsByDate.keys()).sort();
  const earliestDateStr = allRecordedDates[0] || formatLocalDate(today);
  const startDate = new Date(earliestDateStr);
  startDate.setDate(1); // Start at first of that month

  const monthlyHistoryMap: Map<string, MonthWritingStat> = new Map();

  let currPointer = new Date(startDate);
  // Ensure comparison covers full current day
  const endPointer = new Date(today);
  endPointer.setHours(23, 59, 59, 999);

  while (currPointer <= endPointer) {
    const dateStr = formatLocalDate(currPointer);
    const yyyymm = dateStr.slice(0, 7);
    const monthName = currPointer.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    if (!monthlyHistoryMap.has(yyyymm)) {
      monthlyHistoryMap.set(yyyymm, {
        monthName,
        yearMonth: yyyymm,
        days: [],
        totalWords: 0,
        activeDays: 0,
      });
    }

    const mGroup = monthlyHistoryMap.get(yyyymm)!;
    const record = wordCountsByDate.get(dateStr);
    const words = record ? record.words : 0;
    const notesCount = record ? record.notes.size : 0;

    if (words > 0) {
      mGroup.totalWords += words;
      mGroup.activeDays += 1;
    }

    mGroup.days.push({
      date: dateStr,
      words,
      goalMet: words > 0 && (words >= dailyGoal || notesCount > 0),
      notesModified: notesCount,
      formattedDate: currPointer.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });

    currPointer.setDate(currPointer.getDate() + 1);
  }

  const monthlyHistory = Array.from(monthlyHistoryMap.values()).reverse();

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
  const todayStr = formatLocalDate(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let checkDate = new Date(today);
  // If no activity today, start checking from yesterday to preserve active streak
  if (!wordCountsByDate.has(todayStr) || (wordCountsByDate.get(todayStr)?.words === 0 && wordCountsByDate.get(todayStr)?.notes.size === 0)) {
    checkDate = yesterday;
  }

  while (true) {
    const dStr = formatLocalDate(checkDate);
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

  // 5. Hourly Distribution
  const hourlyDistribution: HourlyWritingStat[] = hourlyMap.map((words, h) => {
    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return {
      hour: h,
      label: `${displayHour} ${period}`,
      words,
    };
  });

  // Calculate Peak Time Label
  const morningWords = hourlyMap.slice(6, 12).reduce((a, b) => a + b, 0);
  const afternoonWords = hourlyMap.slice(12, 17).reduce((a, b) => a + b, 0);
  const eveningWords = hourlyMap.slice(17, 21).reduce((a, b) => a + b, 0);
  const nightWords = [...hourlyMap.slice(21, 24), ...hourlyMap.slice(0, 6)].reduce((a, b) => a + b, 0);

  let peakWritingTimeLabel = "Night Owl Writer (9 PM – 2 AM)";
  const maxBlock = Math.max(morningWords, afternoonWords, eveningWords, nightWords);
  if (maxBlock === morningWords && morningWords > 0) {
    peakWritingTimeLabel = "Early Bird Writer (6 AM – 12 PM)";
  } else if (maxBlock === afternoonWords && afternoonWords > 0) {
    peakWritingTimeLabel = "Afternoon Writer (12 PM – 5 PM)";
  } else if (maxBlock === eveningWords && eveningWords > 0) {
    peakWritingTimeLabel = "Evening Writer (5 PM – 9 PM)";
  }

  // 6. Day of Week Distribution
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeekDistribution: DayOfWeekWritingStat[] = dayNames.map((dayName, idx) => ({
    dayName,
    dayIndex: idx,
    words: dayOfWeekWords[idx],
    activeCount: dayOfWeekActive[idx],
  }));

  // 7. Top Tended Notes Leaderboard
  const notesLookupMap = new Map<string, string>();
  for (const n of notesData as Array<{ slug: string; title: string }>) {
    notesLookupMap.set(n.slug.toLowerCase(), n.title);
    notesLookupMap.set(n.slug.split("/").pop()!.toLowerCase(), n.title);
  }

  const publishedSlugs = new Set(
    (notesData as Array<{ slug: string }>).map((n) => n.slug.toLowerCase())
  );

  const topTendedNotes: TopTendedNoteStat[] = Array.from(noteStatsMap.entries())
    .map(([cleanPath, stat]) => {
      const lowerKey = cleanPath.toLowerCase();
      const baseKey = cleanPath.split("/").pop()!.toLowerCase();
      const title = notesLookupMap.get(lowerKey) || notesLookupMap.get(baseKey) || cleanPath.split("/").pop() || cleanPath;
      const isPublished = publishedSlugs.has(lowerKey) || publishedSlugs.has(baseKey);

      return {
        title,
        slug: cleanPath,
        words: stat.words,
        edits: stat.edits,
        isPublished,
      };
    })
    .sort((a, b) => b.words - a.words)
    .slice(0, 6);

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
    monthlyHistory,
    heatMapData,
    hourlyDistribution,
    peakWritingTimeLabel,
    dayOfWeekDistribution,
    topTendedNotes,
  };
}
