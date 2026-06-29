import { NextRequest, NextResponse } from "next/server";
import { listNotes } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tag = searchParams.get("tag") ?? undefined;
  const folder = searchParams.get("folder") ?? undefined;
  const sort = (searchParams.get("sort") as any) ?? undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : undefined;
  const notes = await listNotes({ tag, folder, sort, limit });
  return NextResponse.json({ notes });
}
