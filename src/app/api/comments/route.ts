import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const noteSlug = searchParams.get("noteSlug");

    if (!noteSlug) {
      return NextResponse.json(
        { error: "noteSlug query parameter is required." },
        { status: 400 }
      );
    }

    const comments = await db.comment.findMany({
      where: {
        noteSlug,
        parentId: null, // top-level comments
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load comments." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be signed in to post a comment." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { noteSlug, content, parentId } = body;

    if (!noteSlug || !content || !content.trim()) {
      return NextResponse.json(
        { error: "Note slug and comment content are required." },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email;

    // Find or create user record
    let userRecord = await db.user.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      },
    });

    if (!userRecord && userEmail) {
      const adminEmails = (process.env.ADMIN_EMAIL || "")
        .toLowerCase()
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      const isAdmin = adminEmails.includes(userEmail.toLowerCase());
      userRecord = await db.user.create({
        data: {
          email: userEmail,
          name: session.user.name || userEmail.split("@")[0],
          image: session.user.image,
          role: isAdmin ? "admin" : "member",
        },
      });
    }

    if (!userRecord) {
      return NextResponse.json(
        { error: "User profile could not be found." },
        { status: 404 }
      );
    }

    const newComment = await db.comment.create({
      data: {
        noteSlug,
        content: content.trim(),
        userId: userRecord.id,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to post comment." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("id");

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID required." },
        { status: 400 }
      );
    }

    const comment = await db.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found." },
        { status: 404 }
      );
    }

    const currentUserId = (session.user as any).id;
    const currentUserRole = (session.user as any).role;
    const isAuthor = comment.userId === currentUserId;
    const isAdmin = currentUserRole === "admin";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "You do not have permission to delete this comment." },
        { status: 403 }
      );
    }

    await db.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete comment." },
      { status: 500 }
    );
  }
}
