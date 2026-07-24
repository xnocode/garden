import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const event = req.headers.get("x-github-event");
    const payload = await req.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { message: "Telegram credentials not configured on server" },
        { status: 200 }
      );
    }

    let text = "";

    if (event === "fork") {
      const forkee = payload.forkee;
      const sender = payload.sender;
      text = `🚨 <b>Garden Repository Forked!</b>\n\n` +
        `👤 <b>User:</b> <a href="${sender?.html_url}">@${sender?.login}</a>\n` +
        `🍴 <b>Forked Repo:</b> <a href="${forkee?.html_url}">${forkee?.full_name}</a>\n` +
        `📦 <b>Original:</b> ${payload.repository?.full_name}`;
    } else if (event === "star" || event === "watch") {
      const sender = payload.sender;
      text = `⭐ <b>Repository Starred!</b>\n\n` +
        `👤 <b>User:</b> <a href="${sender?.html_url}">@${sender?.login}</a> starred your garden repository.`;
    } else if (event === "pull_request") {
      const pr = payload.pull_request;
      const sender = payload.sender;
      text = `🔀 <b>Pull Request ${payload.action}!</b>\n\n` +
        `👤 <b>User:</b> @${sender?.login}\n` +
        `📝 <b>Title:</b> ${pr?.title}\n` +
        `🔗 <b>Link:</b> <a href="${pr?.html_url}">${pr?.html_url}</a>`;
    }

    if (text) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          parse_mode: "HTML",
          text,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("GitHub webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
