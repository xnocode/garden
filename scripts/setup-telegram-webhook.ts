/**
 * Setup Telegram Bot Webhook
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

registerWebhook();
