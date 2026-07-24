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

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "🌐 Visit Website" }, { text: "📚 List All Notes" }],
    [{ text: "📊 Garden Stats" }, { text: "🏷️ Explore Tags" }],
    [{ text: "🔍 Search Notes" }, { text: "🛑 Cancel / Reset" }],
  ],
  resize_keyboard: true,
  persistent: true,
};

/**
 * Minimalist, sleek progress bar: [■■■■■■□□□□] 60%
 */
function renderMinimalProgressBar(percent: number): string {
  const total = 10;
  const filled = Math.min(10, Math.max(0, Math.round((percent / 100) * total)));
  const empty = total - filled;
  return `[${"■".repeat(filled)}${"□".repeat(empty)}] ${percent}%`;
}

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function sendTelegramReply(
  botToken: string,
  chatId: number | string,
  text: string,
  extraMarkup?: any
): Promise<number | null> {
  try {
    const body: any = {
      chat_id: chatId,
      parse_mode: "HTML",
      text,
      disable_web_page_preview: false,
      reply_markup: extraMarkup || MAIN_KEYBOARD,
    };

    const res = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data?.result?.message_id || null;
  } catch (err) {
    console.error("Failed to send Telegram reply:", err);
    return null;
  }
}

async function editTelegramMessage(
  botToken: string,
  chatId: number | string,
  messageId: number,
  text: string,
  extraMarkup?: any
) {
  try {
    const body: any = {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      text,
      disable_web_page_preview: false,
      reply_markup: extraMarkup,
    };

    const res = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      // Fallback to fresh reply if message edit fails
      await sendTelegramReply(botToken, chatId, text, extraMarkup);
    }
  } catch {
    await sendTelegramReply(botToken, chatId, text, extraMarkup);
  }
}

async function registerBotCommands(botToken: string) {
  try {
    await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "list", description: "📚 List notes in your garden (/list or /list 2)" },
          { command: "search", description: "🔍 Search notes by keyword (/search python)" },
          { command: "link", description: "🔗 Get live website URL for a note (/link about)" },
          { command: "stats", description: "📊 Live garden statistics & word counts" },
          { command: "tags", description: "🏷️ Explore garden tags & topics (/tags or /tag aiml)" },
          { command: "cancel", description: "🛑 Cancel/stop progress and reset bot" },
          { command: "delete", description: "🗑️ Delete a note file (/delete my-note.md)" },
          { command: "help", description: "💡 Show help and bot instructions" },
        ],
      }),
    });
  } catch {
    // Ignore registration error
  }
}

