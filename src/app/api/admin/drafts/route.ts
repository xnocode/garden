import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/drafts
 * Returns all cloud drafts for the admin.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const drafts = await db.draft.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ drafts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch drafts" }, { status: 500 });
  }
}

/**
 * POST /api/admin/drafts
 * Cloud Auto-Save endpoint. Creates or updates a draft in Neon DB.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, title, content, tags, visibility } = body;

    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : typeof tags === "string" ? tags : "[]";
    const cleanVisibility = ["public", "members", "private"].includes(visibility) ? visibility : "public";

    let draft;
    if (id) {
      draft = await db.draft.upsert({
        where: { id },
        create: {
          id,
          title: title || "",
          content: content || "",
          tags: tagsJson,
          visibility: cleanVisibility,
        },
        update: {
          title: title || "",
          content: content || "",
          tags: tagsJson,
          visibility: cleanVisibility,
          updatedAt: new Date(),
        },
      });
    } else {
      draft = await db.draft.create({
        data: {
          title: title || "",
          content: content || "",
          tags: tagsJson,
          visibility: cleanVisibility,
        },
      });
    }

    return NextResponse.json({ success: true, draft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save draft" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/drafts
 * Deletes a draft by ID.
 */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing draft ID" }, { status: 400 });
    }

    await db.draft.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete draft" }, { status: 500 });
  }
}
