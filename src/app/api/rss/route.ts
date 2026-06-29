import { listNotes } from "@/lib/notes";

export const dynamic = "force-static";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const notes = await listNotes({ sort: "newest", limit: 20 });

  // Use the request origin or fallback to env var
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";

  const items = notes
    .map((n) => {
      const url = `${siteUrl}/?p=${encodeURIComponent(n.slug)}`;
      const pubDate = n.publishDate
        ? new Date(n.publishDate).toUTCString()
        : new Date(n.createdAt).toUTCString();
      return `    <item>
      <title>${escapeXml(n.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(n.description ?? "")}</description>
      <pubDate>${pubDate}</pubDate>
${n.tags
  .map((t) => `      <category>${escapeXml(t)}</category>`)
  .join("\n")}
    </item>`;
    })
    .join("\n");

  const lastBuild = notes[0]?.publishDate
    ? new Date(notes[0].publishDate).toUTCString()
    : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>garden — a digital garden</title>
    <link>${siteUrl}</link>
    <description>Notes grown in Obsidian, published with a single command.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${siteUrl}/api/rss" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