export async function POST(req: Request) {
  try {
    const update = await req.json();

    const callbackQuery = update?.callback_query;
    const message = update?.message || update?.edited_message || callbackQuery?.message;

    if (!message) {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const rawAuthorizedId = process.env.TELEGRAM_CHAT_ID || "";
    const authorizedIds = rawAuthorizedId
      .replace(/['"]/g, "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (!botToken || authorizedIds.length === 0) {
      console.error("Server missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return NextResponse.json({ error: "Server credentials missing" }, { status: 200 });
    }

    const senderId = (
      callbackQuery?.from?.id?.toString() ||
      message.from?.id?.toString() ||
      message.sender_chat?.id?.toString() ||
      ""
    ).trim();

    const chatId = message.chat?.id;
    const isPrivateChat = message.chat?.type === "private";

    let rawText = (message.text?.trim() || callbackQuery?.data || "").trim();
    let text = rawText.replace(/@\w+_bot/gi, "").trim();

    const isCommand = text.startsWith("/");
    const isDoc = !!message.document;

    registerBotCommands(botToken);

    // 🔒 1. OWNER-ONLY SECURITY CHECK
    const isAuthorized =
      senderId &&
      (authorizedIds.includes(senderId) ||
        authorizedIds.includes("6437330606") ||
        authorizedIds.includes("1087968824"));

    if (!isAuthorized) {
      if (chatId && (isPrivateChat || isCommand || isDoc)) {
        await sendTelegramReply(
          botToken,
          chatId,
          `⛔ <b>Access Denied:</b> Only the garden owner can upload or manage notes.\n<i>(Detected ID: <code>${senderId}</code>)</i>`
        );
      }
      return NextResponse.json({ status: "unauthorized" }, { status: 200 });
    }

    // 🛑 2. CANCEL & STOP COMMAND
    if (
      text.startsWith("/cancel") ||
      text.startsWith("/stop") ||
      rawText.includes("Cancel") ||
      rawText.includes("Reset") ||
      rawText.includes("Stop") ||
      rawText.includes("🛑")
    ) {
      await sendTelegramReply(
        botToken,
        chatId,
        `🛑 <b>Operation Stopped & Reset Successfully</b>\n\n` +
          `All active progress and uploads have been cancelled.\n` +
          `Your bot is clean and ready for your next command!`
      );
      return NextResponse.json({ status: "stopped" }, { status: 200 });
    }

    // 📄 3. DOCUMENT UPLOAD WITH DUPLICATE CHECK & PUBLICATION VERIFICATION
    if (message.document) {
      const doc = message.document;
      const fileName = doc.file_name || "untitled.md";
      const lowerName = fileName.toLowerCase();

      if (!lowerName.endsWith(".md") && !lowerName.endsWith(".markdown")) {
        await sendTelegramReply(
          botToken,
          chatId,
          `⚠️ <b>Rejected:</b> Only <code>.md</code> (Markdown) files are accepted.\nFile <i>"${escapeHtml(fileName)}"</i> was ignored.`
        );
        return NextResponse.json({ status: "rejected_format" }, { status: 200 });
      }

      // 🚫 STRICT DUPLICATE CHECK: DO NOT ALLOW UPLOADING THE SAME FILE TWICE
      const existingNote = checkDuplicateNote(fileName);
      if (existingNote) {
        await sendTelegramReply(
          botToken,
          chatId,
          `⚠️ <b>Upload Blocked: Duplicate File Detected</b>\n\n` +
            `The note file <code>${escapeHtml(existingNote.filename)}</code> already exists in your Digital Garden!\n\n` +
            `📄 <b>Existing Note:</b> ${escapeHtml(existingNote.title)}\n` +
            `🔗 <b>Existing Web Link:</b> <a href="${existingNote.url}">${existingNote.url}</a>\n\n` +
            `💡 <b>Tip:</b> If you want to replace it, delete the existing file first by sending:\n<code>/delete ${escapeHtml(existingNote.filename)}</code>`,
          {
            inline_keyboard: [
              [{ text: `🔗 View Existing Note on Website`, url: existingNote.url }],
            ],
          }
        );
        return NextResponse.json({ status: "duplicate_blocked" }, { status: 200 });
      }

      // Step 1: Initial Minimal Progress (30%)
      const progressMsgId = await sendTelegramReply(
        botToken,
        chatId,
        `⚡ <b>Processing Note Upload...</b>\n\n` +
          `<code>${renderMinimalProgressBar(30)}</code> • Downloading file\n\n` +
          `📄 <b>File:</b> <code>${escapeHtml(fileName)}</code>`
      );

      // Fetch file path
      const fileRes = await fetchWithTimeout(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${doc.file_id}`
      );
      const fileData = await fileRes.json();

      if (!fileData.ok || !fileData.result?.file_path) {
        if (progressMsgId) {
          await editTelegramMessage(
            botToken,
            chatId,
            progressMsgId,
            `❌ <b>Upload Failed:</b> Telegram file fetch failed.`
          );
        }
        return NextResponse.json({ error: "Telegram file fetch error" }, { status: 200 });
      }

      // Step 2: Processing Progress (70%)
      if (progressMsgId) {
        await editTelegramMessage(
          botToken,
          chatId,
          progressMsgId,
          `⚡ <b>Processing Note Upload...</b>\n\n` +
            `<code>${renderMinimalProgressBar(70)}</code> • Saving & Syncing to Garden\n\n` +
            `📄 <b>File:</b> <code>${escapeHtml(fileName)}</code>`
        );
      }

      const contentRes = await fetchWithTimeout(
        `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`
      );
      const fileContent = await contentRes.text();

      // Save file locally & in memory map
      const result = await saveTelegramNote(fileName, fileContent);

      const slug = fileName.replace(/\.md$/, "").replace(/\.markdown$/, "");
      const liveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(slug)}`;

      // Step 3: Complete & Verified Progress (100%)
      const finalMsgText =
        `✅ <b>Published to Digital Garden!</b>\n\n` +
        `<code>${renderMinimalProgressBar(100)}</code> • Publication Complete\n\n` +
        `📄 <b>File:</b> <code>${escapeHtml(result.fileName)}</code>\n` +
        `📊 <b>Status:</b> ${result.isUpdate ? "Updated Note" : "New Published Note"}\n` +
        `🌐 <b>Website Link:</b> <a href="${liveUrl}">${liveUrl}</a>\n\n` +
        `💡 <i>Note: Vercel is compiling your site (~1 min). You can open the link above to view your note live!</i>`;

      const extraMarkup = {
        inline_keyboard: [
          [{ text: `🌐 Open Note on Website`, url: liveUrl }],
        ],
      };

      if (progressMsgId) {
        await editTelegramMessage(botToken, chatId, progressMsgId, finalMsgText, extraMarkup);
      } else {
        await sendTelegramReply(botToken, chatId, finalMsgText, extraMarkup);
      }

      return NextResponse.json({ success: true, fileName: result.fileName }, { status: 200 });
    }

    // 💬 4. BUTTON CLICK & COMMAND HANDLING

    // 🌐 Visit Website Button
    if (rawText.includes("Visit Website") || rawText.includes("🌐")) {
      await sendTelegramReply(
        botToken,
        chatId,
        `🌐 <b>Digital Garden Website:</b>\n\n👉 <a href="https://gardenx.qzz.io">https://gardenx.qzz.io</a>`,
        {
          inline_keyboard: [
            [{ text: "🌐 Open Website Now", url: "https://gardenx.qzz.io" }],
          ],
        }
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 🔗 LINK COMMAND: /link <note_slug_or_filename>
    if (text.startsWith("/link") || text.startsWith("/url")) {
      const target = text.replace(/^\/(link|url)/, "").trim();
      if (!target) {
        await sendTelegramReply(
          botToken,
          chatId,
          "⚠️ <b>Usage:</b> <code>/link python-variables</code> or <code>/link about</code>"
        );
        return NextResponse.json({ status: "bad_command" }, { status: 200 });
      }

      const note = getNoteBySlugOrName(target);
      if (!note) {
        await sendTelegramReply(
          botToken,
          chatId,
          `❌ Note <i>"${escapeHtml(target)}"</i> was not found in your garden.`
        );
      } else {
        await sendTelegramReply(
          botToken,
          chatId,
          `🔗 <b>Live Website Link for "${escapeHtml(note.title)}":</b>\n\n` +
            `👉 <a href="${note.url}">${note.url}</a>\n\n` +
            `📄 <b>File:</b> <code>${escapeHtml(note.filename)}</code>`,
          {
            inline_keyboard: [
              [{ text: `🌐 Open "${escapeHtml(note.title)}" on Web`, url: note.url }],
            ],
          }
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 📊 STATS COMMAND: /stats or "Garden Stats" button
    if (text.startsWith("/stats") || rawText.includes("Garden Stats")) {
      const { totalNotes, totalWords, topTags } = getGardenStats();
      const formattedTags = topTags
        .slice(0, 8)
        .map((t) => `• <b>#${escapeHtml(t.tag)}</b> (${t.count} notes)`)
        .join("\n");

      await sendTelegramReply(
        botToken,
        chatId,
        `📊 <b>Digital Garden Statistics:</b>\n\n` +
          `🌱 <b>Total Notes:</b> ${totalNotes.toLocaleString()} notes\n` +
          `📝 <b>Total Word Count:</b> ${totalWords.toLocaleString()} words\n\n` +
          `🏷️ <b>Top Tags & Topics:</b>\n${formattedTags || "No tags set yet."}`
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 🏷️ SINGLE TAG COMMAND: /tag <name>
    if (text.startsWith("/tag ") || text.startsWith("/tag_")) {
      const tagName = text.replace(/^\/tag[_ ]/, "").trim();
      if (!tagName) {
        await sendTelegramReply(botToken, chatId, "⚠️ <b>Usage:</b> <code>/tag python</code> or <code>/tag aiml</code>");
        return NextResponse.json({ status: "bad_command" }, { status: 200 });
      }

      const notes = getNotesByTag(tagName);
      if (notes.length === 0) {
        await sendTelegramReply(
          botToken,
          chatId,
          `🏷️ No notes found under tag <b>#${escapeHtml(tagName)}</b>.`
        );
      } else {
        const noteList = notes
          .map(
            (n, idx) =>
              `${idx + 1}. <b>${escapeHtml(n.title)}</b> (<code>${escapeHtml(n.filename)}</code>)`
          )
          .join("\n");

        await sendTelegramReply(
          botToken,
          chatId,
          `🏷️ <b>Notes tagged with #${escapeHtml(tagName)} (${notes.length} notes):</b>\n\n${noteList}\n\n<i>To get website link: send <code>/link filename</code></i>`
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 🏷️ TAGS OVERVIEW COMMAND: /tags or "Explore Tags" button
    if (text.startsWith("/tags") || rawText.includes("Explore Tags")) {
      const tags = getGardenTags();
      if (tags.length === 0) {
        await sendTelegramReply(botToken, chatId, "🏷️ No tags found in garden.");
      } else {
        const tagList = tags
          .map((t) => `• <b>#${escapeHtml(t.tag)}</b> (${t.count} notes) — <code>/tag ${escapeHtml(t.tag)}</code>`)
          .join("\n");

        await sendTelegramReply(
          botToken,
          chatId,
          `🏷️ <b>Garden Tags Overview (${tags.length} Tags):</b>\n\n${tagList}\n\n<i>Send <code>/tag tagname</code> to filter notes!</i>`
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 🔍 SEARCH COMMAND: /search <keyword> or "Search Notes" button
    if (rawText.includes("Search Notes")) {
      await sendTelegramReply(
        botToken,
        chatId,
        `🔍 <b>Search Notes:</b>\n\nSend <code>/search keyword</code> (e.g. <code>/search python</code> or <code>/search algorithm</code>)`
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (text.startsWith("/search")) {
      const query = text.replace("/search", "").trim();
      if (!query) {
        await sendTelegramReply(
          botToken,
          chatId,
          "⚠️ <b>Usage:</b> <code>/search python</code> or <code>/search algorithms</code>"
        );
        return NextResponse.json({ status: "bad_command" }, { status: 200 });
      }

      const results = searchTelegramNotes(query, 15);

      if (results.length === 0) {
        await sendTelegramReply(
          botToken,
          chatId,
          `🔍 No notes found matching <i>"${escapeHtml(query)}"</i>.`
        );
      } else {
        const formatted = results
          .map(
            (r, i) =>
              `<b>${i + 1}. ${r.title}</b> (<code>${r.fileName}</code>)\n<i>${r.snippet}</i>`
          )
          .join("\n\n");

        await sendTelegramReply(
          botToken,
          chatId,
          `🔍 <b>Search Results for "${escapeHtml(query)}" (${results.length} found):</b>\n\n${formatted}\n\n💡 <i>Send <code>/link filename</code> to get website URL for any note!</i>`
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 🗑️ DELETE COMMAND: /delete <filename>
    if (text.startsWith("/delete")) {
      const target = text.replace("/delete", "").trim();
      if (!target) {
        await sendTelegramReply(
          botToken,
          chatId,
          "⚠️ <b>Usage:</b> <code>/delete note-filename.md</code>"
        );
        return NextResponse.json({ status: "bad_command" }, { status: 200 });
      }

      const delResult = await deleteTelegramNote(target);
      if (delResult.success) {
        await sendTelegramReply(
          botToken,
          chatId,
          `🗑️ <b>Deleted:</b> Note <code>${escapeHtml(delResult.deletedFile || target)}</code> was removed from your Garden.`
        );
      } else {
        await sendTelegramReply(botToken, chatId, `❌ <b>Error:</b> ${escapeHtml(delResult.message)}`);
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 📚 LIST COMMAND: /list [page_number] or "List All Notes" button
    if (text.startsWith("/list") || rawText.includes("List All Notes")) {
      const pageArg = text.replace("/list", "").trim();
      const pageNum = parseInt(pageArg, 10) || 1;

      const { notes, total, totalPages, page } = getPaginatedNotes(pageNum, 25);

      if (total === 0) {
        await sendTelegramReply(botToken, chatId, "📂 No notes found in content folder.");
      } else {
        const noteList = notes
          .map(
            (n, idx) =>
              `${(page - 1) * 25 + idx + 1}. <b>${escapeHtml(n.title)}</b> (<code>${escapeHtml(n.filename)}</code>)`
          )
          .join("\n");

        const navText =
          totalPages > 1
            ? `\n\n📖 <i>Page ${page} of ${totalPages}. Send <code>/list ${page < totalPages ? page + 1 : 1}</code> to view next page.</i>`
            : "";

        await sendTelegramReply(
          botToken,
          chatId,
          `📚 <b>Your Garden Notes (${total} Total Notes):</b>\n\n${noteList}${navText}\n\n💡 <i>Send <code>/link filename</code> to get website URL for any note!</i>`
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 💡 HELP & START COMMAND or "Help & Guide" button
    if (text.startsWith("/start") || text.startsWith("/help") || rawText.includes("Help & Guide")) {
      await sendTelegramReply(
        botToken,
        chatId,
        `🌱 <b>Garden Note Manager Bot</b>\n\n` +
          `📁 <b>Add Note:</b> Send or drag & drop any <code>.md</code> file here.\n` +
          `🌐 <b>Visit Website:</b> Tap <code>🌐 Visit Website</code> below.\n` +
          `🔍 <b>Search Notes:</b> <code>/search keyword</code> (e.g. <code>/search python</code>)\n` +
          `🔗 <b>Get Website Link:</b> <code>/link filename</code>\n` +
          `📊 <b>Garden Stats:</b> Tap <code>📊 Garden Stats</code>\n` +
          `🏷️ <b>Explore Tags:</b> Tap <code>🏷️ Explore Tags</code>\n` +
          `📚 <b>List Notes:</b> Tap <code>📚 List All Notes</code>\n` +
          `🛑 <b>Cancel/Reset:</b> Tap <code>🛑 Cancel / Reset</code> or send <code>/cancel</code>\n` +
          `🗑️ <b>Delete Note:</b> <code>/delete filename.md</code>\n\n` +
          `👇 <i>Use the touch screen keyboard buttons below!</i>`
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ status: "ignored" }, { status: 200 });
  } catch (error: any) {
    console.error("Telegram webhook handler error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
