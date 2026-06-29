import { listNotes, getTags } from "@/lib/notes";

export const dynamic = "force-dynamic";

const SITE_URL = "http://localhost:3000";

export async function GET() {
  const [notes, tags] = await Promise.all([
    listNotes(),
    getTags(),
  ]);

  const now = new Date().toISOString();

  const urls: string[] = [];
  // Home + views
  urls.push(
    `    <url><loc>${SITE_URL}/</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`
  );
  urls.push(
    `    <url><loc>${SITE_URL}/?view=index</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`
  );
  urls.push(
    `    <url><loc>${SITE_URL}/?view=graph</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`
  );
  urls.push(
    `    <url><loc>${SITE_URL}/?view=tags</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`
  );

  for (const n of notes) {
    const lastmod = n.publishDate ?? n.updatedAt;
    urls.push(
      `    <url><loc>${SITE_URL}/?p=${encodeURIComponent(
        n.slug
      )}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`
    );
  }

  for (const t of tags) {
    urls.push(
      `    <url><loc>${SITE_URL}/?tag=${encodeURIComponent(
        t.tag
      )}</loc><changefreq>weekly</changefreq><priority>0.4</priority></url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
