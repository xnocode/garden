/**
 * password-reset.ts — Single-use password reset tokens.
 *
 * Random 32-byte token (sha256-hashed at rest), emailed as a link.
 * Expires after 15 minutes; the row is deleted once used.
 */

import crypto from "node:crypto";
import { db } from "@/lib/db";

const EXPIRY_MS = 15 * 60 * 1000;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Create a fresh reset token for an email (replaces any previous one). */
export async function issuePasswordReset(
  email: string,
  baseUrl: string
): Promise<{ token: string; link: string }> {
  const identifier = email.toLowerCase().trim();
  const rawToken = crypto.randomBytes(32).toString("hex");

  await db.passwordResetToken.deleteMany({ where: { identifier } });
  await db.passwordResetToken.create({
    data: {
      identifier,
      token: sha256(rawToken),
      expires: new Date(Date.now() + EXPIRY_MS),
    },
  });

  return {
    token: rawToken,
    link: `${baseUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`,
  };
}

export type ResetCheck =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid" | "expired" };

/** Validate a token WITHOUT consuming it (used by the reset page on load). */
export async function checkResetToken(rawToken: string): Promise<ResetCheck> {
  const record = await db.passwordResetToken.findUnique({
    where: { token: sha256(rawToken) },
  });
  if (!record) return { ok: false, reason: "invalid" };
  if (record.expires < new Date()) {
    await db.passwordResetToken.deleteMany({ where: { identifier: record.identifier } });
    return { ok: false, reason: "expired" };
  }
  return { ok: true, email: record.identifier };
}

/** Validate the token, set the new password, and burn the token row. */
export async function consumeResetToken(
  rawToken: string,
  newPasswordHash: string
): Promise<ResetCheck> {
  const check = await checkResetToken(rawToken);
  if (!check.ok) return check;

  await db.user.update({
    where: { email: check.email },
    data: { passwordHash: newPasswordHash },
  });
  await db.passwordResetToken.deleteMany({ where: { identifier: check.email } });

  return check;
}
