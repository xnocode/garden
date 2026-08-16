import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY diagnostic route — remove after debugging.
 * Reports whether DATABASE_URL is present and whether a DB query works.
 */
export async function GET() {
  const url = process.env.DATABASE_URL;
  const hasUrl = Boolean(url);
  const masked = url
    ? url.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@").slice(0, 60)
    : null;

  if (!hasUrl) {
    return NextResponse.json({ hasUrl: false, error: "DATABASE_URL not set" });
  }

  try {
    const { db } = await import("@/lib/db");
    const count = await db.note.count();
    const priv = await db.note.count({ where: { visibility: "private" } });
    return NextResponse.json({
      hasUrl: true,
      maskedUrl: masked,
      totalNotes: count,
      privateNotes: priv,
    });
  } catch (e: any) {
    return NextResponse.json({
      hasUrl: true,
      maskedUrl: masked,
      error: e?.message ?? String(e),
    });
  }
}
