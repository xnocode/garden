/**
 * Setup Telegram Bot Webhook + Register Bot Commands
 *
 * Usage:
 *   bun run scripts/setup-telegram-webhook.ts https://your-domain.vercel.app
 */

const domain = process.argv[2];

if (!domain) {
  console.log("\n❌ Please provide your deployed domain URL.");
  console.log("Example: bun run scripts/setup-telegram-webhook.ts https://your-garden.vercel.app\n");
  process.exit(1);
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error("\n❌ Error: TELEGRAM_BOT_TOKEN environment variable is not set.");
  console.log("Please set TELEGRAM_BOT_TOKEN in your .env or environment before running.\n");
  process.exit(1);
}
const webhookUrl = `${domain.replace(/\/$/, "")}/api/webhooks/telegram`;

const BOT_COMMANDS = [
  { command: "scantask", description: "📸 Scan notebook page → add tasks" },
  { command: "scandone", description: "✅ Scan notebook page → mark done" },
  { command: "mytasks",  description: "📋 View your pending task list" },
  { command: "task",     description: "📌 Add task(s) to Taskwarrior" },
  { command: "vtask",    description: "🎙️ Send voice → AI adds to Taskwarrior tasks" },
  { command: "ask",      description: "🧠 Ask AI about your notes & tasks" },
  { command: "digest",   description: "☀️ Morning digest: tasks + notes + AI tip" },
  { command: "voice",    description: "🎙️ Send voice → AI creates a published note" },
  { command: "dump",     description: "💬 Organize raw messy text to AI note" },
  { command: "append",   description: "📝 Append text to an existing note" },
  { command: "note",     description: "✏️ Create a text note directly" },
  { command: "done",     description: "✅ Mark a task as done by number" },
  { command: "list",     description: "📚 List published notes" },
  { command: "search",   description: "🔍 Search notes" },
  { command: "stats",    description: "📊 Garden statistics" },
  { command: "help",     description: "💡 Full help guide" },
];

async function registerWebhook() {
  console.log(`\n  📡 Registering Telegram Webhook to: ${webhookUrl}\n`);
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log("  ✅ Webhook registered successfully!");
      console.log(`  Description: ${data.description || "Success"}\n`);
    } else {
      console.error("  ❌ Failed to register webhook:", data);
    }
  } catch (e: any) {
    console.error("  ❌ Error:", e.message);
  }
}

async function registerCommands() {
  console.log(`  📋 Registering ${BOT_COMMANDS.length} bot commands with Telegram...\n`);
  try {
    const res1 = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: BOT_COMMANDS }),
    });
    const res2 = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: BOT_COMMANDS, scope: { type: "all_private_chats" } }),
    });
    const data = await res1.json();
    if (data.ok) {
      console.log("  ✅ Bot commands registered for default & private chats!\n");
      console.log("  Registered commands:");
      BOT_COMMANDS.forEach((c) => console.log(`    /${c.command} — ${c.description}`));
      console.log();
    } else {
      console.error("  ❌ Failed to register commands:", data);
    }
  } catch (e: any) {
    console.error("  ❌ Error:", e.message);
  }
}


await registerWebhook();
await registerCommands();

export {};
