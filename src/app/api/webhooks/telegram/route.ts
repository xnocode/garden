import { NextResponse } from "next/server";
import {
  saveTelegramNote,
  deleteTelegramNote,
  listTelegramNotes,
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
      }),
    });
  } catch (err) {
    console.error("Failed to send Telegram reply:", err);
  }
}

export async function POST(req: Request) {
  try {
    const update = await req.json();
    const message = update?.message;

    if (!message) {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const authorizedChatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !authorizedChatId) {
      return NextResponse.json({ error: "Server credentials missing" }, { status: 200 });
    }

    const senderId = message.from?.id?.toString();
    const chatId = message.chat?.id;

    // 🔒 1. OWNER-ONLY SECURITY CHECK
    if (senderId !== authorizedChatId.toString()) {
      console.warn(`Unauthorized Telegram access attempt from ID: ${senderId}`);
      if (chatId) {
        await sendTelegramReply(
          botToken,
          chatId,
          "⛔ <b>Access Denied:</b> Only the garden owner can upload or manage notes."
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
          `⚠️ <b>Rejected:</b> Only <code>.md</code> (Markdown) files are accepted.\nFile <i>"${fileName}"</i> was ignored.`
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
        `🌱 <b>Success!</b> Note <code>${result.fileName}</code> has been ${actionText} to your Garden content folder.`
      );

      return NextResponse.json({ success: true, fileName: result.fileName }, { status: 200 });
    }

    // 💬 3. COMMAND HANDLING (/delete, /list, /help)
    const text = message.text?.trim() || "";

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
          `🗑️ <b>Deleted:</b> Note <code>${delResult.deletedFile}</code> was removed from your Garden.`
        );
      } else {
        await sendTelegramReply(botToken, chatId, `❌ <b>Error:</b> ${delResult.message}`);
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (text.startsWith("/list")) {
      const notes = listTelegramNotes(15);
      if (notes.length === 0) {
        await sendTelegramReply(botToken, chatId, "📂 No notes found in content folder.");
      } else {
        const noteList = notes.map((n) => `• <code>${n}</code>`).join("\n");
        await sendTelegramReply(
          botToken,
          chatId,
          `📚 <b>Your Garden Notes:</b>\n\n${noteList}`
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (text.startsWith("/start") || text.startsWith("/help")) {
      await sendTelegramReply(
        botToken,
        chatId,
        `🌱 <b>Garden Note Manager Bot</b>\n\n` +
          `📁 <b>Add Note:</b> Simply attach & send any <code>.md</code> file here.\n` +
          `🗑️ <b>Delete Note:</b> Send <code>/delete filename.md</code>\n` +
          `📚 <b>List Notes:</b> Send <code>/list</code>\n\n` +
          `🔒 <i>Only you (@${message.from?.username || "Owner"}) can use this bot.</i>`
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ status: "ignored" }, { status: 200 });
  } catch (error: any) {
    console.error("Telegram webhook handler error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
