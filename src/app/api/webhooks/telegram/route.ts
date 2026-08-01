import { NextResponse, after } from "next/server";
import {
  saveTelegramNote,
  deleteTelegramNote,
  getPaginatedNotes,
  searchTelegramNotes,
  getGardenStats,
  getGardenTags,
  getNotesByTag,
  getNoteBySlugOrName,
  checkDuplicateNote,
  escapeHtml,
  addPendingTasksToGitHub,
  getTasksFromGitHub,
  addPendingDoneToGitHub,
  addChangelogEntryToGitHub,
} from "@/lib/telegram-file-handler";
import { processVoiceNoteToMarkdown } from "@/lib/telegram-voice";
import { askGardenKnowledgeBase } from "@/lib/telegram-ask";
import { processBrainDumpToNote } from "@/lib/telegram-dump";
import { processPdfToNote } from "@/lib/telegram-pdf";
import { getMorningDigest } from "@/lib/telegram-digest";

export const dynamic = "force-dynamic";

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "🌐 Visit Website" }, { text: "📚 List Notes" }],
    [{ text: "📝 New Note" }, { text: "📌 Add Tasks" }],
    [{ text: "📋 My Tasks" }, { text: "📊 Garden Stats" }],
    [{ text: "🏷️ Explore Tags" }, { text: "🔍 Search Notes" }],
    [{ text: "💡 Help & Commands" }],
  ],
  resize_keyboard: true,
  persistent: true,
};

const recentMediaGroups = new Set<string>();
// Session state: tracks whether the next voice from a chat should be a note or task
const pendingVoiceMode = new Map<number | string, "note" | "task">();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tgFetch(url: string, options: any = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000); // 10s timeout
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function sendMsg(
  token: string, chatId: number | string, text: string, markup?: any
): Promise<number | null> {
  try {
    const body: any = {
      chat_id: chatId,
      parse_mode: "HTML",
      text,
      disable_web_page_preview: true,
      reply_markup: markup || MAIN_KEYBOARD,
    };
    const res = await tgFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data?.result?.message_id || null;
  } catch {
    return null;
  }
}


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

async function extractTasksFromTextAI(transcribedText: string): Promise<string[]> {
  const groqKey = (process.env.GROQ_API_KEY || "").trim();
  const gemKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const prompt = `You are an expert task extraction AI for Taskwarrior.
Analyze this spoken voice transcript (today's local date is ${todayStr}) and extract ALL individual tasks mentioned (up to 50+).

Rules for EACH task:
1. Output ONE task per line in this exact format: <task description> due:YYYY-MM-DD priority:H/M/L
2. Calculate the exact due date (due:YYYY-MM-DD) for relative time words:
   - "today" -> due:${todayStr}
   - "tomorrow" -> calculate tomorrow's exact date based on ${todayStr}
   - "this Friday", "next Monday", "in 3 days" -> calculate exact date YYYY-MM-DD
   - If no date/time word mentioned for a task, omit due:.
3. Analyze urgency and tone to assign priority:
   - priority:H for urgent/critical/due today or tomorrow tasks ("must do first", "urgent", "due today/tomorrow", "high priority", "asap")
   - priority:M for normal tasks ("need to do", "should complete", "regular task")
   - priority:L for low priority tasks ("whenever", "someday", "later", "low priority")
4. Do NOT output markdown bullets, numbers, titles, or extra text. Output ONLY one task line per item.

Transcript: "${transcribedText}"`;

  // 1. Try Groq Llama-3.3-70b (ultra fast ~300ms, high rate limit)
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim() || "";
        const lines = text.split("\n").map((l: string) => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean);
        if (lines.length > 0) return lines;
      }
    } catch (err) {
      console.warn("Groq task extraction failed:", err);
    }
  }

  // 2. Try Gemini 2.0 Flash as backup
  if (gemKey) {
    try {
      const gemRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
          }),
        }
      );
      if (gemRes.ok) {
        const gemData = await gemRes.json();
        const parsed = gemData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (parsed) {
          const lines = parsed.split("\n").map((l: string) => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean);
          if (lines.length > 0) return lines;
        }
      }
    } catch (err) {
      console.warn("Gemini task extraction failed:", err);
    }
  }

  return [];
}

function registerCommands(token: string) {
  const commands = [
    { command: "ask", description: "🧠 Ask AI about your notes & tasks" },
    { command: "digest", description: "☀️ Morning digest: tasks + notes + AI tip" },
    { command: "voice", description: "🎙️ Send voice → AI creates a published note" },
    { command: "vtask", description: "🎙️ Send voice → AI adds to Taskwarrior tasks" },
    { command: "dump", description: "💬 Organize raw messy text to AI note" },
    { command: "append", description: "📝 Append text to an existing note" },
    { command: "note", description: "✏️ Create a text note directly" },
    { command: "task", description: "📌 Add task(s) to Taskwarrior" },
    { command: "mytasks", description: "📋 View your pending task list" },
    { command: "done", description: "✅ Mark a task as done by number" },
    { command: "list", description: "📚 List published notes" },
    { command: "search", description: "🔍 Search notes" },
    { command: "stats", description: "📊 Garden statistics" },
    { command: "tags", description: "🏷️ Explore tags" },
    { command: "delete", description: "🗑️ Delete a note" },
    { command: "cancel", description: "🛑 Cancel operation" },
    { command: "help", description: "💡 Full help guide" },
  ];

  tgFetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands }),
  }).catch(() => {});

  tgFetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands, scope: { type: "all_private_chats" } }),
  }).catch(() => {});
}

