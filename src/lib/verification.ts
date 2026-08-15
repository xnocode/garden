/**
 * verification.ts — Email verification tokens + OTP codes.
 *
 * Two verification paths share one row in VerificationToken:
 *   - Link:  random 32-byte token (sha256-hashed at rest), embedded in URL
 *   - OTP:   6-digit code (hashed at rest), typed by the user
 * Both expire after 15 minutes; the row is deleted once used.
 */

import crypto from "node:crypto";
import { db } from "@/lib/db";

const EXPIRY_MS = 15 * 60 * 1000;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export interface IssuedVerification {
  otp: string;
  token: string;
  link: string;
}

/** Create a fresh verification for an email (replaces any previous one). */
export async function issueVerification(email: string, baseUrl: string): Promise<IssuedVerification> {
  const identifier = email.toLowerCase().trim();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const otp = generateOtp();

  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: sha256(rawToken),
      otp: sha256(otp),
      expires: new Date(Date.now() + EXPIRY_MS),
    },
  });

  return {
    otp,
    token: rawToken,
    link: `${baseUrl.replace(/\/$/, "")}/verify-email?token=${rawToken}`,
  };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" };

/** Mark the user verified and burn the token row. */
async function completeVerification(identifier: string): Promise<void> {
  await db.user.update({
    where: { email: identifier },
    data: { emailVerified: new Date() },
  });
  await db.verificationToken.deleteMany({ where: { identifier } });
}

/** Verify via the emailed link token. */
export async function verifyWithToken(rawToken: string): Promise<VerifyResult> {
  const record = await db.verificationToken.findUnique({
    where: { token: sha256(rawToken) },
  });
  if (!record) return { ok: false, reason: "invalid" };
  if (record.expires < new Date()) {
    await db.verificationToken.deleteMany({ where: { identifier: record.identifier } });
    return { ok: false, reason: "expired" };
  }
  await completeVerification(record.identifier);
  return { ok: true };
}

/** Verify via the 6-digit OTP for a given email. */
export async function verifyWithOtp(email: string, otp: string): Promise<VerifyResult> {
  const identifier = email.toLowerCase().trim();
  if (!/^\d{6}$/.test(otp)) return { ok: false, reason: "invalid" };

  const records = await db.verificationToken.findMany({ where: { identifier } });
  const record = records.find((r) => r.otp === sha256(otp));
  if (!record) return { ok: false, reason: "invalid" };
  if (record.expires < new Date()) {
    await db.verificationToken.deleteMany({ where: { identifier } });
    return { ok: false, reason: "expired" };
  }
  await completeVerification(identifier);
  return { ok: true };
}

/** Account existence + verification state (used to tailor sign-in errors). */
export async function getVerificationState(
  email: string
): Promise<{ exists: boolean; verified: boolean }> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { emailVerified: true },
  });
  return { exists: Boolean(user), verified: Boolean(user?.emailVerified) };
}
