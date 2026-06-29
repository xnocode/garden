import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Returns a random note slug (excluding the current one if `?except=` is given).
 * Used by the "random note" discovery button on note pages.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const except = url.searchParams.get("except");
  const notes = await db.note.findMany({
    select: { slug: true, title: true },
    where: except ? { slug: { not: except } } : undefined,
  });
  if (notes.length === 0) {
    return NextResponse.json({ error: "no notes" }, { status: 404 });
  }
  const random = notes[Math.floor(Math.random() * notes.length)];
  return NextResponse.json(random);
}
