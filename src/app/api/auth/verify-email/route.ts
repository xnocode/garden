import { NextResponse } from "next/server";
import { verifyWithToken, verifyWithOtp } from "@/lib/verification";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify-email
 * Body: { token } (from the emailed link)  OR  { email, otp } (6-digit code)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, email, otp } = body;

    const result = token
      ? await verifyWithToken(String(token))
      : email && otp
        ? await verifyWithOtp(String(email), String(otp))
        : { ok: false as const, reason: "invalid" as const };

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.reason === "expired"
              ? "This verification code has expired. Please request a new one."
              : "Invalid verification code. Please check and try again.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified! You can now sign in to your account.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Verification failed." },
      { status: 500 }
    );
  }
}
