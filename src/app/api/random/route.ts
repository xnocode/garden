import { NextResponse } from "next/server";
import { listNotes } from "@/lib/notes";

export const dynamic = "force-dynamic";

/**
 * Returns a random note slug (excluding the current one if `?except=` is given).
 * Used by the "Surprise me" discovery button on note pages.
 * Reads from the bundled notes.json — no database required.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const except = url.searchParams.get("except");
  const all = await listNotes();
  const notes = except ? all.filter((n) => n.slug !== except) : all;
  if (notes.length === 0) {
    return NextResponse.json({ error: "no notes" }, { status: 404 });
  }
  const random = notes[Math.floor(Math.random() * notes.length)];
  return NextResponse.json({ slug: random.slug, title: random.title });
}
