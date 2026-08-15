import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/markdown";
import { commitNoteToGitHub } from "@/lib/telegram-file-handler";

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

    const now = new Date();
    const tagsYaml = cleanTags.length > 0 ? `\ntags: [${cleanTags.map((t: string) => `"${t}"`).join(", ")}]` : "\ntags: []";
    const raw = `---
title: "${cleanTitle}"
author: Ridoy
visibility: ${cleanVisibility}
draft: false
date: ${now.toISOString().split("T")[0]}
updatedAt: ${now.toISOString().split("T")[0]}${tagsYaml}
---

${cleanContent}`;

    // Commit file directly to GitHub repository (triggers Vercel build)
    const ghRes = await commitNoteToGitHub(`${slug}.md`, raw, false);

    // If draft was converted to published note, clean up draft if DB is present
    if (draftId) {
      try {
        const { db } = await import("@/lib/db");
        await db.draft.delete({ where: { id: draftId } });
      } catch {
        // Draft already deleted or not found
      }
    }

    if (!ghRes.success && !ghRes.message?.includes("skipped GitHub upload")) {
      return NextResponse.json({ error: ghRes.message || "Failed to commit note to GitHub" }, { status: 500 });
    }

    return NextResponse.json({ success: true, slug, message: "Note published and committed to GitHub!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to publish note" }, { status: 500 });
  }
}
