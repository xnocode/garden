/**
 * telegram-task-coach.ts — AI Daily Task Planner & Neural Study Guide
 * Helps the user pick realistic daily tasks and applies active recall & practice techniques.
 */

import { getTasksFromGitHub } from "./telegram-file-handler";
import { listNotes } from "@/lib/notes";
import { geminiUrl } from "./ai-models";

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

/**
 * Generates an intelligent next-day task plan with an actionable Neural Study Method
 * for the primary task.
 */
export async function getAiNextDayGuidance(customQuery?: string): Promise<{ text: string; primaryTaskId?: number }> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const tasksSnapshot = await getTasksFromGitHub().catch(() => null);
  const tasks = tasksSnapshot?.tasks || [];

  if (tasks.length === 0) {
    return {
      text:
        `🎉 <b>No pending tasks found in Taskwarrior!</b>\n\n` +
        `You have a clean slate! Add new tasks with:\n` +
        `<code>/task Title of task due:tomorrow priority:H</code>\n` +
        `or scan a notebook page with <code>/scantask</code>.`,
    };
  }

  // Fetch recent notes from the garden for study context
  const notes = await listNotes().catch(() => []);
  const recentNotes = notes.slice(0, 6).map((n) => n.title).join(", ") || "None";

  // Build task list summary
  const taskList = tasks
    .map((t, idx) => {
      const dueStr = t.due ? `due: ${formatTWDueDate(t.due)}` : "no date";
      const prioStr = t.priority ? `[Priority ${t.priority}]` : "";
      const overdueStr = t.overdue ? "[OVERDUE]" : "";
      return `#${idx + 1}: "${t.description}" (project: ${t.project || "general"}, ${dueStr}, ${prioStr} ${overdueStr})`;
    })
    .join("\n");

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();

  const systemPrompt = `You are a world-class cognitive science study coach and daily task strategist for Ridoy's digital garden ("xnocode").

Your core philosophy:
1. THE 1+2 RULE: Never assign more than 3 tasks for a day. Pick 1 Primary Focus (The Big Win) + 2 Quick Wins (15-30m each).
2. NEURAL STUDY PROTOCOL for the Primary Task:
   - Step 1: 15-Min Focused Input (What specific sub-concept to learn).
   - Step 2: 5-Min Active Recall (Closed-screen memory test question).
   - Step 3: 20-Min Output/Build (Concrete code, script, or Obsidian note to produce).
3. ZERO-GUILT DEFERRAL: Explicitly mention which tasks to safely ignore/postpone for tomorrow.
4. Output in clean Telegram HTML formatting: <b>bold</b>, <code>code</code>, <i>italic</i>. Use emojis. Avoid markdown asterisks (no **).`;

  const userPrompt = `Current Date: ${today}
User's Active Tasks (${tasks.length} total):
${taskList}

Recent Garden Notes:
${recentNotes}

${customQuery ? `User's Special Request/Constraint: "${customQuery}"` : "Please create tomorrow's recommended plan and study guide."}

Generate tomorrow's plan following this structure:
🎯 <b>AI Next-Day Plan &amp; Study Guide</b>

