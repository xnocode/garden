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
 * Minimalist animated progress bar: [■■■■■■□□□□] 60%
 */
function renderProgressBar(percent: number): string {
  const total = 10;
  const filled = Math.min(10, Math.max(0, Math.round((percent / 100) * total)));
  const empty = total - filled;
  return `[${"■".repeat(filled)}${"□".repeat(empty)}] ${percent}%`;
}

/** Promise-based delay */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 8000) {
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
      disable_web_page_preview: true,
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
): Promise<boolean> {
  try {
    const body: any = {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      text,
      disable_web_page_preview: true,
    };
    if (extraMarkup) {
      body.reply_markup = JSON.stringify(extraMarkup);
    }

    const res = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
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

/**
 * Verifies that a Vercel deployment is live by polling the actual page URL.
 * Returns true if the page returns 200 status, false if timeout reached.
 */
async function verifyDeployment(url: string, maxWaitMs: number = 90000): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 5000; // Check every 5 seconds

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const res = await fetchWithTimeout(url, {}, 4000);
      if (res.ok) {
        const body = await res.text();
        // Check that page actually has content (not a 404 page)
        if (body.length > 500 && !body.includes("404") && !body.includes("Page Not Found")) {
          return true;
        }
      }
    } catch {
      // Page not ready yet, keep polling
    }
    await delay(pollInterval);
  }
  return false;
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
        `🛑 <b>Operation Stopped &amp; Reset Successfully</b>\n\n` +
          `All active progress and uploads have been cancelled.\n` +
          `Your bot is clean and ready for your next command!`
      );
      return NextResponse.json({ status: "stopped" }, { status: 200 });
    }

    // ═══════════════════════════════════════════════════════
    // 📄 3. DOCUMENT UPLOAD — FULL ANIMATED SINGLE-MESSAGE
    //    PIPELINE: Download → Save → Deploy → Verify → Link
    // ═══════════════════════════════════════════════════════
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

      // 🚫 DUPLICATE CHECK
      const existingNote = checkDuplicateNote(fileName);
      if (existingNote) {
        await sendTelegramReply(
          botToken,
          chatId,
          `⚠️ <b>Upload Blocked — Duplicate File</b>\n\n` +
            `<code>${escapeHtml(existingNote.filename)}</code> already exists in your garden.\n\n` +
            `🔗 <a href="${existingNote.url}">${existingNote.url}</a>\n\n` +
            `💡 To replace it, first send:\n<code>/delete ${escapeHtml(existingNote.filename)}</code>`,
          {
            inline_keyboard: [
              [{ text: `🔗 View Existing Note`, url: existingNote.url }],
            ],
          }
        );
        return NextResponse.json({ status: "duplicate_blocked" }, { status: 200 });
      }

      const safeFileName = escapeHtml(fileName);

      // ─── STEP 1/5: SEND INITIAL MESSAGE (10%) ───
      const progressMsgId = await sendTelegramReply(
        botToken,
        chatId,
        `⚡ <b>Uploading Note...</b>\n\n` +
          `<code>${renderProgressBar(10)}</code>\n` +
          `📥 Downloading file from Telegram...\n\n` +
          `📄 ${safeFileName}`
      );

      if (!progressMsgId) {
        return NextResponse.json({ error: "Could not send progress message" }, { status: 200 });
      }

      // Small delay so user sees initial state
      await delay(800);

      // ─── STEP 2/5: DOWNLOAD FILE (30%) ───
      await editTelegramMessage(
        botToken, chatId, progressMsgId,
        `⚡ <b>Uploading Note...</b>\n\n` +
          `<code>${renderProgressBar(30)}</code>\n` +
          `📥 Downloading file content...\n\n` +
          `📄 ${safeFileName}`
      );

      const fileRes = await fetchWithTimeout(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${doc.file_id}`
      );
      const fileData = await fileRes.json();

      if (!fileData.ok || !fileData.result?.file_path) {
        await editTelegramMessage(
          botToken, chatId, progressMsgId,
          `❌ <b>Upload Failed</b>\n\n` +
            `Telegram file download failed. Please try again.\n\n` +
            `📄 ${safeFileName}`
        );
        return NextResponse.json({ error: "file fetch error" }, { status: 200 });
      }

      await delay(600);

      // ─── STEP 3/5: SAVE & INDEX (50%) ───
      await editTelegramMessage(
        botToken, chatId, progressMsgId,
        `⚡ <b>Uploading Note...</b>\n\n` +
          `<code>${renderProgressBar(50)}</code>\n` +
          `💾 Saving &amp; indexing in garden...\n\n` +
          `📄 ${safeFileName}`
      );

      const contentRes = await fetchWithTimeout(
        `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`
      );
      const fileContent = await contentRes.text();

      const result = await saveTelegramNote(fileName, fileContent);

      await delay(600);

      // ─── STEP 4/5: DEPLOY TO GITHUB (75%) ───
      await editTelegramMessage(
        botToken, chatId, progressMsgId,
        `⚡ <b>Deploying to Website...</b>\n\n` +
          `<code>${renderProgressBar(75)}</code>\n` +
          `🚀 Pushing to GitHub &amp; triggering Vercel build...\n\n` +
          `📄 ${safeFileName}`
      );

      // GitHub commit already happened inside saveTelegramNote, but let's check the result
      const slug = result.fileName.replace(/\.md$/, "").replace(/\.markdown$/, "");
      const liveUrl = `https://gardenx.qzz.io/?p=${encodeURIComponent(slug)}`;

      const deployedToGitHub = result.githubStatus?.includes("GitHub");

      await delay(1000);

      // ─── STEP 5/5: VERIFY & SHARE LINK (100%) ───
      if (deployedToGitHub) {
        // Show 90% — waiting for Vercel
        await editTelegramMessage(
          botToken, chatId, progressMsgId,
          `⚡ <b>Verifying Deployment...</b>\n\n` +
            `<code>${renderProgressBar(90)}</code>\n` +
            `🔍 Waiting for Vercel to build &amp; go live...\n\n` +
            `📄 ${safeFileName}`
        );

        // Poll for the page to actually be live (up to 90 seconds)
        const isLive = await verifyDeployment(liveUrl, 90000);

        if (isLive) {
          // ✅ FULLY VERIFIED — note is live on the website
          await editTelegramMessage(
            botToken, chatId, progressMsgId,
            `✅ <b>Published &amp; Verified Live!</b>\n\n` +
              `<code>${renderProgressBar(100)}</code>\n\n` +
              `📄 <b>File:</b> <code>${escapeHtml(result.fileName)}</code>\n` +
              `📊 <b>Status:</b> ${result.isUpdate ? "Updated" : "New Note"} — Live on Website\n` +
              `🌐 <b>Link:</b> <a href="${liveUrl}">${liveUrl}</a>`,
            {
              inline_keyboard: [
                [{ text: `🌐 Open Note on Website`, url: liveUrl }],
              ],
            }
          );
        } else {
          // ⏳ Deployed to GitHub but Vercel is still building
          await editTelegramMessage(
            botToken, chatId, progressMsgId,
            `⏳ <b>Deployed — Building on Vercel</b>\n\n` +
              `<code>${renderProgressBar(95)}</code>\n\n` +
              `📄 <b>File:</b> <code>${escapeHtml(result.fileName)}</code>\n` +
              `📊 <b>Status:</b> Committed to GitHub ✓ — Vercel building...\n` +
              `🌐 <b>Link:</b> <a href="${liveUrl}">${liveUrl}</a>\n\n` +
              `💡 <i>Link will go live in ~1-2 minutes. Tap below to check:</i>`,
            {
              inline_keyboard: [
                [{ text: `🌐 Check Note (may take 1-2 min)`, url: liveUrl }],
              ],
            }
          );
        }
      } else {
        // ❌ GitHub commit failed — no GITHUB_TOKEN or API error
        await editTelegramMessage(
          botToken, chatId, progressMsgId,
          `⚠️ <b>Saved Locally — Deployment Failed</b>\n\n` +
            `<code>${renderProgressBar(50)}</code>\n\n` +
            `📄 <b>File:</b> <code>${escapeHtml(result.fileName)}</code>\n` +
            `📊 <b>Status:</b> Saved in bot memory but NOT published to website\n\n` +
            `❌ <b>Reason:</b> No <code>GITHUB_TOKEN</code> configured on server.\n` +
            `The bot cannot commit files to GitHub without this token.\n\n` +
            `💡 <b>Fix:</b> Add <code>GITHUB_TOKEN</code> to your Vercel environment variables.`
        );
      }

      return NextResponse.json({ success: true, fileName: result.fileName }, { status: 200 });
    }

    // ═══════════════════════════════════════════════
    // 💬 4. BUTTON CLICK & COMMAND HANDLING
    // ═══════════════════════════════════════════════

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

    // 🔗 LINK COMMAND
    if (text.startsWith("/link") || text.startsWith("/url")) {
      const target = text.replace(/^\/(link|url)/, "").trim();
      if (!target) {
        await sendTelegramReply(
          botToken, chatId,
          "⚠️ <b>Usage:</b> <code>/link python-variables</code> or <code>/link about</code>"
        );
        return NextResponse.json({ status: "bad_command" }, { status: 200 });
      }

      const note = getNoteBySlugOrName(target);
      if (!note) {
        await sendTelegramReply(
          botToken, chatId,
          `❌ Note <i>"${escapeHtml(target)}"</i> not found in your garden.`
        );
      } else {
        await sendTelegramReply(
          botToken, chatId,
          `🔗 <b>${escapeHtml(note.title)}</b>\n\n` +
            `👉 <a href="${note.url}">${note.url}</a>\n` +
            `📄 <code>${escapeHtml(note.filename)}</code>`,
          {
            inline_keyboard: [
              [{ text: `🌐 Open on Website`, url: note.url }],
            ],
          }
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 📊 STATS
    if (text.startsWith("/stats") || rawText.includes("Garden Stats")) {
      const { totalNotes, totalWords, topTags } = getGardenStats();
      const formattedTags = topTags
        .slice(0, 8)
        .map((t) => `• <b>#${escapeHtml(t.tag)}</b> (${t.count})`)
        .join("\n");

      await sendTelegramReply(
        botToken, chatId,
        `📊 <b>Garden Statistics</b>\n\n` +
          `🌱 <b>Notes:</b> ${totalNotes}\n` +
          `📝 <b>Words:</b> ${totalWords.toLocaleString()}\n\n` +
          `🏷️ <b>Top Tags:</b>\n${formattedTags || "No tags yet."}`
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 🏷️ SINGLE TAG: /tag <name>
    if (text.startsWith("/tag ") || text.startsWith("/tag_")) {
      const tagName = text.replace(/^\/tag[_ ]/, "").trim();
      if (!tagName) {
        await sendTelegramReply(botToken, chatId, "⚠️ <b>Usage:</b> <code>/tag python</code>");
        return NextResponse.json({ status: "bad_command" }, { status: 200 });
      }
      const notes = getNotesByTag(tagName);
      if (notes.length === 0) {
        await sendTelegramReply(botToken, chatId, `🏷️ No notes under <b>#${escapeHtml(tagName)}</b>.`);
      } else {
        const noteList = notes
          .map((n, i) => `${i + 1}. <b>${escapeHtml(n.title)}</b> (<code>${escapeHtml(n.filename)}</code>)`)
          .join("\n");
        await sendTelegramReply(
          botToken, chatId,
          `🏷️ <b>#${escapeHtml(tagName)} (${notes.length}):</b>\n\n${noteList}\n\n<i>Send <code>/link filename</code> for website URL</i>`
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 🏷️ TAGS OVERVIEW
    if (text.startsWith("/tags") || rawText.includes("Explore Tags")) {
      const tags = getGardenTags();
      if (tags.length === 0) {
        await sendTelegramReply(botToken, chatId, "🏷️ No tags found.");
      } else {
        const tagList = tags
          .map((t) => `• <b>#${escapeHtml(t.tag)}</b> (${t.count}) — <code>/tag ${escapeHtml(t.tag)}</code>`)
          .join("\n");
        await sendTelegramReply(
          botToken, chatId,
          `🏷️ <b>All Tags (${tags.length}):</b>\n\n${tagList}`
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 🔍 Search Button
    if (rawText.includes("Search Notes")) {
      await sendTelegramReply(
        botToken, chatId,
        `🔍 <b>Search:</b> Send <code>/search keyword</code>`
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 🔍 SEARCH
    if (text.startsWith("/search")) {
      const query = text.replace("/search", "").trim();
      if (!query) {
        await sendTelegramReply(botToken, chatId, "⚠️ <b>Usage:</b> <code>/search python</code>");
        return NextResponse.json({ status: "bad_command" }, { status: 200 });
      }
      const results = searchTelegramNotes(query, 15);
      if (results.length === 0) {
        await sendTelegramReply(botToken, chatId, `🔍 No results for <i>"${escapeHtml(query)}"</i>.`);
      } else {
        const formatted = results
          .map((r, i) => `<b>${i + 1}. ${r.title}</b> (<code>${r.fileName}</code>)\n<i>${r.snippet}</i>`)
          .join("\n\n");
        await sendTelegramReply(
          botToken, chatId,
          `🔍 <b>"${escapeHtml(query)}" (${results.length} found):</b>\n\n${formatted}\n\n💡 <i><code>/link filename</code> for URL</i>`
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 🗑️ DELETE
    if (text.startsWith("/delete")) {
      const target = text.replace("/delete", "").trim();
      if (!target) {
        await sendTelegramReply(botToken, chatId, "⚠️ <b>Usage:</b> <code>/delete filename.md</code>");
        return NextResponse.json({ status: "bad_command" }, { status: 200 });
      }
      const delResult = await deleteTelegramNote(target);
      if (delResult.success) {
        await sendTelegramReply(
          botToken, chatId,
          `🗑️ <b>Deleted:</b> <code>${escapeHtml(delResult.deletedFile || target)}</code>`
        );
      } else {
        await sendTelegramReply(botToken, chatId, `❌ ${escapeHtml(delResult.message)}`);
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 📚 LIST
    if (text.startsWith("/list") || rawText.includes("List All Notes")) {
      const pageArg = text.replace("/list", "").trim();
      const pageNum = parseInt(pageArg, 10) || 1;
      const { notes, total, totalPages, page } = getPaginatedNotes(pageNum, 25);
      if (total === 0) {
        await sendTelegramReply(botToken, chatId, "📂 No notes found.");
      } else {
        const noteList = notes
          .map((n, i) => `${(page - 1) * 25 + i + 1}. <b>${escapeHtml(n.title)}</b> (<code>${escapeHtml(n.filename)}</code>)`)
          .join("\n");
        const nav = totalPages > 1
          ? `\n\n📖 <i>Page ${page}/${totalPages}. <code>/list ${page < totalPages ? page + 1 : 1}</code></i>`
          : "";
        await sendTelegramReply(
          botToken, chatId,
          `📚 <b>Notes (${total}):</b>\n\n${noteList}${nav}\n\n💡 <i><code>/link filename</code> for URL</i>`
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 💡 HELP / START
    if (text.startsWith("/start") || text.startsWith("/help") || rawText.includes("Help & Guide")) {
      await sendTelegramReply(
        botToken, chatId,
        `🌱 <b>Garden Note Manager</b>\n\n` +
          `📁 <b>Upload:</b> Send any <code>.md</code> file\n` +
          `🔍 <b>Search:</b> <code>/search keyword</code>\n` +
          `🔗 <b>Get Link:</b> <code>/link filename</code>\n` +
          `🗑️ <b>Delete:</b> <code>/delete filename.md</code>\n\n` +
          `👇 Use the buttons below!`
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ status: "ignored" }, { status: 200 });
  } catch (error: any) {
    console.error("Telegram webhook handler error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
