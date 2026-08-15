import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issuePasswordReset } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

function baseUrlFromReq(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProto || "https"}://${forwardedHost}`;
  return process.env.NEXTAUTH_URL || new URL(req.url).origin;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Only send if a verified credentials account exists — but the response
    // is identical either way so attackers can't probe registered emails.
    const user = await db.user.findUnique({
      where: { email },
      select: { passwordHash: true },
    });

    if (user?.passwordHash) {
      const { link } = await issuePasswordReset(email, baseUrlFromReq(req));
      await sendPasswordResetEmail(email, link);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to process the request." },
      { status: 500 }
    );
  }
}
