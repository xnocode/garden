import { NextResponse } from "next/server";
import { getGraph } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function GET() {
  const graph = await getGraph();
  return NextResponse.json(graph);
}
