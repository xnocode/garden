import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isTaskwarriorPublic, setTaskwarriorPublic } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const isPublic = await isTaskwarriorPublic();
    return NextResponse.json({ publicTasks: isPublic });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch task settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const publicTasks = Boolean(body.publicTasks);

    await setTaskwarriorPublic(publicTasks);

    return NextResponse.json({ success: true, publicTasks });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update task settings" },
      { status: 500 }
    );
  }
}
