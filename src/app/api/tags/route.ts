import { NextResponse } from "next/server";
import { getTags } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function GET() {
  const tags = await getTags();
  return NextResponse.json({ tags });
}
