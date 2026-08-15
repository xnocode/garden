import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPasswordHash } from "@/lib/auth";
import { isAllowedEmailDomain } from "@/lib/email-validator";
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

export async function POST(req: Request) {
  try {
    // 5 signups per hour per IP — each one triggers a verification email.
    const limit = rateLimit(`register:${getClientIp(req)}`, 5, 60 * 60 * 1000);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isAllowedEmailDomain(cleanEmail)) {
      return NextResponse.json(
        {
          error:
            "Please use a trusted email provider (Gmail, Outlook, Yahoo, iCloud, Proton). Educational (.edu) and disposable emails are not supported.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      if (!existing.emailVerified) {
        // Account exists but was never verified — re-send the code so the
        // user can finish signup instead of being stuck.
        const { otp, link } = await issueVerification(cleanEmail, baseUrlFromReq(req));
        await sendVerificationEmail(cleanEmail, otp, link);
        return NextResponse.json(
          {
            success: true,
            needsVerification: true,
            emailSent: isEmailServiceConfigured(),
            message:
              "This email has an unverified account. We've sent a fresh verification code — enter it below to activate your account.",
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const role = adminEmail && cleanEmail === adminEmail ? "admin" : "member";
    const passwordHash = createPasswordHash(password);

    await db.user.create({
      data: {
        email: cleanEmail,
        name: (name || cleanEmail.split("@")[0]).trim(),
        passwordHash,
        role,
        emailVerified: null,
      },
      select: { id: true },
    });

    const { otp, link } = await issueVerification(cleanEmail, baseUrlFromReq(req));
    await sendVerificationEmail(cleanEmail, otp, link);

    return NextResponse.json(
      {
        success: true,
        needsVerification: true,
        emailSent: isEmailServiceConfigured(),
        message: `Account created. We sent a 6-digit verification code to ${cleanEmail}. Enter it below to verify your account.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create account." },
      { status: 500 }
    );
  }
}
