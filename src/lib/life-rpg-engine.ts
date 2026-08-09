/**
 * Core RPG Engine for Gamified Life OS (1000-Level System)
 * Parses Taskwarrior tasks, Obsidian notes, Keep The Rhythm activity,
 * and calculates XP, Level (1-1000), 4 Attributes, and 1000 Unique Titles.
 */

import notesData from "@/data/notes.json";

export interface TaskwarriorTask {
  id: number;
  description: string;
  project: string | null;
  tags: string[];
  priority: string | null;
  due: string | null;
  entry: string | null;
  urgency: number;
  status?: string;
  overdue?: boolean;
}

export interface TaskSnapshot {
  exportedAt: string;
  stats: {
    total: number;
    pending: number;
    completed: number;
    overdue?: number;
  };
  tasks: TaskwarriorTask[];
}

export interface PlayerProfile {
  level: number;
  maxLevel: number;
  title: string;
  prestigeRank: string;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPct: number;
  nightOwlActive: boolean;
  streakDays: number;
}

// ----------------------------------------------------------------------------
// 1000 Unique Level Titles Generator Matrix
// ----------------------------------------------------------------------------
const TITLE_PREFIXES = [
  "Novice", "Curious", "Sprout", "Thought", "Apprentice", "Seeking", "Fledgling",
  "Diligent", "Studious", "Steadfast", "Arcane", "System", "Adept", "Keen",
  "Ascendant", "Valiant", "Persistent", "Master", "Archon", "Paragon", "Luminous",
  "Cosmic", "Transcendent", "Omniscient", "Sovereign"
];

const TITLE_DOMAINS = [
  "Observer", "Scribbler", "Weaver", "Architect", "Strategist", "Paladin",
  "Scholar", "Alchemist", "Vanguard", "Sentinel", "Sage", "Crusader",
  "Visionary", "Mastermind", "Monarch", "Pioneer", "Overlord", "Grandmaster"
];

/**
 * Returns a unique title for any level between 1 and 1000.
 */
export function getLevelTitle(level: number, isNightOwl: boolean = false): string {
  if (level <= 0) level = 1;
  if (level > 1000) level = 1000;

  if (level === 1000) return "👑 Omniscient Grandmaster Sovereign";
  if (level === 1) return "Novice Observer";

  // Specific milestone overrides
  const milestones: Record<number, string> = {
    10: "Sprout Weaver",
    25: "Taskwarrior Vanguard",
    50: "Mind Architect",
    100: "Century Scholar",
    250: "Master System Designer",
    500: "Archon of Wisdom",
    750: "Cosmic Paragon",
    999: "Sovereign of Infinity"
  };

  if (milestones[level]) {
    return isNightOwl ? `Night ${milestones[level]}` : milestones[level];
  }

  // Algorithmic 1000-level title generation for unique name guaranteed per level
  const pIdx = (level - 1) % TITLE_PREFIXES.length;
  const dIdx = Math.floor((level - 1) / TITLE_PREFIXES.length) % TITLE_DOMAINS.length;

  const romanNumeral = level > 50 ? ` Tier ${Math.floor(level / 25)}` : "";
  let finalTitle = `${TITLE_PREFIXES[pIdx]} ${TITLE_DOMAINS[dIdx]}${romanNumeral}`;

  if (isNightOwl && (level % 3 === 0 || level === 14)) {
    finalTitle = finalTitle.replace(/^(Novice|Curious|Studious|Adept|Master)/, "Night");
    if (!finalTitle.includes("Night")) finalTitle = `Night ${finalTitle}`;
  }

  return finalTitle;
}

/**
 * Returns Prestige Rank Name based on Level (1 - 1000).
 */
export function getPrestigeRank(level: number): string {
  if (level >= 1000) return "👑 Grandmaster Sovereign";
  if (level >= 751) return "🌌 Cosmic Sovereign";
  if (level >= 501) return "🔥 Legendary Paragon";
  if (level >= 301) return "💎 Archon Visionary";
  if (level >= 151) return "🥇 Master Strategist";
  if (level >= 51) return "🥈 Adept Scholar";
  return "🥉 Novice Adventurer";
}

// ----------------------------------------------------------------------------
// XP & Level Formula (Polynomial Curve up to Level 1000)
// Required XP for Level N = Math.floor(100 * Math.pow(N, 1.85))
// ----------------------------------------------------------------------------
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level, 1.85));
}

export function getLevelFromTotalXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPct: number;
} {
  let level = 1;
  while (level < 1000 && totalXp >= getXpForLevel(level + 1)) {
    level++;
  }

  const prevLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  const xpInCurrentLevel = totalXp - prevLevelXp;
  const xpNeededForNext = nextLevelXp - prevLevelXp;

  const progressPct = level >= 1000
    ? 100
    : Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForNext) * 100)));

  return {
    level,
    currentLevelXp: xpInCurrentLevel,
    nextLevelXp: xpNeededForNext,
    progressPct,
  };
}

// ----------------------------------------------------------------------------
// Night Owl Detection (9 PM - 4 AM)
// ----------------------------------------------------------------------------
export function isNightOwlHours(): boolean {
  const dhakaHoursStr = new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Dhaka",
    hour12: false,
    hour: "2-digit",
  });
  const hour = parseInt(dhakaHoursStr, 10);
  // Night Owl hours: 21:00 (9 PM) to 04:00 (4 AM)
  return hour >= 21 || hour < 4;
}

// ----------------------------------------------------------------------------
// Player Profile Data Calculation
// ----------------------------------------------------------------------------
export function calculatePlayerProfile(
  taskData: TaskSnapshot,
  writingStats?: any
): PlayerProfile {
  const completedTasks = taskData.stats?.completed || 0;

  const notesList = notesData as Array<{
    slug: string;
    title: string;
    wordCount: number;
    tags: string[];
    updatedAt: string;
  }>;

  const totalNotes = notesList.length;
  const totalWords = notesList.reduce((acc, n) => acc + (n.wordCount || 0), 0);
  const streakDays = writingStats?.currentStreak || 1;

  // XP calculation
  let baseTaskXp = completedTasks * 150;
  let baseNoteXp = totalNotes * 50;
  let wordXp = Math.floor(totalWords / 10);
  let streakXp = streakDays * 100;

  const nightOwlActive = isNightOwlHours();
  let totalXp = baseTaskXp + baseNoteXp + wordXp + streakXp;

  if (nightOwlActive) {
    totalXp = Math.floor(totalXp * 1.25); // +25% Night Owl Focus Buff
  }

  const levelInfo = getLevelFromTotalXp(totalXp);
  const title = getLevelTitle(levelInfo.level, nightOwlActive);
  const prestigeRank = getPrestigeRank(levelInfo.level);

  return {
    level: levelInfo.level,
    maxLevel: 1000,
    title,
    prestigeRank,
    totalXp,
    currentLevelXp: levelInfo.currentLevelXp,
    nextLevelXp: levelInfo.nextLevelXp,
    levelProgressPct: levelInfo.progressPct,
    nightOwlActive,
    streakDays,
  };
}
