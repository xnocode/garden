/**
 * telegram-task-coach.ts — Strategic AI Roadmap & Next Action Mentor
 * Sequences learning paths, identifies missing milestones, and provides execution blueprints.
 */

import { getTasksFromGitHub, addPendingTasksToGitHub } from "./telegram-file-handler";
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
 * Converts Markdown formatting to valid Telegram HTML.
 */
export function sanitizeTelegramHtml(text: string): string {
  if (!text) return "";

  let cleaned = text
    // Normalize headers
    .replace(/^###?\s+(.+)$/gm, "<b>$1</b>")
    .replace(/^##\s+(.+)$/gm, "<b>$1</b>")
    .replace(/^#\s+(.+)$/gm, "<b>$1</b>")
    // Convert bold markdown **text** or __text__ to <b>text</b>
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/__(.*?)__/g, "<b>$1</b>")
    // Convert italic markdown *text* or _text_ (excluding inside words)
    .replace(/(^|\s)\*(.*?)\*(\s|$)/g, "$1<i>$2</i>$3")
    .replace(/(^|\s)_(.*?)_(\s|$)/g, "$1<i>$2</i>$3")
    // Convert inline code `code` to <code>code</code>
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  return cleaned.trim();
}

export interface StrategicRoadmapResult {
  text: string;
  suggestedTasks: string[];
}

/**
 * Analyzes active tasks, digital garden context, and learning curriculum to determine:
 * 1. Immediate Next Step (in logical order)
 * 2. Step-by-step How-To execution blueprint (code/exercise/note)
 * 3. Missing Milestone Tasks that should be added to the roadmap
 */
export async function getAiNextStrategicRoadmap(customQuery?: string): Promise<StrategicRoadmapResult> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const tasksSnapshot = await getTasksFromGitHub().catch(() => null);
  const tasks = tasksSnapshot?.tasks || [];

  // Fetch recent notes from the garden for study context
  const notes = await listNotes().catch(() => []);
  const recentNotes = notes.slice(0, 8).map((n) => n.title).join(", ") || "None";

  // Build task list summary
  const taskList = tasks.length > 0
    ? tasks.map((t, idx) => {
        const dueStr = t.due ? `due: ${formatTWDueDate(t.due)}` : "no date";
        const prioStr = t.priority ? `[Priority ${t.priority}]` : "";
        return `Task #${idx + 1}: "${t.description}" (Project: ${t.project || "general"}, ${dueStr}, ${prioStr})`;
      }).join("\n")
    : "No active tasks in Taskwarrior yet.";

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();

  const systemPrompt = `You are a world-class strategic engineering mentor and computer science learning advisor for Ridoy's digital garden ("xnocode").

Your Mission:
Analyze the student's current active tasks, study tracks (e.g. C++ track, University Math / Fourier Analysis, Algorithms), and garden notes to create a clear, sequenced ROADMAP & IMMEDIATE NEXT ACTION PLAN.

You must solve 3 problems for the student:
1. WHAT TO DO NEXT: Sequence their chaotic/scattered task list into logical order (e.g. Intro -> Install -> Variables -> Control Flow -> Practice). Pick the EXACT next task they should do right now.
2. HOW TO DO IT: Provide a concrete, step-by-step execution blueprint (Concepts to understand, the exact 15-20 line code exercise to write and compile, and the Obsidian note to write).
3. MISSING TASKS TO ADD: Identify what critical learning milestones they FORGOT to add to their task list (e.g. Functions, Memory/Pointers, Arrays, Mini Projects) and format them with [SUGGESTED_TASK: <task description>].

Formatting Rules:
- Output clean Telegram HTML: <b>bold</b>, <code>code</code>, <i>italic</i>. Use clean emojis.
- Do NOT use markdown asterisks (no **).
- For each suggested missing task, put a line at the very end like:
  [SUGGESTED_TASK: CPP - Functions & Scope priority:H project:cpp]
  [SUGGESTED_TASK: CPP - Mini Project: Number Guessing Game priority:M project:cpp]`;

  const userPrompt = `Current Date: ${today}
Student's Current Active Tasks:
${taskList}

Recent Published Garden Notes:
${recentNotes}

${customQuery ? `Student's Specific Focus or Question: "${customQuery}"` : "Analyze my study tracks and tell me: What should I do next in order, how to do it step-by-step, and what missing tasks should I add to my roadmap?"}

Format the response like this:
🗺️ <b>Strategic Roadmap &amp; Next Action Plan</b>

🧭 <b>1. Current Learning Track &amp; Stage:</b>
[1-2 sentences on what track they are on, e.g. C++ Programming Track: Stage 1 Foundations]

🌟 <b>2. EXACT NEXT TASK TO DO NOW:</b>
• <b>[Task Name &amp; Number]</b> <i>(Estimated Time: ~45 mins)</i>
💡 <i>Why this first: [Brief reason why this comes before others]</i>

🛠️ <b>3. Step-by-Step Execution Blueprint:</b>
• <b>📖 Concept (15m):</b> [The specific core concept to understand]
• <b>💻 Code Exercise (20m):</b> [The exact working code or problem to practice in compiler]
• <b>📝 Garden Note (10m):</b> [What note title and 2 key takeaways to write in Obsidian]

⚡ <b>4. The Sequenced Path (What comes after):</b>
1. [Next sequential task]
2. [Following sequential task]

💡 <b>5. Missing Tasks You Need to Add (Gaps in Roadmap):</b>
• <b>[Suggested Task 1]</b> — [Why it's essential]
• <b>[Suggested Task 2]</b> — [Why it's essential]

[SUGGESTED_TASK: <Task 1 with priority and project>]
[SUGGESTED_TASK: <Task 2 with priority and project>]`;

  let responseText = "";

  // 1. Try Gemini
  if (geminiKey) {
    try {
      const res = await fetch(geminiUrl(geminiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1400 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) responseText = rawText;
      }
    } catch (err: any) {
      console.warn("Gemini strategic roadmap failed:", err.message);
    }
  }

  // 2. Try Groq Llama Fallback
  if (!responseText && groqKey) {
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
          temperature: 0.6,
          max_tokens: 1400,
        }),
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const content = gData?.choices?.[0]?.message?.content;
        if (content) responseText = content;
      }
    } catch (err: any) {
      console.warn("Groq strategic roadmap failed:", err.message);
    }
  }

  // Parse suggested tasks from [SUGGESTED_TASK: ...] tags
  const suggestedTasks: string[] = [];
  if (responseText) {
    const matches = responseText.matchAll(/\[SUGGESTED_TASK:\s*(.+?)\]/g);
    for (const match of matches) {
      if (match[1]) {
        suggestedTasks.push(match[1].trim());
      }
    }
    // Remove the raw metadata tags from user-facing text
    responseText = responseText.replace(/\[SUGGESTED_TASK:\s*.+?\]/g, "").trim();
    return {
      text: sanitizeTelegramHtml(responseText),
      suggestedTasks,
    };
  }

  // 3. Fallback Roadmap
  return {
    text:
      `🗺️ <b>Strategic Roadmap &amp; Next Action Plan</b>\n\n` +
      `🧭 <b>1. Current Learning Track:</b> C++ Foundations\n\n` +
      `🌟 <b>2. EXACT NEXT TASK TO DO NOW:</b>\n` +
      `• <b>CPP - Variables &amp; Data Types</b> <i>(Est. ~45 mins)</i>\n` +
      `💡 <i>Why this first: Sets up fundamental memory understanding before writing logic.</i>\n\n` +
      `🛠️ <b>3. Step-by-Step Execution Blueprint:</b>\n` +
      `• <b>📖 Concept (15m):</b> Primitive types (int, double, char, bool) and memory size.\n` +
      `• <b>💻 Code Exercise (20m):</b> Write a small C++ program calculating user input values.\n` +
      `• <b>📝 Garden Note (10m):</b> Document <code>Variables &amp; Memory Allocation in C++</code> in Obsidian.\n\n` +
      `⚡ <b>4. Sequenced Next Steps:</b>\n` +
      `1. CPP - Operators &amp; Expressions\n` +
      `2. CPP - Conditional Statements (if/else, switch)\n` +
      `3. CPP - Loops (for, while)\n\n` +
      `💡 <b>5. Missing Tasks You Need to Add:</b>\n` +
      `• <b>CPP - Functions &amp; Pass-by-Reference</b>\n` +
      `• <b>CPP - Arrays &amp; Vectors Practice</b>`,
    suggestedTasks: [
      "CPP - Functions & Scope priority:H project:cpp",
      "CPP - Arrays & Vectors priority:H project:cpp",
    ],
  };
}

/**
 * Generates an on-demand 3-step Neural Study Blueprint for any given topic or task.
 */
export async function getTaskStudyBlueprint(topicOrTask: string): Promise<string> {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();

  const systemPrompt = `You are an elite cognitive learning coach. Given a study topic or task, break it down into an executive 3-step AI Neural Learning Protocol (Total 40 minutes):
1. 📖 Step 1: Input & Concept Focus (15 mins) — exactly what specific sub-concept to absorb without distractions.
2. ⚡ Step 2: Active Recall Test (5 mins) — exact closed-screen recall questions to test memory from scratch.
3. 🛠️ Step 3: 30/70 Practice & Build (20 mins) — exact concrete mini-project, code snippet, or Obsidian note to produce.
4. 🧠 Long-Term Memory Anchor — 1 practical analogy or memory hook.

Format in clean Telegram HTML (<b>bold</b>, <code>code</code>, <i>italic</i>). Do NOT use markdown asterisks.`;

  const userPrompt = `Topic or Task to study: "${topicOrTask}"`;

  if (geminiKey) {
    try {
      const res = await fetch(geminiUrl(geminiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 900 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) return sanitizeTelegramHtml(rawText);
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
          temperature: 0.6,
          max_tokens: 900,
        }),
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const content = gData?.choices?.[0]?.message?.content;
        if (content) return sanitizeTelegramHtml(content);
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

/**
 * Backward compatibility helper for daily plan
 */
export async function getAiNextDayGuidance(customQuery?: string): Promise<{ text: string }> {
  const result = await getAiNextStrategicRoadmap(customQuery);
  return { text: result.text };
}
