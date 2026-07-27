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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tgFetch(url: string, options: any = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 2500); // 2.5s timeout is plenty
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


function registerCommands(token: string) {
  tgFetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "note", description: "📝 Create a text note directly" },
        { command: "task", description: "📌 Add task(s) to Taskwarrior" },
        { command: "mytasks", description: "📋 View your pending task list" },
        { command: "done", description: "✅ Mark a task as done by ID" },
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

    const senderId = (cbq?.from?.id?.toString() || message.from?.id?.toString() || message.sender_chat?.id?.toString() || "").trim();
    const chatId = message.chat?.id;
    const rawText = (message.text?.trim() || cbq?.data || "").trim();
    const text = rawText.replace(/@\w+_bot/gi, "").trim();

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
    // 📄 FILE UPLOAD — Upload new or Update existing .md note
    // ═══════════════════════════════════════════════════════════════════
    if (message.document) {
      const doc = message.document;
      const fileName = doc.file_name || "untitled.md";

      if (!fileName.toLowerCase().endsWith(".md") && !fileName.toLowerCase().endsWith(".markdown")) {
        await sendMsg(token, chatId, `⚠️ Only <code>.md</code> files accepted.\n<i>"${escapeHtml(fileName)}"</i> rejected.`);
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
        const lines = snapshot.tasks.map((t) => {
          const pri = t.priority ? ` [<b>${t.priority}</b>]` : "";
          const flag = t.overdue ? " ⚠️" : "";
          const due = t.due ? `\n   📅 <i>${t.due.slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")}</i>` : "";
          return `<code>${t.id}</code> ${escapeHtml(t.description)}${pri}${flag}${due}`;
        });
        await sendMsg(
          token, chatId,
          `📋 <b>Tasks (${snapshot.tasks.length} visible, synced ${agoStr}):</b>\n\n` +
          lines.join("\n\n") +
          `\n\n<i>Mark done: <code>/done 2</code></i>`
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

    // ─── /done — Mark a task as done by ID ───────────────────────────────────
    if (text.startsWith("/done")) {
      const idStr = text.replace("/done", "").trim();
      const id = parseInt(idStr, 10);
      if (!idStr || isNaN(id) || id < 1) {
        await sendMsg(
          token, chatId,
          `⚠️ Usage: <code>/done 2</code>\n\n<i>Use <code>/mytasks</code> to see task IDs first.</i>`
        );
        return NextResponse.json({ ok: true });
      }

      await sendMsg(token, chatId, `⏳ Queuing task #${id} as done…`);

      after(async () => {
        try {
          const res = await addPendingDoneToGitHub([id]);
          if (res.success) {
            await sendMsg(
              token, chatId,
              `✅ <b>Task #${id} queued as done!</b>\n\n` +
              `<i>Next <code>bun run deploy</code> will mark it complete in WSL Taskwarrior \& update the website.</i>`
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
        `💡 <b>Garden Bot — Feature &amp; Command Guide</b>\n\n` +
        `📄 <b>1. Upload or Update Notes:</b>\n` +
        `• Send any <code>.md</code> file to publish it.\n` +
        `• Re-uploading an existing <code>.md</code> file <b>updates</b> it live!\n\n` +
        `📝 <b>2. Write Notes Directly:</b>\n` +
        `<code>/note Title Of Note\nBody content goes here... #tag</code>\n\n` +
        `📌 <b>3. Taskwarrior Tasks:</b>\n` +
        `• Add: <code>/task Buy milk due:today priority:H</code>\n` +
        `• Multi: <code>/tasks\n- Task 1 due:today\n- Task 2 due:tomorrow</code>\n` +
        `• View: <code>/mytasks</code> — See pending task list with IDs\n` +
        `• Done: <code>/done 2</code> — Queue task #2 as complete\n\n` +
        `📚 <b>4. Browse &amp; Manage Notes:</b>\n` +
        `• <code>/list</code> — View all notes\n` +
        `• <code>/search keyword</code> — Search notes\n` +
        `• <code>/link filename</code> — Get URL for a note\n` +
        `• <code>/delete file.md</code> — Delete a note\n` +
        `• <code>/stats</code> — View garden stats\n` +
        `• <code>/tags</code> — Explore tags\n\n` +
        `👇 Use the buttons below!`
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
