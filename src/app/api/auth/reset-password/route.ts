import { NextResponse } from "next/server";
import { createPasswordHash } from "@/lib/auth";
import { checkResetToken, consumeResetToken } from "@/lib/password-reset";
import { rateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET ?token=... — validate the token without consuming it (page load check).
export async function GET(req: Request) {
  // 12 checks per 15 min per IP — stops reset-token guessing.
  const limit = rateLimit(`reset-check:${getClientIp(req)}`, 12, 15 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false, reason: "invalid" });
  }

  const check = await checkResetToken(token);
  return NextResponse.json(
    check.ok ? { valid: true } : { valid: false, reason: check.reason }
  );
}

// POST { token, password } — set the new password and burn the token.
export async function POST(req: Request) {
  try {
    // 8 attempts per 15 min per IP — stops password resets from being abused.
    const limit = rateLimit(`reset-post:${getClientIp(req)}`, 8, 15 * 60 * 1000);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and new password are required." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const result = await consumeResetToken(token, createPasswordHash(password));
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.reason === "expired"
              ? "This reset link has expired. Please request a new one."
              : "This reset link is invalid or has already been used. Please request a new one.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password updated. You can now sign in with your new password.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to reset the password." },
      { status: 500 }
    );
  }
}
