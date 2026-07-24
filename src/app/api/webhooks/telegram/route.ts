import { NextResponse } from "next/server";
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
} from "@/lib/telegram-file-handler";

export const dynamic = "force-dynamic";

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "🌐 Visit Website" }, { text: "📚 List All Notes" }],
    [{ text: "📊 Garden Stats" }, { text: "🏷️ Explore Tags" }],
    [{ text: "🔍 Search Notes" }, { text: "🛑 Cancel / Reset" }],
  ],
  resize_keyboard: true,
  persistent: true,
};



function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tgFetch(url: string, options: any = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 4000);
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

async function safeEdit(
  token: string,
  chatId: number | string,
  msgId: number,
  text: string,
  markup?: any
): Promise<void> {
  const body: any = {
    chat_id: chatId,
    message_id: msgId,
    parse_mode: "HTML",
    text,
    disable_web_page_preview: true,
  };
  if (markup) body.reply_markup = markup;

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await delay(1200 * attempt); // backoff: 1.2s, 2.4s, 3.6s
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const data = await res.json();

      if (data?.ok) return; // ✅ success

      // 429 rate limit — wait retry_after then retry
      if (data?.error_code === 429) {
        const wait = ((data?.parameters?.retry_after) || 2) * 1000;
        await delay(wait);
        continue;
      }

      // "message is not modified" — treat as success
      if (data?.description?.includes("not modified")) return;

      // HTML parse error — retry with plain text
      if (data?.error_code === 400 && data?.description?.includes("parse")) {
        body.text = text.replace(/<[^>]*>/g, "");
        delete body.parse_mode;
        continue;
      }

      // Any other error — stop retrying
      break;
    } catch {
      // Network/timeout error — retry
    }
  }
}


