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
} from "@/lib/telegram-file-handler";
import { processVoiceNoteToMarkdown } from "@/lib/telegram-voice";
import { processYouTubeToNote } from "@/lib/telegram-youtube";
import { processWebClipToNote } from "@/lib/telegram-clipper";
import { processImageToNote } from "@/lib/telegram-vision";
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

function registerCommands(token: string) {
  tgFetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "ask", description: "🧠 Ask AI about your notes & tasks" },
        { command: "digest", description: "☀️ Morning digest: tasks + notes + AI tip" },
        { command: "voice", description: "🎙️ Send voice → AI creates a published note" },
        { command: "vtask", description: "🎙️ Send voice → AI adds to Taskwarrior tasks" },
        { command: "youtube", description: "🎥 Convert YouTube video to AI note" },
        { command: "clip", description: "🔖 Clip web article link to AI note" },
        { command: "dump", description: "💬 Organize raw messy text to AI note" },
        { command: "append", description: "📝 Append text to an existing note" },
        { command: "note", description: "✏️ Create a text note directly" },
        { command: "ocr", description: "📚 Send image file as note via AI OCR" },
        { command: "task", description: "📌 Add task(s) to Taskwarrior" },
        { command: "mytasks", description: "📋 View your pending task list" },
        { command: "done", description: "✅ Mark a task as done by number" },
        { command: "list", description: "📚 List published notes" },
        { command: "search", description: "🔍 Search notes" },
        { command: "link", description: "🔗 Get website URL for note" },
        { command: "stats", description: "📊 Garden statistics" },
        { command: "tags", description: "🏷️ Explore tags" },
        { command: "delete", description: "🗑️ Delete a note" },
        { command: "cancel", description: "🛑 Cancel operation" },
        { command: "help", description: "💡 Full help guide" },
      ],
    }),
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

      // ═══════════════════════════════════════════════════════════════════
      // 📚 /ocr — Send image document file → AI extracts text as note
      // ═══════════════════════════════════════════════════════════════════
      const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".gif", ".bmp"];
      const isImageDoc = imageExts.some((ext) => lowerName.endsWith(ext));
      if (isImageDoc || caption.startsWith("/ocr") || text.startsWith("/ocr")) {
        await sendMsg(token, chatId, `📚 <b>Running AI OCR on image file...</b>\n<i>Extracting & structuring text...</i>`);
        after(async () => {
          try {
            const fileRes = await tgFetch(`https://api.telegram.org/bot${token}/getFile?file_id=${doc.file_id}`);
            const fileData = await fileRes.json();
            if (!fileData.ok || !fileData.result?.file_path) {
              await sendMsg(token, chatId, `❌ <b>Failed to fetch image from Telegram.</b>`);
              return;
            }
            const imgRes = await tgFetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`);
            const arrayBuf = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            const mime = doc.mime_type || "image/jpeg";
            const imgNote = await processImageToNote(buffer, mime);
            const noteFileName = `${imgNote.slug}.md`;
            const result = await saveTelegramNote(noteFileName, imgNote.markdownContent, false);
            const rawLiveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(imgNote.slug)}`;
            const safeLiveUrl = escapeHtml(rawLiveUrl);
            if (result.githubStatus?.includes("Committed to GitHub")) {
              const tagStr = imgNote.tags.map((t) => `#${escapeHtml(t)}`).join(" ");
              await sendMsg(
                token, chatId,
                `📚 <b>OCR Note Created & Published!</b>\n\n` +
                `📝 <b>${escapeHtml(imgNote.title)}</b>\n` +
                `🏷️ ${tagStr || "#ocr"}\n` +
                `📄 <code>${escapeHtml(noteFileName)}</code>\n` +
                `🔗 <a href="${safeLiveUrl}">${safeLiveUrl}</a>`,
                { inline_keyboard: [[{ text: "🌐 View Note", url: rawLiveUrl }]] }
              );
            } else {
              await sendMsg(token, chatId, `❌ <b>Failed to publish OCR note:</b> ${escapeHtml(result.githubStatus || "")}`);
            }
          } catch (err: any) {
            await sendMsg(token, chatId, `❌ <b>OCR Error:</b> ${escapeHtml(err.message)}`);
          }
        });
        return NextResponse.json({ ok: true, ocr: true });
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
    if (text.startsWith("/voice")) {
      pendingVoiceMode.set(chatId, "note");
      await sendMsg(token, chatId,
        `🎙️ <b>Ready! Send your voice message now.</b>\n\n` +
        `<i>AI will transcribe it and create a published note automatically.</i>`
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
        `<b>Example:</b> <i>"Submit DSA assignment due tomorrow, high priority"</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎙️ VOICE — Route based on pending mode set by /voice or /vtask
    // Default (no prior command): creates a note (backward compatible)
    // ═══════════════════════════════════════════════════════════════════
    if (message.voice || message.audio) {
      const voiceMode = pendingVoiceMode.get(chatId) || "note";
      pendingVoiceMode.delete(chatId); // consume the mode — one-shot
      const voiceObj = message.voice || message.audio;
      const fileId = voiceObj.file_id;
      const mimeType = voiceObj.mime_type || "audio/ogg";


      if (voiceMode === "task") {
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
            // Step 1: Transcribe voice
            const voiceNote = await processVoiceNoteToMarkdown(buffer, mimeType);
            const transcribedText = (voiceNote.title + ". " + voiceNote.markdownContent)
              .replace(/---[\s\S]*?---/, "").replace(/[#*`]/g, "").trim().slice(0, 500);
            // Step 2: Use Gemini to extract structured task lines
            const gemKey = (process.env.GEMINI_API_KEY || "").trim();
            let taskLines: string[] = [transcribedText.slice(0, 200)];
            if (gemKey) {
              try {
                const gemRes = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemKey}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: `Extract individual Taskwarrior tasks from this voice transcript. Output ONE task per line. Include due:YYYY-MM-DD and priority:H/M/L only if clearly mentioned. Transcript: "${transcribedText}"` }] }],
                      generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
                    }),
                  }
                );
                const gemData = await gemRes.json();
                const parsed = gemData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                if (parsed) taskLines = parsed.split("\n").map((l: string) => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean);
              } catch { /* fallback: use raw transcription as single task */ }
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
    // ═══════════════════════════════════════════════════════════════════
    // 🎙️ /vtask — Set pending mode to 'task', then await next voice msg
    // ═══════════════════════════════════════════════════════════════════
    if (text.startsWith("/vtask")) {
      pendingVoiceMode.set(chatId, "task");
      await sendMsg(token, chatId,
        `🎙️ <b>Voice Task Mode — Ready!</b>\n\n` +
        `Now send a voice message describing your task(s).\n` +
        `<i>Gemini will transcribe it and add them to Taskwarrior automatically.</i>\n\n` +
        `<b>Example:</b> <i>"Submit DSA assignment due tomorrow, high priority"</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📸 PHOTO / IMAGE OCR — Transcribe Whiteboards/Notes to AI Markdown
    // ═══════════════════════════════════════════════════════════════════
    if (message.photo && message.photo.length > 0) {
      const photoObj = message.photo[message.photo.length - 1];
      const fileId = photoObj.file_id;

      await sendMsg(token, chatId, `📸 <b>Processing photo with AI Vision...</b>\n<i>Transcribing text &amp; layout...</i>`);

      after(async () => {
        try {
          const fileRes = await tgFetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
          const fileData = await fileRes.json();

          if (!fileData.ok || !fileData.result?.file_path) {
            await sendMsg(token, chatId, `❌ <b>Failed to fetch photo from Telegram.</b>`);
            return;
          }

          const imgRes = await tgFetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`);
          const arrayBuf = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);

          const imgNote = await processImageToNote(buffer, "image/jpeg");
          const fileName = `${imgNote.slug}.md`;

          const result = await saveTelegramNote(fileName, imgNote.markdownContent, false);
          const rawLiveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(imgNote.slug)}`;
          const safeLiveUrl = escapeHtml(rawLiveUrl);

          if (result.githubStatus?.includes("Committed to GitHub")) {
            const tagStr = imgNote.tags.map((t) => `#${escapeHtml(t)}`).join(" ");
            await sendMsg(
              token,
              chatId,
              `📸 <b>Photo OCR Note Created &amp; Published!</b>\n\n` +
              `📝 <b>${escapeHtml(imgNote.title)}</b>\n` +
              `🏷️ ${tagStr || "#ocr"}\n` +
              `📄 <code>${escapeHtml(fileName)}</code>\n` +
              `🔗 <a href="${safeLiveUrl}">${safeLiveUrl}</a>`,
              { inline_keyboard: [[{ text: "🌐 View Note", url: rawLiveUrl }]] }
            );
          } else {
            await sendMsg(token, chatId, `❌ <b>Failed to publish photo note:</b> ${escapeHtml(result.githubStatus || "")}`);
          }
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>Photo Vision Error:</b> ${escapeHtml(err.message)}`);
        }
      });

      return NextResponse.json({ ok: true, photo: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎥 YOUTUBE VIDEO — Convert Transcript to AI Summary Note
    // ═══════════════════════════════════════════════════════════════════
    if (text.startsWith("/youtube") || text.includes("youtube.com/") || text.includes("youtu.be/")) {
      let ytUrl = text.replace(/^\/youtube\s*/i, "").trim();
      if (!ytUrl && (text.includes("youtube.com") || text.includes("youtu.be"))) {
        const urlMatch = text.match(/https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/\S+/i);
        if (urlMatch) ytUrl = urlMatch[0];
      }

      if (!ytUrl) {
        await sendMsg(token, chatId, `🎥 <b>Usage:</b> <code>/youtube https://youtu.be/xyz</code>`);
        return NextResponse.json({ ok: true });
      }

      await sendMsg(token, chatId, `🎥 <b>Fetching YouTube transcript &amp; generating AI summary...</b>\n<i>Please wait a few seconds...</i>`);

      after(async () => {
        try {
          const ytNote = await processYouTubeToNote(ytUrl);
          const fileName = `${ytNote.slug}.md`;

          const result = await saveTelegramNote(fileName, ytNote.markdownContent, false);
          const rawLiveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(ytNote.slug)}`;
          const safeLiveUrl = escapeHtml(rawLiveUrl);

          if (result.githubStatus?.includes("Committed to GitHub")) {
            const tagStr = ytNote.tags.map((t) => `#${escapeHtml(t)}`).join(" ");
            await sendMsg(
              token,
              chatId,
              `🎥 <b>YouTube Note Created &amp; Published!</b>\n\n` +
              `📝 <b>${escapeHtml(ytNote.title)}</b>\n` +
              `🏷️ ${tagStr || "#youtube"}\n` +
              `📄 <code>${escapeHtml(fileName)}</code>\n` +
              `🔗 <a href="${safeLiveUrl}">${safeLiveUrl}</a>`,
              { inline_keyboard: [[{ text: "🌐 View Note", url: rawLiveUrl }]] }
            );
          } else {
            await sendMsg(token, chatId, `❌ <b>Failed to publish YouTube note:</b> ${escapeHtml(result.githubStatus || "")}`);
          }
        } catch (err: any) {
          await sendMsg(token, chatId, `❌ <b>YouTube Error:</b> ${escapeHtml(err.message)}`);
        }
      });

      return NextResponse.json({ ok: true, youtube: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔖 WEB CLIPPER — Article / Link to AI Markdown Summary
    // ═══════════════════════════════════════════════════════════════════
    if (text.startsWith("/clip") || (text.startsWith("http") && !text.includes("youtube.com") && !text.includes("youtu.be"))) {
      let clipUrl = text.replace(/^\/clip\s*/i, "").trim();
      if (!clipUrl && text.startsWith("http")) {
        const urlMatch = text.match(/https?:\/\/\S+/i);
        if (urlMatch) clipUrl = urlMatch[0];
      }

      if (clipUrl) {
        await sendMsg(token, chatId, `🔖 <b>Clipping article &amp; generating AI summary...</b>\n<i>Please wait a few seconds...</i>`);

        after(async () => {
          try {
            const clipNote = await processWebClipToNote(clipUrl);
            const fileName = `${clipNote.slug}.md`;

            const result = await saveTelegramNote(fileName, clipNote.markdownContent, false);
            const rawLiveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(clipNote.slug)}`;
            const safeLiveUrl = escapeHtml(rawLiveUrl);

            if (result.githubStatus?.includes("Committed to GitHub")) {
              const tagStr = clipNote.tags.map((t) => `#${escapeHtml(t)}`).join(" ");
              await sendMsg(
                token,
                chatId,
                `🔖 <b>Article Clipped &amp; Published!</b>\n\n` +
                `📝 <b>${escapeHtml(clipNote.title)}</b>\n` +
                `🏷️ ${tagStr || "#article"}\n` +
                `📄 <code>${escapeHtml(fileName)}</code>\n` +
                `🔗 <a href="${safeLiveUrl}">${safeLiveUrl}</a>`,
                { inline_keyboard: [[{ text: "🌐 View Note", url: rawLiveUrl }]] }
              );
            } else {
              await sendMsg(token, chatId, `❌ <b>Failed to publish clipped note:</b> ${escapeHtml(result.githubStatus || "")}`);
            }
          } catch (err: any) {
            await sendMsg(token, chatId, `❌ <b>Clipper Error:</b> ${escapeHtml(err.message)}`);
          }
        });

        return NextResponse.json({ ok: true, clip: true });
      }
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
          const { getNoteBySlugOrName, commitNoteToGitHub, escapeHtml: esc } = await import("@/lib/telegram-file-handler");
          const note = await getNoteBySlugOrName(slug);
          if (!note) {
            await sendMsg(token, chatId, `❌ Note <code>${escapeHtml(slug)}</code> not found. Use /search to find the correct slug.`);
            return;
          }

          // Fetch current content from GitHub
          const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "xnocode/garden";
          const ghToken = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
          const filePath = `content/${slug}.md`;
          const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
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

    if (text.startsWith("/link") || text.startsWith("/url")) {
      const target = text.replace(/^\/(link|url)/, "").trim();
      if (!target) { await sendMsg(token, chatId, "⚠️ <code>/link filename</code>"); return NextResponse.json({ ok: true }); }
      const note = await getNoteBySlugOrName(target);
      if (!note) {
        await sendMsg(token, chatId, `❌ <i>"${escapeHtml(note?.title || target)}"</i> not found.`);
      } else {
        await sendMsg(token, chatId,
          `🔗 <b>${escapeHtml(note.title)}</b>\n👉 <a href="${escapeHtml(note.url)}">${escapeHtml(note.url)}</a>`,
          { inline_keyboard: [[{ text: "🌐 Open", url: note.url }]] }
        );
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
    if (text.startsWith("/mytasks") || rawText.includes("My Tasks") || rawText.includes("📋")) {
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
        await sendMsg(
          token, chatId,
          `📋 <b>Tasks (${snapshot.tasks.length} visible, synced ${agoStr}):</b>\n\n` +
          lines.join("\n\n") +
          `\n\n<i>Mark done: <code>/done 1</code> (use the number above)</i>`
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

    // ─── /done — Mark a task as done by position number ───────────────────────
    if (text.startsWith("/done")) {
      const numStr = text.replace("/done", "").trim();
      const pos = parseInt(numStr, 10);
      if (!numStr || isNaN(pos) || pos < 1) {
        await sendMsg(
          token, chatId,
          `⚠️ Usage: <code>/done 1</code>\n\n<i>Use <code>/mytasks</code> to see the numbered list first.</i>`
        );
        return NextResponse.json({ ok: true });
      }

      // Resolve position → UUID from the snapshot
      const snapshot = await getTasksFromGitHub();
      const task = snapshot?.tasks[pos - 1];
      if (!task) {
        const total = snapshot?.tasks.length ?? 0;
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
          // Queue UUID — never shifts even if other tasks complete in WSL
          const res = await addPendingDoneToGitHub([task.uuid]);
          if (res.success) {
            await sendMsg(
              token, chatId,
              `✅ <b>"${escapeHtml(task.description)}" queued as done!</b>\n\n` +
              `<i>Next <code>bun run deploy</code> will mark it complete in WSL Taskwarrior \& update the website.\n` +
              `(Safe to queue again — duplicates are ignored automatically.)</i>`
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
        await sendMsg(token, chatId, `🔍 <b>"${escapeHtml(q)}" (${results.length}):</b>\n\n${list}\n\n<code>/link filename</code> for URL`);
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
      if (!total) { await sendMsg(token, chatId, "📂 No notes."); }
      else {
        const list = notes.map((n, i) => `${(page - 1) * 25 + i + 1}. <b>${escapeHtml(n.title)}</b> (<code>${escapeHtml(n.filename)}</code>)`).join("\n");
        const nav = totalPages > 1 ? `\n\n📖 Page ${page}/${totalPages}. <code>/list ${page < totalPages ? page + 1 : 1}</code>` : "";
        await sendMsg(token, chatId, `📚 <b>Notes (${total}):</b>\n\n${list}${nav}`);
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
        `🎥 <b>3. YouTube Video to Note:</b>\n` +
        `• <code>/youtube https://youtu.be/xyz</code> or paste any video link!\n\n` +
        `🔖 <b>4. Web Article Clipper:</b>\n` +
        `• <code>/clip https://example.com/article</code> or paste any article URL!\n\n` +
        `📸 <b>5. Photo / Whiteboard OCR:</b>\n` +
        `• Send a photo of handwritten notes, slides, or whiteboard!\n\n` +
        `💬 <b>6. Raw Brain Dump:</b>\n` +
        `• <code>/dump Messy thoughts &amp; notes go here...</code>\n\n` +
        `📌 <b>7. Taskwarrior Tasks:</b>\n` +
        `• Add: <code>/task Buy milk due:today priority:H</code>\n` +
        `• Multi: <code>/tasks\n- Task 1 due:today\n- Task 2 due:tomorrow</code>\n` +
        `• View: <code>/mytasks</code> — See pending task list with IDs\n` +
        `• Done: <code>/done 2</code> — Mark task #2 as complete\n\n` +
        `📚 <b>8. Manage Notes:</b>\n` +
        `• <code>/note Title\nBody... #tag</code> — Write text note directly\n` +
        `• <code>.md File Upload</code> — Publish or update existing note\n` +
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
