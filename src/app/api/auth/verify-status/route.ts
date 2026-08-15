import { NextResponse } from "next/server";
import { getVerificationState } from "@/lib/verification";
import { rateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/verify-status?email=...
 * Lets the sign-in modal tell "unverified account" apart from a wrong
 * password when NextAuth collapses both into a generic error.
 * Rate-limited: this endpoint otherwise allows account-enumeration probing.
 */
export async function GET(req: Request) {
  // 20 checks per 15 min per IP — enough for normal sign-in flows,
  // too slow for enumeration scripts.
  const limit = rateLimit(`verify-status:${getClientIp(req)}`, 20, 15 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const email = new URL(req.url).searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const state = await getVerificationState(email);
  return NextResponse.json(state);
}
