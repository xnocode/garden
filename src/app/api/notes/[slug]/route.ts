import { NextResponse } from "next/server";
import { getNote } from "@/lib/notes";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { NoteDetail } from "@/lib/notes";

export const dynamic = "force-dynamic";

/**
 * GET /api/notes/[slug]
 *
 * Public + members notes come from the static JSON bundle.
 * Private notes are NOT in the static bundle — they live only in the
 * database and are returned exclusively to a signed-in admin session.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Static notes (public + members)
  const note = await getNote(slug);
  if (note) {
    return NextResponse.json({ note });
  }

  // 2. Private notes — admin session required
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const row = await db.note.findUnique({ where: { slug } });
    if (!row || row.visibility !== "private") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const detail: NoteDetail = {
      slug: row.slug,
      title: row.title,
      description: row.description ?? null,
      author: null,
      tags: JSON.parse(row.tags || "[]"),
      aliases: JSON.parse(row.aliases || "[]"),
      wordCount: row.wordCount,
      visibility: "private",
      publishDate: row.publishDate ? row.publishDate.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      path: row.path,
      folder: row.folder,
      content: row.content,
      html: row.html,
      links: JSON.parse(row.links || "[]"),
      backlinks: [],
      related: [],
      prev: null,
      next: null,
    };

    return NextResponse.json({ note: detail });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