🌟 <b>1. PRIMARY FOCUS (The Big Win):</b>
• [Task # and Description] <i>(Est. ~45m)</i>

🧠 <b>How to Study &amp; Finish This (AI Neural Method):</b>
• <b>📖 Input (15m):</b> [Specific concept to read/watch]
• <b>⚡ Active Recall (5m):</b> [Closed-book memory recall question]
• <b>🛠️ Output/Build (20m):</b> [What to build/code or write in notes]

⚡ <b>2. QUICK WINS (Manageable, Low Friction):</b>
• [Task # and Description] <i>(15-20m)</i>
• [Task # and Description] <i>(15-20m)</i>

🧘 <b>Safe to Postpone for Tomorrow:</b>
<i>[1-2 sentences on why the remaining tasks can wait without guilt]</i>`;

  // 1. Try Gemini
  if (geminiKey) {
    try {
      const res = await fetch(geminiUrl(geminiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { text: text.trim() };
      }
    } catch (err: any) {
      console.warn("Gemini task coach failed:", err.message);
    }
  }

  // 2. Try Groq Llama Fallback
  if (groqKey) {
    try {
      const gRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const content = gData?.choices?.[0]?.message?.content;
        if (content) return { text: content.trim() };
      }
    } catch (err: any) {
      console.warn("Groq task coach failed:", err.message);
    }
  }

  // 3. Deterministic Fallback if AI offline
  const topTask = tasks[0];
  const secTask1 = tasks[1];
  const secTask2 = tasks[2];

  return {
    text:
      `🎯 <b>AI Next-Day Plan — ${today}</b>\n\n` +
      `🌟 <b>1. PRIMARY FOCUS (The Big Win):</b>\n` +
      `• <b>#1 ${topTask.description}</b> ${topTask.priority ? `[Priority ${topTask.priority}]` : ""}\n\n` +
      `🧠 <b>How to Study &amp; Finish This (AI Neural Method):</b>\n` +
      `• <b>📖 Input (15m):</b> Read the single core subtopic with focus.\n` +
      `• <b>⚡ Active Recall (5m):</b> Close the screen and explain the concept on paper from memory.\n` +
      `• <b>🛠️ Output/Build (20m):</b> Write a working code snippet or a concise Obsidian note.\n\n` +
      `⚡ <b>2. QUICK WINS:</b>\n` +
      (secTask1 ? `• #${2} ${secTask1.description}\n` : "") +
      (secTask2 ? `• #${3} ${secTask2.description}\n` : "") +
      `\n🧘 <b>Safe to Postpone:</b> Remaining tasks can rest in your backlog without guilt!`,
  };
}

/**
 * Generates an on-demand 3-step Neural Study Blueprint for any given topic or task.
 */
export async function getTaskStudyBlueprint(topicOrTask: string): Promise<string> {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();

  const systemPrompt = `You are a cognitive learning coach. Given a study topic or task, break it down into the 3-step AI Neural Learning Protocol (Total 40 minutes):
1. 📖 Step 1: Input & Concept Focus (15 mins) — exactly what sub-concept to absorb.
2. ⚡ Step 2: Active Recall Test (5 mins) — exact closed-screen recall questions to test memory.
3. 🛠️ Step 3: 30/70 Practice & Build (20 mins) — exact concrete mini-project, code snippet, or note to create.
4. 🧠 Long-Term Memory Anchor — 1 practical analogy or memory hook.

Format in clean Telegram HTML (<b>bold</b>, <code>code</code>, <i>italic</i>). Do NOT use markdown asterisks (**).`;

  const userPrompt = `Topic/Task to study: "${topicOrTask}"`;

  if (geminiKey) {
    try {
      const res = await fetch(geminiUrl(geminiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (err: any) {
      console.warn("Gemini study blueprint failed:", err.message);
    }
  }

  if (groqKey) {
    try {
      const gRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const content = gData?.choices?.[0]?.message?.content;
        if (content) return content.trim();
      }
    } catch (err: any) {
      console.warn("Groq study blueprint failed:", err.message);
    }
  }

  return (
    `🧠 <b>AI Neural Study Blueprint: ${topicOrTask}</b>\n\n` +
    `📖 <b>1. Focused Input (15 mins):</b>\n` +
    `Read or watch only the single immediate sub-concept. Do not multitask.\n\n` +
    `⚡ <b>2. Active Recall (5 mins):</b>\n` +
    `Close everything. Write down how it works in your own words on a blank sheet of paper.\n\n` +
    `🛠️ <b>3. Output / Practice (20 mins):</b>\n` +
    `Write 2 working code examples or an Obsidian note with <code>[[wikilinks]]</code>.\n\n` +
    `💡 <i>"Mastery comes from retrieval practice, not passive review."</i>`
  );
}
