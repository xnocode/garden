import { db } from "@/lib/db";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";

const FALLBACK_SETTINGS_PATH = resolve(process.cwd(), "src/data/settings.json");

async function readFallbackSettings(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(FALLBACK_SETTINGS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeFallbackSettings(settings: Record<string, string>): Promise<void> {
  try {
    await fs.writeFile(FALLBACK_SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
  } catch {
    // Ignore write failure if environment is read-only
  }
}

export async function getSetting(key: string, defaultValue: string = ""): Promise<string> {
  try {
    if ((db as any).setting) {
      const record = await (db as any).setting.findUnique({
        where: { key },
      });
      if (record && typeof record.value === "string") {
        return record.value;
      }
    }
  } catch {
    // Fall back to local file
  }

  const fileSettings = await readFallbackSettings();
  return fileSettings[key] ?? defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const fileSettings = await readFallbackSettings();
  fileSettings[key] = value;
  await writeFallbackSettings(fileSettings);

  try {
    if ((db as any).setting) {
      await (db as any).setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
  } catch {
    // Silently continue if DB is not available
  }
}

export async function isTaskwarriorPublic(): Promise<boolean> {
  const val = await getSetting("taskwarrior_public_tasks", "false");
  return val === "true";
}

export async function setTaskwarriorPublic(isPublic: boolean): Promise<void> {
  await setSetting("taskwarrior_public_tasks", isPublic ? "true" : "false");
}
