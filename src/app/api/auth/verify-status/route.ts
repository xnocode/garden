import { NextResponse } from "next/server";
import { getVerificationState } from "@/lib/verification";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/verify-status?email=...
 * Lets the sign-in modal tell "unverified account" apart from a wrong
 * password when NextAuth collapses both into a generic error.
 */
export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const state = await getVerificationState(email);
  return NextResponse.json(state);
}
