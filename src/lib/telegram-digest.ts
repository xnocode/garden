import { listNotes } from "@/lib/notes";
import { getTasksFromGitHub } from "@/lib/telegram-file-handler";
import { geminiUrl } from "@/lib/ai-models";

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();

function formatTWDueDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const m = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function getMorningDigest(): Promise<string> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // 1. Get tasks
  const snapshot = await getTasksFromGitHub().catch(() => null);
  const tasks = snapshot?.tasks || [];
  const overdueTasks = tasks.filter((t) => t.overdue);
  const todayTasks = tasks.filter((t) => !t.overdue && formatTWDueDate(t.due) === today);
  const allPending = tasks.filter((t) => !t.overdue);

  // 2. Get recent notes (last 7 days)
  const notes = await listNotes().catch(() => []);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentNotes = notes
    .filter((n) => {
      if (!n.publishDate) return false;
      return new Date(n.publishDate).getTime() > sevenDaysAgo;
    })
    .slice(0, 8);

  // 3. Build context for AI suggestion
  const taskContext = tasks.slice(0, 10).map((t) => t.description).join(", ") || "no pending tasks";
  const noteContext = recentNotes.slice(0, 5).map((n) => n.title).join(", ") || "no recent notes";

  let aiSuggestion = "Keep up the great work! Stay focused and make progress today. 🚀";

  if (GEMINI_API_KEY) {
    try {
      const prompt = `You are a productivity coach. Given this student's current tasks and recent study notes, write ONE short, specific, encouraging focus suggestion for today (max 2 sentences). Be concrete and actionable.

Pending tasks: ${taskContext}
Recent notes written: ${noteContext}
Today's date: ${today}

Output ONLY the 1-2 sentence suggestion, nothing else.`;

      const res = await fetch(
        geminiUrl(GEMINI_API_KEY),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 120 },
          }),
        }
      );
      const data = await res.json();
      const suggestion = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (suggestion) aiSuggestion = suggestion;
    } catch {
      // fallback to default suggestion
    }
  }

  // 4. Format digest message
  const lines: string[] = [];

  lines.push(`☀️ <b>Morning Digest — ${today}</b>\n`);

  // Overdue tasks
  if (overdueTasks.length > 0) {
    lines.push(`⚠️ <b>Overdue (${overdueTasks.length}):</b>`);
    overdueTasks.forEach((t) => {
      lines.push(`• ${t.description}${t.priority ? ` [${t.priority}]` : ""}`);
    });
    lines.push("");
  }

  // Today's tasks
  if (todayTasks.length > 0) {
    lines.push(`📌 <b>Due Today (${todayTasks.length}):</b>`);
    todayTasks.forEach((t) => {
      lines.push(`• ${t.description}${t.priority ? ` [${t.priority}]` : ""}`);
    });
    lines.push("");
  } else if (overdueTasks.length === 0) {
    lines.push(`📌 <b>Tasks:</b> ${allPending.length > 0 ? `${allPending.length} pending (none due today)` : "No pending tasks 🎉"}\n`);
  }

  // Recent notes
  if (recentNotes.length > 0) {
    lines.push(`📝 <b>Notes this week (${recentNotes.length}):</b>`);
    recentNotes.slice(0, 6).forEach((n) => {
      lines.push(`• ${n.title}`);
    });
    lines.push("");
  } else {
    lines.push(`📝 <b>Notes this week:</b> None yet — time to write!\n`);
  }

  // AI suggestion
  lines.push(`💡 <b>AI Focus Tip:</b>\n<i>${aiSuggestion}</i>`);

  return lines.join("\n");
}
