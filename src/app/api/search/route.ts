import { NextRequest, NextResponse } from "next/server";
import { searchNotes } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchNotes(q);
  return NextResponse.json({ query: q, results });
}