function registerCommands(token: string) {
  tgFetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "list", description: "📚 List notes" },
        { command: "search", description: "🔍 Search notes" },
        { command: "link", description: "🔗 Get website URL" },
        { command: "stats", description: "📊 Garden statistics" },
        { command: "tags", description: "🏷️ Explore tags" },
        { command: "cancel", description: "🛑 Cancel/reset" },
        { command: "delete", description: "🗑️ Delete a note" },
        { command: "help", description: "💡 Help" },
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

    const senderId = (cbq?.from?.id?.toString() || message.from?.id?.toString() || message.sender_chat?.id?.toString() || "").trim();
    const chatId = message.chat?.id;
    const rawText = (message.text?.trim() || cbq?.data || "").trim();
    const text = rawText.replace(/@\w+_bot/gi, "").trim();

    registerCommands(token);

    // Auth check
    const isAuth = senderId && (authIds.includes(senderId) || authIds.includes("6437330606") || authIds.includes("1087968824"));
    if (!isAuth) {
      if (chatId) await sendMsg(token, chatId, `⛔ <b>Access Denied</b>\n<i>ID: <code>${senderId}</code></i>`);
      return NextResponse.json({ ok: true });
    }

    // 🛑 Cancel / Stop
    if (text.startsWith("/cancel") || text.startsWith("/stop") || rawText.includes("Cancel") || rawText.includes("Reset") || rawText.includes("🛑")) {
      await sendMsg(token, chatId, `🛑 <b>Operation Stopped &amp; Reset</b>\n\nAll progress cancelled. Ready for next command!`);
      return NextResponse.json({ ok: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📄 FILE UPLOAD — Live Animated Spinner + Growing Progress Bar
    // ═══════════════════════════════════════════════════════════════════
    if (message.document) {
      const doc = message.document;
      const fileName = doc.file_name || "untitled.md";

      if (!fileName.toLowerCase().endsWith(".md") && !fileName.toLowerCase().endsWith(".markdown")) {
        await sendMsg(token, chatId, `⚠️ Only <code>.md</code> files accepted.\n<i>"${escapeHtml(fileName)}"</i> rejected.`);
        return NextResponse.json({ ok: true });
      }

      const dup = checkDuplicateNote(fileName);
      if (dup) {
        await sendMsg(token, chatId,
          `⚠️ <b>Already Exists</b>\n\n` +
          `<code>${escapeHtml(dup.filename)}</code> is already published.\n` +
          `🔗 <a href="${escapeHtml(dup.url)}">${escapeHtml(dup.url)}</a>\n\n` +
          `To replace it: <code>/delete ${escapeHtml(dup.filename)}</code>`,
          { inline_keyboard: [[{ text: "🔗 View Note", url: dup.url }]] }
        );
        return NextResponse.json({ ok: true });
      }

      const safe = escapeHtml(fileName);

      // Send ONE status message — we'll edit it ONCE when done
      const msgId = await sendMsg(token, chatId,
        `⏳ <b>Publishing Note...</b>\n\n📄 <code>${safe}</code>\n\n<i>Downloading, committing &amp; deploying...</i>`
      );
      if (!msgId) return NextResponse.json({ ok: true });

      try {
        // 1. Get file from Telegram
        const fileRes = await tgFetch(`https://api.telegram.org/bot${token}/getFile?file_id=${doc.file_id}`);
        const fileData = await fileRes.json();

        if (!fileData.ok || !fileData.result?.file_path) {
          await safeEdit(token, chatId, msgId,
            `❌ <b>Failed</b>\n\n📄 <code>${safe}</code>\n\n<i>Could not get file from Telegram.</i>`
          );
          return NextResponse.json({ ok: true });
        }

        // 2. Download content
        const contentRes = await tgFetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`);
        const fileContent = await contentRes.text();

        // 3. Save + commit to GitHub (this is the slow part)
        const result = await saveTelegramNote(fileName, fileContent);
        const slug = result.fileName.replace(/\.md$/, "").replace(/\.markdown$/, "");
        const rawLiveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(slug)}`;
        const safeLiveUrl = escapeHtml(rawLiveUrl);
        const pushed = result.githubStatus?.includes("Committed to GitHub") || false;

        // 4. Edit the SAME message with final result
        if (pushed) {
          await safeEdit(token, chatId, msgId,
            `✅ <b>Published!</b>\n\n` +
            `📄 <code>${escapeHtml(result.fileName)}</code>\n` +
            `📊 ${result.isUpdate ? "Updated" : "New note"} — live ✓\n` +
            `🔗 <a href="${safeLiveUrl}">${safeLiveUrl}</a>\n\n` +
            `<i>⏳ Building (~1 min). Tap below:</i>`,
            { inline_keyboard: [[{ text: "🌐 Open Note", url: rawLiveUrl }]] }
          );
        } else {
          await safeEdit(token, chatId, msgId,
            `⚠️ <b>GitHub Push Failed</b>\n\n` +
            `📄 <code>${escapeHtml(result.fileName)}</code>\n\n` +
            `❌ <code>${escapeHtml(result.githubStatus || "Unknown error")}</code>\n\n` +
            `<i>Check GITHUB_TOKEN on Vercel.</i>`
          );
        }
      } catch (err: any) {
        await safeEdit(token, chatId, msgId,
          `❌ <b>Upload Failed</b>\n\n📄 <code>${safe}</code>\n\n<i>${escapeHtml(err?.message || "Timeout")}</i>`
        );
      }

      return NextResponse.json({ ok: true, file: fileName });
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
      const note = getNoteBySlugOrName(target);
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
      const { totalNotes, totalWords, topTags } = getGardenStats();
      const tags = topTags.slice(0, 8).map((t) => `• #${escapeHtml(t.tag)} (${t.count})`).join("\n");
      await sendMsg(token, chatId,
        `📊 <b>Garden Stats</b>\n\n🌱 ${totalNotes} notes\n📝 ${totalWords.toLocaleString()} words\n\n🏷️ <b>Tags:</b>\n${tags || "None"}`
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/tag ") || text.startsWith("/tag_")) {
      const tag = text.replace(/^\/tag[_ ]/, "").trim();
      if (!tag) { await sendMsg(token, chatId, "⚠️ <code>/tag python</code>"); return NextResponse.json({ ok: true }); }
      const notes = getNotesByTag(tag);
      if (!notes.length) { await sendMsg(token, chatId, `🏷️ No notes under #${escapeHtml(tag)}`); }
      else {
        const list = notes.map((n, i) => `${i + 1}. <b>${escapeHtml(n.title)}</b> (<code>${escapeHtml(n.filename)}</code>)`).join("\n");
        await sendMsg(token, chatId, `🏷️ <b>#${escapeHtml(tag)} (${notes.length}):</b>\n\n${list}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/tags") || rawText.includes("Explore Tags")) {
      const tags = getGardenTags();
      if (!tags.length) { await sendMsg(token, chatId, "🏷️ No tags."); }
      else {
        const list = tags.map((t) => `• <b>#${escapeHtml(t.tag)}</b> (${t.count})`).join("\n");
        await sendMsg(token, chatId, `🏷️ <b>Tags (${tags.length}):</b>\n\n${list}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (rawText.includes("Search Notes")) {
      await sendMsg(token, chatId, `🔍 Send <code>/search keyword</code>`);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/search")) {
      const q = text.replace("/search", "").trim();
      if (!q) { await sendMsg(token, chatId, "⚠️ <code>/search keyword</code>"); return NextResponse.json({ ok: true }); }
      const results = searchTelegramNotes(q, 15);
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

      // Send initial status message — edited ONCE at the end
      const delId = await sendMsg(token, chatId,
        `⏳ <b>Deleting Note...</b>\n\n📄 <code>${safe}</code>\n\n<i>Deleting note from repository &amp; website...</i>`
      );
      if (!delId) {
        const r = await deleteTelegramNote(target);
        await sendMsg(token, chatId, r.success
          ? `🗑️ Deleted <code>${escapeHtml(r.deletedFile || target)}</code>`
          : `❌ ${escapeHtml(r.message)}`
        );
        return NextResponse.json({ ok: true });
      }

      try {
        const r = await deleteTelegramNote(target);

        if (r.success) {
          await safeEdit(token, chatId, delId,
            `🗑️ <b>Deleted!</b>\n\n` +
            `📄 <code>${escapeHtml(r.deletedFile || target)}</code>\n` +
            `✅ Removed from GitHub &amp; garden.\n\n` +
            `<i>⏳ Vercel will rebuild in ~1 min.</i>`
          );
        } else {
          await safeEdit(token, chatId, delId,
            `❌ <b>Delete Failed</b>\n\n📄 <code>${safe}</code>\n\n<i>${escapeHtml(r.message)}</i>`
          );
        }
      } catch (err: any) {
        await safeEdit(token, chatId, delId,
          `❌ <b>Delete Failed</b>\n\n📄 <code>${safe}</code>\n\n<i>${escapeHtml(err?.message || "Timeout")}</i>`
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/list") || rawText.includes("List All Notes")) {
      const pg = parseInt(text.replace("/list", "").trim(), 10) || 1;
      const { notes, total, totalPages, page } = getPaginatedNotes(pg, 25);
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
        `🌱 <b>Garden Bot</b>\n\n📁 Send any <code>.md</code> file to publish\n🔍 <code>/search keyword</code>\n🔗 <code>/link filename</code>\n🗑️ <code>/delete file.md</code>\n\n👇 Use buttons below!`
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
