/**
 * mailer.ts — Transactional email via the Resend REST API (free tier).
 *
 * Requires RESEND_API_KEY (and optionally EMAIL_FROM) in env.
 * Without a key, emails are skipped and logged to the server console so
 * local dev still works (the OTP appears in the dev server logs).
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export function isEmailServiceConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[mailer] RESEND_API_KEY not set — skipping email to ${to}. Subject: ${subject}`);
    return false;
  }

  const from = process.env.EMAIL_FROM || "Garden <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[mailer] Resend error ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mailer] Failed to send email:", err);
    return false;
  }
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f6f8f4;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:14px;border:1px solid #e4e9e2;overflow:hidden;">
      <div style="padding:22px 32px;border-bottom:1px solid #edf1ec;">
        <span style="font-size:19px;color:#2e5339;">🌱 Garden</span>
      </div>
      <div style="padding:32px;color:#333;font-size:15px;line-height:1.65;">
        <h2 style="margin:0 0 14px;font-size:19px;color:#222;">${title}</h2>
        ${bodyHtml}
      </div>
      <div style="padding:16px 32px;border-top:1px solid #edf1ec;color:#8a9489;font-size:12px;">
        You received this email because someone used this address at the Garden.
        If it wasn't you, you can safely ignore it.
      </div>
    </div>
  </body>
</html>`;
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  verifyLink: string
): Promise<boolean> {
  const html = emailShell(
    "Verify your email",
    `<p>Use this 6-digit code to verify your account:</p>
     <div style="text-align:center;margin:22px 0;">
       <span style="display:inline-block;letter-spacing:8px;font-size:30px;font-weight:bold;color:#2e5339;background:#f0f5ef;border-radius:10px;padding:12px 22px;">${code}</span>
     </div>
     <p style="text-align:center;margin:24px 0;">
       <a href="${verifyLink}" style="background:#2e5339;color:#fff;text-decoration:none;padding:11px 24px;border-radius:9px;font-size:14px;display:inline-block;">Or click here to verify</a>
     </p>
     <p style="color:#777;font-size:13px;">This code expires in 15 minutes.</p>`
  );
  return sendEmail({ to, subject: `Your Garden verification code: ${code}`, html });
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<boolean> {
  const html = emailShell(
    "Reset your password",
    `<p>We received a request to reset the password for your Garden account.</p>
     <p style="text-align:center;margin:26px 0;">
       <a href="${resetLink}" style="background:#2e5339;color:#fff;text-decoration:none;padding:12px 26px;border-radius:9px;font-size:14px;display:inline-block;">Reset your password</a>
     </p>
     <p style="color:#777;font-size:13px;">This link expires in 15 minutes and can only be used once.
     If you didn't request this, you can safely ignore this email — your password stays unchanged.</p>`
  );
  return sendEmail({ to, subject: "Reset your Garden password", html });
}