export async function POST(req: Request) {
  try {
    const update = await req.json();
    const cbq = update?.callback_query;
    const message = update?.message || update?.edited_message || cbq?.message;
    if (!message) return NextResponse.json({ ok: true });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const rawIds = process.env.TELEGRAM_CHAT_ID || "";
    const authIds = rawIds.replace(/['"]/g, "").split(",").map((s: string) => s.trim()).filter(Boolean);
    if (!token || authIds.length === 0) return NextResponse.json({ ok: true });

    // Register commands in Telegram menu asynchronously
    registerCommands(token);

    const senderId = (cbq?.from?.id?.toString() || message.from?.id?.toString() || message.sender_chat?.id?.toString() || "").trim();
    const chatId = message.chat?.id ? message.chat.id.toString() : "";
    const rawText = (message.text?.trim() || cbq?.data || "").trim();
    const text = rawText.replace(/@\w+_bot/gi, "").trim();

    // Auth check — allows senderId or chatId matching
    const isAuth = (senderId && authIds.includes(senderId)) || (chatId && authIds.includes(chatId));
    if (!isAuth) {
      if (chatId) await sendMsg(token, chatId, `⛔ <b>Access Denied</b>\n<i>ID: <code>${senderId || chatId}</code></i>`);
      return NextResponse.json({ ok: true });
    }

    if (cbq?.id) {
      tgFetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cbq.id }),
      }).catch(() => {});
    }

    // 🛑 Cancel / Stop
    if (text.startsWith("/cancel") || text.startsWith("/stop") || rawText.includes("Cancel") || rawText.includes("Reset") || rawText.includes("🛑")) {
      await sendMsg(token, chatId, `🛑 <b>Operation Stopped &amp; Reset</b>\n\nAll progress cancelled. Ready for next command!`);
      return NextResponse.json({ ok: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📄 FILE UPLOAD — Upload new or Update existing .md note
    // ═══════════════════════════════════════════════════════════════════
    if (message.document) {
      const doc = message.document;
      const fileName = doc.file_name || "untitled";
      const lowerName = fileName.toLowerCase();
      const caption = (message.caption || "").trim().toLowerCase();

      // ═══════════════════════════════════════════════════════════════════
      // 📄 PDF TO NOTE — Send any PDF → AI structures it into a Markdown note
      // ═══════════════════════════════════════════════════════════════════
      if (lowerName.endsWith(".pdf")) {
        await sendMsg(token, chatId, `📄 <b>Processing PDF with AI...</b>\n<i>Extracting text & structuring into note...</i>`);
        after(async () => {
          try {
            const fileRes = await tgFetch(`https://api.telegram.org/bot${token}/getFile?file_id=${doc.file_id}`);
            const fileData = await fileRes.json();
            if (!fileData.ok || !fileData.result?.file_path) {
              await sendMsg(token, chatId, `❌ <b>Failed to fetch PDF from Telegram.</b>`);
              return;
            }
            const pdfRes = await tgFetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`);
            const arrayBuf = await pdfRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            const pdfNote = await processPdfToNote(buffer, fileName);
            const noteFileName = `${pdfNote.slug}.md`;
            const result = await saveTelegramNote(noteFileName, pdfNote.markdownContent, false);
            const rawLiveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(pdfNote.slug)}`;
            const safeLiveUrl = escapeHtml(rawLiveUrl);
            if (result.githubStatus?.includes("Committed to GitHub")) {
              const tagStr = pdfNote.tags.map((t) => `#${escapeHtml(t)}`).join(" ");
              await sendMsg(
                token, chatId,
                `📄 <b>PDF Note Created & Published!</b>\n\n` +
                `📝 <b>${escapeHtml(pdfNote.title)}</b>\n` +
                `🏷️ ${tagStr || "#pdf"}\n` +
                `📄 <code>${escapeHtml(noteFileName)}</code>\n` +
                `🔗 <a href="${safeLiveUrl}">${safeLiveUrl}</a>`,
                { inline_keyboard: [[{ text: "🌐 View Note", url: rawLiveUrl }]] }
              );
            } else {
              await sendMsg(token, chatId, `❌ <b>Failed to publish PDF note:</b> ${escapeHtml(result.githubStatus || "")}`);
            }
          } catch (err: any) {
            await sendMsg(token, chatId, `❌ <b>PDF Error:</b> ${escapeHtml(err.message)}`);
          }
        });
        return NextResponse.json({ ok: true, pdf: true });
      }



      if (!lowerName.endsWith(".md") && !lowerName.endsWith(".markdown")) {
        await sendMsg(token, chatId, `⚠️ Only <code>.md</code> or <code>.pdf</code> files accepted.\n<i>"${escapeHtml(fileName)}"</i> rejected.`);
        return NextResponse.json({ ok: true });
      }

      const dup = await checkDuplicateNote(fileName);
      const isUpdate = Boolean(dup);
      const safe = escapeHtml(fileName);

      after(async () => {
        try {
          // 1. Get file from Telegram
          const fileRes = await tgFetch(`https://api.telegram.org/bot${token}/getFile?file_id=${doc.file_id}`);
          const fileData = await fileRes.json();

          if (!fileData.ok || !fileData.result?.file_path) {
            await sendMsg(token, chatId,
              `❌ <b>Failed</b>\n\n📄 <code>${safe}</code>\n\n<i>Could not get file from Telegram.</i>`
            );
            return;
          }

          // 2. Download content
          const contentRes = await tgFetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`);
          const fileContent = await contentRes.text();

          // Group logic to prevent multiple deployments
          let skipCi = false;
          if (message.media_group_id) {
            if (recentMediaGroups.has(message.media_group_id)) {
              skipCi = true; // Not the first file in the group, skip deployment
            } else {
              recentMediaGroups.add(message.media_group_id);
              // Clean up memory after 1 minute
              setTimeout(() => recentMediaGroups.delete(message.media_group_id), 60000);
            }
          }

          // 3. Save + commit to GitHub (overwrites existing file if update)
          const result = await saveTelegramNote(fileName, fileContent, skipCi);
          const slug = result.fileName.replace(/\.md$/, "").replace(/\.markdown$/, "");
          const rawLiveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(slug)}`;
          const safeLiveUrl = escapeHtml(rawLiveUrl);
          const pushed = result.githubStatus?.includes("Committed to GitHub") || false;

          // 4. Send direct result confirmation message
          if (pushed) {
            const statusMsg = isUpdate ? `📝 <b>Updated Note!</b>` : `✅ <b>Published Note!</b>`;
            await sendMsg(token, chatId,
              `${statusMsg}\n\n📄 <code>${safe}</code>\n🔗 <a href="${safeLiveUrl}">${safeLiveUrl}</a>`,
              { inline_keyboard: [[{ text: "🌐 View Note", url: rawLiveUrl }]] }
            );
          } else {
            await sendMsg(token, chatId, `❌ <b>Failed!</b> ${escapeHtml(result.githubStatus || "")}`);
          }
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>Failed:</b> ${escapeHtml(err.message)}`);
        }
      });

      return NextResponse.json({ ok: true, file: fileName });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎥 /voice — Set pending mode to 'note', prompt user to send voice
    // ═══════════════════════════════════════════════════════════════════
    // 🎥 /voice — Set pending mode to 'note', prompt user to send voice
    // ═══════════════════════════════════════════════════════════════════
    if (text.startsWith("/voice")) {
      pendingVoiceMode.set(chatId, "note");
      await sendMsg(token, chatId,
        `🎙️ <b>Ready! Send your voice message now.</b>\n\n` +
        `<i>AI will transcribe it and create a published note automatically.</i>`,
        { force_reply: true, selective: true }
      );
      return NextResponse.json({ ok: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎙️ /vtask — Set pending mode to 'task', prompt user to send voice
    // ═══════════════════════════════════════════════════════════════════
    if (text.startsWith("/vtask")) {
      pendingVoiceMode.set(chatId, "task");
      await sendMsg(token, chatId,
        `🎙️ <b>Voice Task Mode — Ready!</b>\n\n` +
        `Now send a voice message describing your task(s).\n` +
        `<i>Gemini will transcribe it and add them to Taskwarrior automatically.</i>\n\n` +
        `<b>Example:</b> <i>"Submit DSA assignment due tomorrow, high priority"</i>`,
        { force_reply: true, selective: true }
      );
      return NextResponse.json({ ok: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎙️ VOICE — Route based on /vtask prompt reply, pending mode, or caption
    // Default (no prior command/reply): creates a note (backward compatible)
    // ═══════════════════════════════════════════════════════════════════
    if (message.voice || message.audio) {
      const replyText = (message.reply_to_message?.text || "").toLowerCase();
      const isTaskReply = replyText.includes("voice task mode") || replyText.includes("taskwarrior");
      const voiceCaption = (message.caption || "").trim().toLowerCase();
      const isVoiceTask = pendingVoiceMode.get(chatId) === "task" || isTaskReply || voiceCaption.includes("/task") || voiceCaption.includes("/vtask");
      pendingVoiceMode.delete(chatId);

      const voiceObj = message.voice || message.audio;
      const fileId = voiceObj.file_id;
      const mimeType = voiceObj.mime_type || "audio/ogg";

      if (isVoiceTask) {
        // 📌 VOICE → TASK: transcribe then extract structured Taskwarrior tasks
        await sendMsg(token, chatId, `🎙️ <b>Transcribing voice for task creation...</b>`);
        after(async () => {
          try {
            const fileRes = await tgFetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
            const fileData = await fileRes.json();
            if (!fileData.ok || !fileData.result?.file_path) {
              await sendMsg(token, chatId, `❌ <b>Failed to fetch voice from Telegram.</b>`);
              return;
            }
            const audioRes = await tgFetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`);
            const arrayBuf = await audioRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            // Step 1: Transcribe voice (Groq Whisper / Gemini)
            const voiceNote = await processVoiceNoteToMarkdown(buffer, mimeType);
            const transcribedText = (voiceNote.title + ". " + voiceNote.markdownContent)
              .replace(/---[\s\S]*?---/, "").replace(/[#*`]/g, "").trim();

            // Step 2: Extract individual tasks with dates & priorities via Groq Llama-3.3 / Gemini
            let taskLines = await extractTasksFromTextAI(transcribedText);
            if (taskLines.length === 0) {
              taskLines = [transcribedText.slice(0, 200)];
            }
            const res = await addPendingTasksToGitHub(taskLines);
            if (res.success) {
              const taskList = taskLines.map((t, i) => `${i + 1}. <code>${escapeHtml(t)}</code>`).join("\n");
              await sendMsg(token, chatId,
                `📌 <b>Voice Task(s) Queued (${res.count})!</b>\n\n${taskList}\n\n<i>Next <code>bun run deploy</code> imports into Taskwarrior!</i>`
              );
            } else {
              await sendMsg(token, chatId, `❌ <b>Task Queue Failed:</b> ${escapeHtml(res.message)}`);
            }
          } catch (err: any) {
            await sendMsg(token, chatId, `❌ <b>Voice Task Error:</b> ${escapeHtml(err.message)}`);
          }
        });
        return NextResponse.json({ ok: true, voiceTask: true });
      }

      // 📝 VOICE → NOTE (default or after /voice command)
      await sendMsg(token, chatId, `🎙️ <b>Transcribing voice note with AI...</b>\n<i>Please wait a few seconds...</i>`);

      after(async () => {
        try {
          const fileRes = await tgFetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
          const fileData = await fileRes.json();

          if (!fileData.ok || !fileData.result?.file_path) {
            await sendMsg(token, chatId, `❌ <b>Failed to fetch voice recording from Telegram.</b>`);
            return;
          }

          const audioRes = await tgFetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`);
          const arrayBuf = await audioRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);

          const voiceNote = await processVoiceNoteToMarkdown(buffer, mimeType);
          const fileName = `${voiceNote.slug}.md`;

          const result = await saveTelegramNote(fileName, voiceNote.markdownContent, false);
          const rawLiveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(voiceNote.slug)}`;
          const safeLiveUrl = escapeHtml(rawLiveUrl);

          if (result.githubStatus?.includes("Committed to GitHub")) {
            const tagStr = voiceNote.tags.map((t) => `#${escapeHtml(t)}`).join(" ");
            await sendMsg(
              token,
              chatId,
              `🎙️ <b>Voice Note Created &amp; Published!</b>\n\n` +
              `📝 <b>${escapeHtml(voiceNote.title)}</b>\n` +
              `🏷️ ${tagStr || "#voice-note"}\n` +
              `📄 <code>${escapeHtml(fileName)}</code>\n` +
              `🔗 <a href="${safeLiveUrl}">${safeLiveUrl}</a>`,
              { inline_keyboard: [[{ text: "🌐 View Note", url: rawLiveUrl }]] }
            );
          } else {
            await sendMsg(token, chatId, `❌ <b>Failed to publish voice note:</b> ${escapeHtml(result.githubStatus || "")}`);
          }
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>Voice Note Error:</b> ${escapeHtml(err.message)}`);
        }
      });

      return NextResponse.json({ ok: true, voice: true });
    }



    // ═══════════════════════════════════════════════════════════════════
    // 💬 RAW BRAIN DUMP — Organize Messy Text to Structured Note
    // ═══════════════════════════════════════════════════════════════════
    if (text.startsWith("/dump")) {
      const dumpText = text.replace(/^\/dump\s*/i, "").trim();
      if (!dumpText) {
        await sendMsg(token, chatId, `💬 <b>Usage:</b> <code>/dump Messy thoughts go here...</code>`);
        return NextResponse.json({ ok: true });
      }

      await sendMsg(token, chatId, `💬 <b>Organizing brain dump with AI...</b>`);

      after(async () => {
        try {
          const dumpNote = await processBrainDumpToNote(dumpText);
          const fileName = `${dumpNote.slug}.md`;

          const result = await saveTelegramNote(fileName, dumpNote.markdownContent, false);
          const rawLiveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(dumpNote.slug)}`;
          const safeLiveUrl = escapeHtml(rawLiveUrl);

          if (result.githubStatus?.includes("Committed to GitHub")) {
            const tagStr = dumpNote.tags.map((t) => `#${escapeHtml(t)}`).join(" ");
            await sendMsg(
              token,
              chatId,
              `💬 <b>Brain Dump Note Created &amp; Published!</b>\n\n` +
              `📝 <b>${escapeHtml(dumpNote.title)}</b>\n` +
              `🏷️ ${tagStr || "#idea"}\n` +
              `📄 <code>${escapeHtml(fileName)}</code>\n` +
              `🔗 <a href="${safeLiveUrl}">${safeLiveUrl}</a>`,
              { inline_keyboard: [[{ text: "🌐 View Note", url: rawLiveUrl }]] }
            );
          } else {
            await sendMsg(token, chatId, `❌ <b>Failed:</b> ${escapeHtml(result.githubStatus || "")}`);
          }
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>Dump Error:</b> ${escapeHtml(err.message)}`);
        }
      });

      return NextResponse.json({ ok: true, dump: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ☀️ /digest — Morning task & notes digest with AI focus suggestion
    // ═══════════════════════════════════════════════════════════════════
    if (text.startsWith("/digest")) {
      await sendMsg(token, chatId, `☀️ <b>Generating your morning digest...</b>`);
      after(async () => {
        try {
          const digest = await getMorningDigest();
          await sendMsg(token, chatId, digest);
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>Digest Error:</b> ${escapeHtml(err.message)}`);
        }
      });
      return NextResponse.json({ ok: true, digest: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📝 /append — Append text to an existing published note
    // ═══════════════════════════════════════════════════════════════════
    if (text.startsWith("/append")) {
      const payload = text.replace(/^\/append\s*/i, "").trim();
      if (!payload) {
        await sendMsg(token, chatId,
          `📝 <b>Usage:</b> <code>/append note-slug New text to add at the bottom</code>\n\n` +
          `Example:\n<code>/append python-variables - Tuples are immutable unlike lists</code>\n\n` +
          `<i>Use /search to find the slug of the note you want to append to.</i>`
        );
        return NextResponse.json({ ok: true });
      }

      // Split: first word is the slug, rest is the text to append
      const [rawSlug, ...textParts] = payload.split(" ");
      const appendText = textParts.join(" ").trim();
      if (!rawSlug || !appendText) {
        await sendMsg(token, chatId, `⚠️ Usage: <code>/append note-slug Text to append</code>`);
        return NextResponse.json({ ok: true });
      }

      const slug = rawSlug.replace(/\.md$/, "");
      after(async () => {
        try {
          const { getNoteBySlugOrName, commitNoteToGitHub, escapeHtml: esc, validateSecureUrl: valUrl } = await import("@/lib/telegram-file-handler");
          const note = await getNoteBySlugOrName(slug);
          if (!note) {
            await sendMsg(token, chatId, `❌ Note <code>${escapeHtml(slug)}</code> not found. Use /search to find the correct slug.`);
            return;
          }

          // Fetch current content from GitHub
          const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "xnocode/garden";
          const ghToken = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
          const filePath = `content/${slug}.md`;
          const targetUrl = new URL(`https://api.github.com/repos/${repo}/contents/${filePath}`);
          if (targetUrl.hostname !== "api.github.com" || targetUrl.protocol !== "https:") return;
          const apiUrl = targetUrl.href;
          const authHeader = ghToken.startsWith("github_pat_") || ghToken.startsWith("ghp_") ? `Bearer ${ghToken}` : `token ${ghToken}`;

          const ghRes = await fetch(apiUrl, { headers: { Authorization: authHeader, Accept: "application/vnd.github.v3+json" } });
          if (!ghRes.ok) {
            await sendMsg(token, chatId, `❌ Could not fetch note from GitHub (${ghRes.status}).`);
            return;
          }
          const ghData = await ghRes.json();
          const existingContent = Buffer.from(ghData.content.replace(/\n/g, ""), "base64").toString("utf-8");
          const today = new Date().toISOString().split("T")[0];
          const newContent = existingContent.trimEnd() + `\n\n<!-- appended ${today} -->\n${appendText}\n`;

          const result = await commitNoteToGitHub(`${slug}.md`, newContent, false);
          if (result.success) {
            await sendMsg(token, chatId,
              `📝 <b>Appended to ${escapeHtml(note.title)}!</b>\n\n` +
              `<i>"${escapeHtml(appendText.slice(0, 120))}"</i>\n\n` +
              `🔗 <a href="${escapeHtml(note.url)}">${escapeHtml(note.url)}</a>`,
              { inline_keyboard: [[{ text: "🌐 View Note", url: note.url }]] }
            );
          } else {
            await sendMsg(token, chatId, `❌ Failed to append: ${escapeHtml(result.message)}`);
          }
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>Append Error:</b> ${escapeHtml(err.message)}`);
        }
      });
      return NextResponse.json({ ok: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🧠 ASK YOUR GARDEN — Query Personal Notes & Tasks via AI
    // ═══════════════════════════════════════════════════════════════════
    if (text.startsWith("/ask")) {
      const question = text.replace(/^\/ask\s*/i, "").trim();
      if (!question) {
        await sendMsg(token, chatId, `🧠 <b>Usage:</b> <code>/ask What notes do I have about Python?</code>`);
        return NextResponse.json({ ok: true });
      }

      await sendMsg(token, chatId, `🧠 <b>Searching your garden &amp; thinking...</b>`);

      after(async () => {
        try {
          const answer = await askGardenKnowledgeBase(question);
          await sendMsg(token, chatId, `🧠 <b>Garden AI Answer:</b>\n\n${answer}`);
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>Ask Error:</b> ${escapeHtml(err.message)}`);
        }
      });

      return NextResponse.json({ ok: true, ask: true });
    }

    // ═══════════════════════════════════════
    // 💬 COMMANDS & BUTTONS
    // ═══════════════════════════════════════

    if (rawText.includes("Visit Website") || rawText.includes("🌐")) {
      await sendMsg(token, chatId,
        `🌐 <a href="https://gardenx.qzz.io">https://gardenx.qzz.io</a>`,
        { inline_keyboard: [[{ text: "🌐 Open Website", url: "https://gardenx.qzz.io" }]] }
      );
      return NextResponse.json({ ok: true });
    }



    if (text.startsWith("/release")) {
      const rawPayload = text.replace(/^\/release/, "").trim();
      if (!rawPayload) {
        await sendMsg(
          token,
          chatId,
          `⚠️ <b>Usage:</b>\n<code>/release Title | Change 1 | Change 2</code>\n\n<b>Example:</b>\n<code>/release v0.4.0 \| Added Dark Theme Customizer \| Custom color picker for notes</code>`
        );
        return NextResponse.json({ ok: true });
      }

      const parts = rawPayload.split("|").map((s) => s.trim()).filter(Boolean);
      let version = "";
      let title = "";
      let changes: string[] = [];

      if (parts[0]?.startsWith("v") && parts[0]?.includes(".")) {
        version = parts[0];
        title = parts[1] || "Website Feature Update";
        changes = parts.slice(2);
      } else {
        title = parts[0];
        changes = parts.slice(1);
      }

      if (changes.length === 0) {
        changes = [title];
      }

      const res = await addChangelogEntryToGitHub({
        version,
        title,
        changes,
      });

      if (res.success) {
        await sendMsg(
          token,
          chatId,
          `🚀 <b>Release Published!</b>\n\n📌 <b>Title:</b> ${escapeHtml(title)}\n📝 <b>Changes:</b> ${changes.length}\n\n<i>${escapeHtml(res.message)}</i>`
        );
      } else {
        await sendMsg(token, chatId, `❌ <b>Failed to publish release:</b> ${escapeHtml(res.message)}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/stats") || rawText.includes("Garden Stats")) {
      const { totalNotes, totalWords, topTags } = await getGardenStats();
      const tags = topTags.slice(0, 8).map((t) => `• #${escapeHtml(t.tag)} (${t.count})`).join("\n");
      await sendMsg(token, chatId,
        `📊 <b>Garden Stats</b>\n\n🌱 ${totalNotes} notes\n📝 ${totalWords.toLocaleString()} words\n\n🏷️ <b>Tags:</b>\n${tags || "None"}`
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/tag ") || text.startsWith("/tag_")) {
      const tag = text.replace(/^\/tag[_ ]/, "").trim();
      if (!tag) { await sendMsg(token, chatId, "⚠️ <code>/tag python</code>"); return NextResponse.json({ ok: true }); }
      const notes = await getNotesByTag(tag);
      if (!notes.length) { await sendMsg(token, chatId, `🏷️ No notes under #${escapeHtml(tag)}`); }
      else {
        const list = notes.map((n, i) => `${i + 1}. <b>${escapeHtml(n.title)}</b> (<code>${escapeHtml(n.filename)}</code>)`).join("\n");
        await sendMsg(token, chatId, `🏷️ <b>#${escapeHtml(tag)} (${notes.length}):</b>\n\n${list}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/tags") || rawText.includes("Explore Tags")) {
      const tags = await getGardenTags();
      if (!tags.length) { await sendMsg(token, chatId, "🏷️ No tags."); }
      else {
        const list = tags.map((t) => `• <b>#${escapeHtml(t.tag)}</b> (${t.count})`).join("\n");
        await sendMsg(token, chatId, `🏷️ <b>Tags (${tags.length}):</b>\n\n${list}`);
      }
      return NextResponse.json({ ok: true });
    }

    // ─── /mytasks — Show pending task list ───────────────────────────────────
    if (text.startsWith("/mytasks") || text.startsWith("/tasklist") || text === "/tasks" || rawText.includes("My Tasks") || rawText.includes("📋")) {
      const snapshot = await getTasksFromGitHub();
      if (!snapshot || snapshot.tasks.length === 0) {
        await sendMsg(
          token, chatId,
          `📋 <b>No visible tasks</b> (nothing due today/tomorrow).\n\n` +
          `<i>Use <code>/task Buy milk due:today</code> to add tasks, then run <code>bun run deploy</code> to sync.</i>`
        );
      } else {
        const ago = Math.round((Date.now() - new Date(snapshot.exportedAt).getTime()) / 60000);
        const agoStr = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
        // Display 1-based position — /done maps position → UUID internally
        const lines = snapshot.tasks.map((t, i) => {
          const pri = t.priority ? ` [<b>${t.priority}</b>]` : "";
          const flag = t.overdue ? " ⚠️" : "";
          const formattedDue = formatTWDueDate(t.due);
          const due = formattedDue ? `\n   📅 <i>${formattedDue}</i>` : "";
          return `<b>${i + 1}.</b> ${escapeHtml(t.description)}${pri}${flag}${due}`;
        });
        const taskButtons = snapshot.tasks.map((t, i) => [
          { text: `✅ ${i + 1}. ${t.description.slice(0, 30)}`, callback_data: `done_${i + 1}` }
        ]);
        await sendMsg(
          token, chatId,
          `📋 <b>Tasks (${snapshot.tasks.length} visible, synced ${agoStr}):</b>\n\n` +
          lines.join("\n\n") +
          `\n\n<i>Tap a task below to mark as completed, or type <code>/done 1</code>:</i>`,
          { inline_keyboard: taskButtons }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/task") || text.startsWith("/tasks") || rawText.includes("Add Tasks")) {
      const payload = text.replace(/^\/(tasks?|Add Tasks)/i, "").trim();
      if (!payload || rawText.includes("Add Tasks")) {
        await sendMsg(
          token,
          chatId,
          `📌 <b>Taskwarrior Usage:</b>\n\n` +
          `• Single: <code>/task Buy milk due:today priority:H</code>\n\n` +
          `• Multiple:\n` +
          `<code>/tasks\n` +
          `- Buy groceries due:today\n` +
          `- Study C++ project:self-learning\n` +
          `- Submit report due:tomorrow</code>`
        );
        return NextResponse.json({ ok: true });
      }

      const lines = payload
        .split("\n")
        .map((l) => l.replace(/^[-*•\d\.\s]+/, "").trim())
        .filter(Boolean);

      if (!lines.length) {
        await sendMsg(token, chatId, "⚠️ No valid task descriptions found.");
        return NextResponse.json({ ok: true });
      }

      after(async () => {
        try {
          const res = await addPendingTasksToGitHub(lines);
          if (res.success) {
            const taskList = lines.map((t, i) => `${i + 1}. <code>${escapeHtml(t)}</code>`).join("\n");
            await sendMsg(
              token,
              chatId,
              `📌 <b>Queued ${res.count} Task(s) for WSL Taskwarrior!</b>\n\n${taskList}\n\n<i>Next <code>bun run deploy</code> on laptop will import these into your WSL Taskwarrior & update website live!</i>`
            );
          } else {
            await sendMsg(token, chatId, `❌ <b>Task Queue Failed:</b> ${escapeHtml(res.message)}`);
          }
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>Error:</b> ${escapeHtml(err.message)}`);
        }
      });

      return NextResponse.json({ ok: true });
    }

    // ─── /done — Mark a task as done by position number or interactive selection ─
    if (text.startsWith("/done") || text.startsWith("done_")) {
      const rawNum = text.startsWith("done_") ? text.replace("done_", "") : text.replace("/done", "").trim();
      const pos = parseInt(rawNum, 10);

      const snapshot = await getTasksFromGitHub();
      if (!snapshot || snapshot.tasks.length === 0) {
        await sendMsg(
          token, chatId,
          `📋 <b>No pending tasks to complete!</b>`
        );
        return NextResponse.json({ ok: true });
      }

      if (isNaN(pos) || pos < 1) {
        const taskButtons = snapshot.tasks.map((t, i) => [
          { text: `✅ ${i + 1}. ${t.description.slice(0, 30)}`, callback_data: `done_${i + 1}` }
        ]);
        await sendMsg(
          token, chatId,
          `📋 <b>Select a task to mark as completed:</b>`,
          { inline_keyboard: taskButtons }
        );
        return NextResponse.json({ ok: true });
      }

      const task = snapshot.tasks[pos - 1];
      if (!task) {
        const total = snapshot.tasks.length;
        await sendMsg(
          token, chatId,
          `❌ Task #${pos} not found in last snapshot (${total} visible task${total !== 1 ? "s" : ""}).\n\n` +
          `<i>Run <code>/mytasks</code> to see current IDs, or <code>bun run deploy</code> to refresh.</i>`
        );
        return NextResponse.json({ ok: true });
      }

      await sendMsg(token, chatId, `⏳ Queuing <b>${escapeHtml(task.description)}</b> as done…`);

      after(async () => {
        try {
          const res = await addPendingDoneToGitHub([task.uuid]);
          if (res.success) {
            await sendMsg(
              token, chatId,
              `✅ <b>"${escapeHtml(task.description)}" queued as done!</b>\n\n` +
              `<i>Next <code>bun run deploy</code> will mark it complete in WSL Taskwarrior &amp; update the website.</i>`
            );
          } else {
            await sendMsg(token, chatId, `❌ <b>Failed:</b> ${escapeHtml(res.message)}`);
          }
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>Error:</b> ${escapeHtml(err.message)}`);
        }
      });

      return NextResponse.json({ ok: true });
    }

    // ✍️ Direct Text Note Creation: /note or /write
    if (text.startsWith("/note") || text.startsWith("/write") || rawText.includes("New Note")) {
      const payload = text.replace(/^\/(note|write)/i, "").trim();
      if (!payload || rawText.includes("New Note")) {
        await sendMsg(
          token,
          chatId,
          `📝 <b>Create Note Usage:</b>\n\n` +
          `Send <code>/note Title Of Note</code> followed by content on new lines:\n\n` +
          `<code>/note Building a Second Brain\n` +
          `Here is the body text of your note...\n` +
          `#productivity #learning</code>`
        );
        return NextResponse.json({ ok: true });
      }

      const lines = payload.split("\n");
      const title = lines[0].replace(/^#+\s*/, "").replace(/^title:\s*/i, "").trim();
      const bodyLines = lines.slice(1);
      const bodyText = bodyLines.join("\n").trim();
      const today = new Date().toISOString().split("T")[0];

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "untitled-note";
      const fileName = `${slug}.md`;

      let fullContent = "";
      if (bodyText.startsWith("---")) {
        fullContent = bodyText;
      } else {
        fullContent = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndraft: false\nauthor: Ridoy\ndate: ${today}\ntags:\n  - telegram\n---\n\n${bodyText}\n`;
      }

      after(async () => {
        try {
          const result = await saveTelegramNote(fileName, fullContent, false);
          const rawLiveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(slug)}`;
          const safeLiveUrl = escapeHtml(rawLiveUrl);
          if (result.githubStatus?.includes("Committed to GitHub")) {
            await sendMsg(
              token,
              chatId,
              `✅ <b>Note Created &amp; Published!</b>\n\n` +
              `📄 <code>${escapeHtml(fileName)}</code>\n` +
              `🔗 <a href="${safeLiveUrl}">${safeLiveUrl}</a>`,
              { inline_keyboard: [[{ text: "🌐 View Note", url: rawLiveUrl }]] }
            );
          } else {
            await sendMsg(token, chatId, `❌ <b>Failed to publish note:</b> ${escapeHtml(result.githubStatus || "")}`);
          }
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>Failed:</b> ${escapeHtml(err.message)}`);
        }
      });

      return NextResponse.json({ ok: true });
    }

    // (PDF handling is done in the document handler above)

    if (rawText.includes("Search Notes")) {
      await sendMsg(token, chatId, `🔍 Send <code>/search keyword</code>`);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/search")) {
      const q = text.replace("/search", "").trim();
      if (!q) { await sendMsg(token, chatId, "⚠️ <code>/search keyword</code>"); return NextResponse.json({ ok: true }); }
      const results = await searchTelegramNotes(q, 15);
      if (!results.length) { await sendMsg(token, chatId, `🔍 No results for "${escapeHtml(q)}".`); }
      else {
        const list = results.map((r, i) => `${i + 1}. <b>${r.title}</b> (<code>${r.fileName}</code>)`).join("\n");
        await sendMsg(token, chatId, `🔍 <b>"${escapeHtml(q)}" (${results.length}):</b>\n\n${list}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/delete")) {
      const target = text.replace("/delete", "").trim();
      if (!target) { await sendMsg(token, chatId, "⚠️ Usage: <code>/delete filename.md</code>"); return NextResponse.json({ ok: true }); }
      const safe = escapeHtml(target);

      after(async () => {
        try {
          const r = await deleteTelegramNote(target);

          if (r.success) {
            await sendMsg(token, chatId, `🗑️ <b>Deleted!</b>`);
          } else {
            await sendMsg(token, chatId, `❌ <b>Failed!</b>`);
          }
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>Failed!</b>`);
        }
      });

      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/list") || rawText.includes("List Notes") || rawText.includes("List All Notes")) {
      const pg = parseInt(text.replace("/list", "").trim(), 10) || 1;
      const { notes, total, totalPages, page } = await getPaginatedNotes(pg, 25);
      const taskSnapshot = await getTasksFromGitHub();
      const tasks = taskSnapshot?.tasks || [];

      let taskSection = "";
      let inlineKeyboard: any[] = [];

      if (tasks.length > 0) {
        const taskLines = tasks.map((t, i) => {
          const pri = t.priority ? ` [<b>${t.priority}</b>]` : "";
          const flag = t.overdue ? " ⚠️" : "";
          const formattedDue = formatTWDueDate(t.due);
          const due = formattedDue ? ` (📅 <i>${formattedDue}</i>)` : "";
          return `${i + 1}. <code>${escapeHtml(t.description)}</code>${pri}${flag}${due}`;
        }).join("\n");
        taskSection = `📌 <b>Pending Tasks (${tasks.length}):</b>\n${taskLines}\n\n`;

        inlineKeyboard = tasks.map((t, i) => [
          { text: `✅ Complete ${i + 1}: ${t.description.slice(0, 28)}`, callback_data: `done_${i + 1}` }
        ]);
      }

      if (!total && !tasks.length) {
        await sendMsg(token, chatId, "📂 No notes or tasks found.");
      } else {
        const noteList = notes.map((n, i) => `${(page - 1) * 25 + i + 1}. <b>${escapeHtml(n.title)}</b> (<code>${escapeHtml(n.filename)}</code>)`).join("\n");
        const nav = totalPages > 1 ? `\n\n📖 Note Page ${page}/${totalPages}. <code>/list ${page < totalPages ? page + 1 : 1}</code>` : "";

        await sendMsg(
          token, chatId,
          `${taskSection}📚 <b>Published Notes (${total}):</b>\n\n${noteList}${nav}`,
          inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/start") || text.startsWith("/help") || rawText.includes("Help")) {
      await sendMsg(token, chatId,
        `💡 <b>Garden Bot — Complete AI &amp; Command Guide</b>\n\n` +
        `🧠 <b>1. Ask Your Garden AI:</b>\n` +
        `• <code>/ask What notes do I have about Python?</code>\n\n` +
        `🎙️ <b>2. Voice Capturing:</b>\n` +
        `• <code>/voice</code> → then send voice → AI creates a <b>published note</b>\n` +
        `• <code>/vtask</code> → then send voice → AI creates a <b>Taskwarrior task</b>\n` +
        `• Or just send a voice directly — defaults to creating a note.\n\n` +
        `💬 <b>3. Raw Brain Dump:</b>\n` +
        `• <code>/dump Messy thoughts &amp; notes go here...</code>\n\n` +
        `📌 <b>4. Taskwarrior Tasks:</b>\n` +
        `• Add: <code>/task Buy milk due:today priority:H</code>\n` +
        `• Multi: <code>/tasks\n- Task 1 due:today\n- Task 2 due:tomorrow</code>\n` +
        `• View: <code>/mytasks</code> — See pending task list with IDs\n` +
        `• Done: <code>/done 2</code> — Mark task #2 as complete\n\n` +
        `📚 <b>5. Manage Notes:</b>\n` +
        `• <code>/note Title\nBody... #tag</code> — Write text note directly\n` +
        `• <code>.md File Upload</code> — Publish or update existing note\n` +
        `• <code>.pdf File Upload</code> — AI converts PDF to note\n` +
        `• <code>/list</code>, <code>/search</code>, <code>/stats</code>, <code>/tags</code>, <code>/delete</code>`
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
