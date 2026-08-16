import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/private-notes
 * Lists all private notes (metadata only) for the admin. Private notes are
 * not in the static bundle, so this is the only way to discover them —
 * the UI shows this list at ?view=private for admin sessions.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const notes = await db.note.findMany({
      where: { visibility: "private" },
      select: {
        slug: true,
        title: true,
        description: true,
        wordCount: true,
        publishDate: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ notes });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch private notes" },
      { status: 500 }
    );
  }
}
