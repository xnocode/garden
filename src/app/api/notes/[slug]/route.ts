import { NextResponse } from "next/server";
import { getNote } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const note = await getNote(slug);
  if (!note) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ note });
}
