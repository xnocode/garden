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

// All bot commands to register (Telegram shows these in reverse, so put most important LAST)
const BOT_COMMANDS = [
  { command: "help",     description: "❓ Show all available commands" },
  { command: "search",   description: "🔍 Search your notes" },
  { command: "stats",    description: "📊 View Garden stats" },
  { command: "digest",   description: "🌅 Get your morning digest / daily summary" },
  { command: "ask",      description: "💡 Ask a question about your Garden knowledge base" },
  { command: "dump",     description: "🧠 Dump raw text/voice → AI formats it into a note" },
  { command: "note",     description: "📝 Start a new written note" },
  { command: "voice",    description: "🎙️ Record a voice message to create a note" },
  { command: "vtask",    description: "🎙️ Record a voice message to add tasks" },
  { command: "tasks",    description: "📋 View your active Taskwarrior tasks" },
  { command: "scandone", description: "✅ Scan page with ticked tasks → mark done in Taskwarrior" },
  { command: "scantask", description: "📸 Scan handwritten notebook page → add tasks to Taskwarrior" },
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
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: BOT_COMMANDS }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log("  ✅ Bot commands registered! They will now appear when users type '/' in Telegram.\n");
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
