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
  escapeHtml,
} from "@/lib/telegram-file-handler";

async function sendTelegramReply(botToken: string, chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        parse_mode: "HTML",
        text,
        disable_web_page_preview: false,
      }),
    });
  } catch (err) {
    console.error("Failed to send Telegram reply:", err);
  }
}

/**
 * Registers bot commands with Telegram so typing '/' pops up the autocomplete command list.
 */
async function registerBotCommands(botToken: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "list", description: "📚 List notes in your garden (/list or /list 2)" },
          { command: "search", description: "🔍 Search notes by keyword (/search python)" },
          { command: "link", description: "🔗 Get live website URL for a note (/link about)" },
          { command: "stats", description: "📊 Live garden statistics & word counts" },
          { command: "tags", description: "🏷️ Explore garden tags & topics (/tags or /tag aiml)" },
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
    const message = update?.message || update?.edited_message;

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

    const senderId = (message.from?.id?.toString() || message.sender_chat?.id?.toString() || "").trim();
    const chatId = message.chat?.id;
    const isPrivateChat = message.chat?.type === "private";

    // Clean text and strip @bot_username for group chats (e.g. /list@gardenx_connector_bot -> /list)
    let text = (message.text?.trim() || "").replace(/@\w+_bot/gi, "").trim();

    const isCommand = text.startsWith("/");
    const isDoc = !!message.document;

    // Register commands menu asynchronously
    registerBotCommands(botToken);

    // 🔒 1. OWNER-ONLY SECURITY CHECK
    const isAuthorized =
      senderId &&
      (authorizedIds.includes(senderId) ||
        authorizedIds.includes("6437330606") ||
        authorizedIds.includes("1087968824"));

    if (!isAuthorized) {
      console.warn(
        `Unauthorized Telegram access attempt. Sender ID: "${senderId}", Authorized IDs: "${authorizedIds.join(",")}"`
      );

      if (chatId && (isPrivateChat || isCommand || isDoc)) {
        await sendTelegramReply(
          botToken,
          chatId,
          `⛔ <b>Access Denied:</b> Only the garden owner can upload or manage notes.\n<i>(Detected ID: <code>${senderId}</code>)</i>`
        );
      }
      return NextResponse.json({ status: "unauthorized" }, { status: 200 });
    }

    // 📄 2. DOCUMENT UPLOAD HANDLING (.md FILES ONLY)
    if (message.document) {
      const doc = message.document;
      const fileName = doc.file_name || "untitled.md";
      const lowerName = fileName.toLowerCase();

      // Strict .md file check
      if (!lowerName.endsWith(".md") && !lowerName.endsWith(".markdown")) {
        await sendTelegramReply(
          botToken,
          chatId,
          `⚠️ <b>Rejected:</b> Only <code>.md</code> (Markdown) files are accepted.\nFile <i>"${escapeHtml(fileName)}"</i> was ignored.`
        );
        return NextResponse.json({ status: "rejected_format" }, { status: 200 });
      }

      // Fetch file path from Telegram API
      const fileRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${doc.file_id}`
      );
      const fileData = await fileRes.json();

      if (!fileData.ok || !fileData.result?.file_path) {
        await sendTelegramReply(botToken, chatId, "❌ Failed to download file from Telegram servers.");
        return NextResponse.json({ error: "Telegram file fetch error" }, { status: 200 });
      }

      // Download file content
      const contentRes = await fetch(
        `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`
      );
      const fileContent = await contentRes.text();

      // Save file locally to content/
      const result = await saveTelegramNote(fileName, fileContent);

      const actionText = result.isUpdate ? "updated" : "added";
      await sendTelegramReply(
        botToken,
        chatId,
        `🌱 <b>Success!</b> Note <code>${escapeHtml(result.fileName)}</code> has been ${actionText} to your Garden content folder.`
      );

      return NextResponse.json({ success: true, fileName: result.fileName }, { status: 200 });
    }

    // 💬 3. COMMAND HANDLING

    // 🔗 LINK COMMAND: /link <note_slug_or_filename> or /url <note_slug_or_filename>
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
            `📄 <b>File:</b> <code>${escapeHtml(note.filename)}</code>`
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 📊 STATS COMMAND: /stats
    if (text.startsWith("/stats")) {
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

    // 🏷️ TAGS OVERVIEW COMMAND: /tags
    if (text.startsWith("/tags")) {
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

    // 🔍 SEARCH COMMAND: /search <keyword>
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
          `🔍 <b>Search Results for "${escapeHtml(query)}" (${results.length} found):</b>\n\n${formatted}\n\n💡 <i>Send <code>/link filename</code> to get website link for any note!</i>`
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

    // 📚 LIST COMMAND: /list [page_number]
    if (text.startsWith("/list")) {
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

    // 💡 HELP & START COMMAND
    if (text.startsWith("/start") || text.startsWith("/help")) {
      await sendTelegramReply(
        botToken,
        chatId,
        `🌱 <b>Garden Note Manager Bot</b>\n\n` +
          `📁 <b>Add Note:</b> Send or drag & drop any <code>.md</code> file here.\n` +
          `🔍 <b>Search Notes:</b> <code>/search keyword</code> (e.g. <code>/search python</code>)\n` +
          `🔗 <b>Get Website Link:</b> <code>/link filename</code> (e.g. <code>/link about</code>)\n` +
          `📊 <b>Garden Stats:</b> <code>/stats</code>\n` +
          `🏷️ <b>Explore Tags:</b> <code>/tags</code> or <code>/tag python</code>\n` +
          `📚 <b>List All Notes:</b> <code>/list</code> or <code>/list 2</code>\n` +
          `🗑️ <b>Delete Note:</b> <code>/delete filename.md</code>\n` +
          `💡 <b>Command Menu:</b> Type <code>/</code> to see all available commands!\n\n` +
          `🔒 <i>Only you (@${escapeHtml(message.from?.username || "Owner")}) can use this bot.</i>`
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ status: "ignored" }, { status: 200 });
  } catch (error: any) {
    console.error("Telegram webhook handler error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
