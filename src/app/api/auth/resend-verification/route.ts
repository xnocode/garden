import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueVerification } from "@/lib/verification";
import { sendVerificationEmail, isEmailServiceConfigured } from "@/lib/mailer";
import { rateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function baseUrlFromReq(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProto || "https"}://${forwardedHost}`;
  return process.env.NEXTAUTH_URL || new URL(req.url).origin;
}

/** POST /api/auth/resend-verification — body: { email } */
export async function POST(req: Request) {
  try {
    // 5 resends per hour per IP — each one may send an email.
    const limit = rateLimit(`resend:${getClientIp(req)}`, 5, 60 * 60 * 1000);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.user.findUnique({
      where: { email: cleanEmail },
      select: { emailVerified: true },
    });

    if (user?.emailVerified) {
      return NextResponse.json(
        { error: "This email is already verified. Please sign in." },
        { status: 400 }
      );
    }

    // Don't reveal whether the account exists — same response either way.
    const { otp, link } = await issueVerification(cleanEmail, baseUrlFromReq(req));
    await sendVerificationEmail(cleanEmail, otp, link);

    return NextResponse.json({
      success: true,
      emailSent: isEmailServiceConfigured(),
      message: `A new verification code was sent to ${cleanEmail}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to resend verification email." },
      { status: 500 }
    );
  }
}
