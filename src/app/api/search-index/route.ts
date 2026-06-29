import { NextResponse } from "next/server";
import { listNotes } from "@/lib/notes";

export const dynamic = "force-dynamic";

/**
 * Returns a lightweight index of all notes (slug, title, description, tags,
 * path, wordCount, publishDate) for client-side Flexsearch indexing.
 * This enables instant search without per-keystroke server round-trips.
 */
export async function GET() {
  const notes = await listNotes();
  return NextResponse.json({
    notes: notes.map((n) => ({
      slug: n.slug,
      title: n.title,
      description: n.description,
      tags: n.tags,
      path: n.path,
      wordCount: n.wordCount,
      publishDate: n.publishDate,
    })),
  });
}
