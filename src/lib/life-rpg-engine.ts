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
// 40 prefixes — weakest → godlike (rank within current class)
const TITLE_PREFIXES = [
  // L1-5 within class: raw beginnings
  "Wandering", "Restless", "Scrappy", "Hungry", "Rising",
  // L6-10: finding footing
  "Forged", "Tempered", "Driven", "Burning", "Iron",
  // L11-15: sharpening edge
  "Gale", "Storm", "Crimson", "Thunder", "Phantom",
  // L16-20: power emerging
  "Silver", "Shadow", "Frost", "Blazing", "Wraith",
  // L21-25: mid power
  "Viper", "Titan", "Astral", "Void", "Obsidian",
  // L26-30: high tier
  "Aether", "Quantum", "Eclipse", "Infernal", "Mythic",
  // L31-35: elite
  "Divine", "Eternal", "Celestial", "Abyssal", "Cosmic",
  // L36-40: godlike (class complete)
  "Transcendent", "Infinite", "Primordial", "Omega", "Sovereign",
] as const; // 40 entries

// 25 domains — class ascension every 40 levels
// (no word overlaps with prefix list to prevent "X X" titles)
const TITLE_DOMAINS = [
  "Drifter",    // L1–40   class 1: beginner adventurers
  "Scout",      // L41–80  class 2: field operatives
  "Operative",  // L81–120 class 3: trained agents
  "Ranger",     // L121–160
  "Sentinel",   // L161–200
  "Warden",     // L201–240
  "Blade",      // L241–280 class 7: combat specialists
  "Vanguard",   // L281–320
  "Raider",     // L321–360
  "Berserker",  // L361–400
  "Sage",       // L401–440 class 11: arcane path
  "Oracle",     // L441–480
  "Specter",    // L481–520
  "Reaper",     // L521–560
  "Cipher",     // L561–600
  "Architect",  // L601–640 class 16: builder path
  "Warlock",    // L641–680
  "Crusader",   // L681–720
  "Paladin",    // L721–760
  "Overlord",   // L761–800
  "Archon",     // L801–840 class 21: god path
  "Paragon",    // L841–880
  "Nexus",      // L881–920
  "Primarch",   // L921–960
  "Godslayer",  // L961–1000 ← ultimate class
] as const; // 25 entries — 40 × 25 = 1,000 unique titles

/**
 * Returns a guaranteed-unique title for every level 1–1000.
 *
 * System: every 40 levels = class ascension (domain upgrades).
 * Within each class, prefix advances from "Wandering" → "Sovereign" (40 ranks).
 * Zero word repeats between prefix and domain lists.
 *
 * Sample progression:
 *   L1  → Wandering Drifter     (raw start)
 *   L13 → Crimson Drifter       ← you are here
 *   L14 → Thunder Drifter
 *   L40 → Sovereign Drifter     (class complete)
 *   L41 → Wandering Scout       ← class promotion!
 *   L80 → Sovereign Scout
 *   L81 → Wandering Operative   ← class promotion!
 *   L100 → 🔥 special override
 *   L961 → Wandering Godslayer  (final class)
 *   L1000 → 👑 special override
 */
export function getLevelTitle(level: number, _isNightOwl: boolean = false): string {
  if (level <= 0) level = 1;
  if (level > 1000) level = 1000;

  // Legendary milestone overrides
  if (level === 1000) return "👑 Omega Godslayer Supreme";
  if (level === 750)  return "💠 Primordial Primarch";
  if (level === 500)  return "⚡ Infinite Archon";
  if (level === 250)  return "🌟 Cosmic Paladin";
  if (level === 100)  return "🔥 Mythic Overlord";
  if (level === 50)   return "⚔️ Obsidian Berserker";

  const idx  = level - 1;
  const pIdx = idx % TITLE_PREFIXES.length;
  const dIdx = Math.floor(idx / TITLE_PREFIXES.length) % TITLE_DOMAINS.length;

  return `${TITLE_PREFIXES[pIdx]} ${TITLE_DOMAINS[dIdx]}`;
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
// XP & Level Formula (Balanced Quadratic Curve up to Level 1000)
// Required XP to *reach* Level N = 70 * N²
//
// XP gap per level grows linearly (~140 XP more per level):
//   L1→2  :    280 XP
//   L5→6  :    770 XP
//   L10→11:  1,470 XP
//   L13→14:  1,890 XP
//   L25→26:  3,570 XP
//   L50→51:  7,070 XP
//   L100→101: 14,070 XP
// Progressive but always achievable — never feels impossible.
// ----------------------------------------------------------------------------
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 70 * level * level;
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
  const streakDays = writingStats?.currentStreak ?? 0;

  // XP calculation
  let baseTaskXp = completedTasks * 150;
  let baseNoteXp = totalNotes * 50;
  let wordXp = Math.floor(totalWords / 10);
  let streakXp = streakDays * 100;

  const nightOwlActive = isNightOwlHours();
  const rawSubtotal = baseTaskXp + baseNoteXp + wordXp + streakXp;
  const nightOwlBonus = nightOwlActive ? Math.floor(rawSubtotal * 0.25) : 0;
  const totalXp = rawSubtotal + nightOwlBonus;

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
