import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderMarkdown, slugify } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, tags = [], visibility = "public", draftId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const cleanTitle = title.trim();
    const cleanContent = content || "";
    const cleanTags = Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",").map((t: string) => t.trim().replace(/^#/, "")).filter(Boolean) : [];
    const cleanVisibility = ["public", "members", "private"].includes(visibility) ? visibility : "public";

    // Generate unique slug
    let slug = slugify(cleanTitle);
    if (!slug) slug = `note-${Date.now()}`;

    // Render markdown to HTML
    const renderResult = await renderMarkdown(cleanContent, {
      slugs: new Set([slug]),
      aliasToSlug: new Map(),
      noteMeta: new Map(),
      assetBase: "",
    });

    const now = new Date();
    const tagsJson = JSON.stringify(cleanTags);
    const linksJson = JSON.stringify(renderResult.links || []);

    // Construct raw markdown with YAML frontmatter
    const tagsYaml = cleanTags.length > 0 ? `\ntags: [${cleanTags.map((t: string) => `"${t}"`).join(", ")}]` : "\ntags: []";
    const raw = `---
title: "${cleanTitle}"
author: Ridoy
visibility: ${cleanVisibility}
date: ${now.toISOString().split("T")[0]}
updatedAt: ${now.toISOString().split("T")[0]}${tagsYaml}
---

${cleanContent}`;

    // Save/upsert note in Neon DB
    const note = await db.note.upsert({
      where: { slug },
      create: {
        slug,
        title: cleanTitle,
        description: cleanContent.slice(0, 160).replace(/[#*`_[\]]/g, "").trim(),
        content: cleanContent,
        html: renderResult.html,
        raw,
        tags: tagsJson,
        aliases: "[]",
        links: linksJson,
        wordCount: renderResult.wordCount || cleanContent.trim().split(/\s+/).filter(Boolean).length,
        draft: false,
        visibility: cleanVisibility,
        publishDate: now,
        createdAt: now,
        updatedAt: now,
        path: `${slug}.md`,
        folder: null,
      },
      update: {
        title: cleanTitle,
        description: cleanContent.slice(0, 160).replace(/[#*`_[\]]/g, "").trim(),
        content: cleanContent,
        html: renderResult.html,
        raw,
        tags: tagsJson,
        links: linksJson,
        wordCount: renderResult.wordCount || cleanContent.trim().split(/\s+/).filter(Boolean).length,
        visibility: cleanVisibility,
        updatedAt: now,
      },
    });

    // If draft was converted to published note, delete the draft
    if (draftId) {
      try {
        await db.draft.delete({ where: { id: draftId } });
      } catch {
        // Draft already deleted or not found
      }
    }

    return NextResponse.json({ success: true, slug: note.slug });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to publish note" }, { status: 500 });
  }
}
