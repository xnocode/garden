import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filePath = resolve(process.cwd(), "src/data/task-analytics.json");

    try {
      const raw = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(raw);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: "Analytics data not yet generated. Run bun run publish." }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load analytics" },
      { status: 500 }
    );
  }
}
