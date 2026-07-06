import crypto from "crypto";
import { brandedEmail } from "@/lib/emailLayout";

/** OTP settings. */
export const OTP_TTL_MINUTES = 15;
export const OTP_MAX_ATTEMPTS = 5;
/** Minimum seconds between sends to the same email (basic abuse guard). */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

/** Generate a cryptographically-random 6-digit code (no modulo bias). */
export function generateOtpCode(): string {
  // 0 – 999999, left-padded to 6 digits.
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

/** Hash a code with the email as salt so codes aren't stored in plaintext. */
export function hashOtp(email: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${email.toLowerCase().trim()}:${code}`)
    .digest("hex");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Send the OTP email via Resend. Falls back to a no-op (logging) when
 * RESEND_API_KEY is absent so the flow is testable in development.
 * Returns { delivered, devCode? } — devCode is only set in fallback mode.
 */
export async function sendOtpEmail(
  email: string,
  code: string
): Promise<{ delivered: boolean; devFallback: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || '"SPHOT Team" <onboarding@resend.dev>';

  if (!apiKey) {
    // Dev fallback: no key configured. Log so the flow can be exercised.
    console.warn(`[OTP][dev] No RESEND_API_KEY — code for ${email} is ${code}`);
    return { delivered: false, devFallback: true };
  }

  const subject = "Your SPHOT verification code";
  const html = brandedEmail({
    preheader: `Your verification code is ${code}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111111;">Verify your email</h1>
      <p style="margin:0 auto 24px;max-width:340px;color:#555555;font-size:14px;line-height:1.6;">
        Enter this code to continue your SPHOT booking. It expires in ${OTP_TTL_MINUTES} minutes.
      </p>
      <div style="display:inline-block;font-size:34px;font-weight:800;letter-spacing:10px;color:#111111;background:#f4f4f5;border-radius:14px;padding:18px 28px;">
        ${code}
      </div>
      <p style="margin:24px auto 0;max-width:340px;color:#999999;font-size:12px;line-height:1.6;">
        If you didn&rsquo;t request this, you can safely ignore this email.
      </p>`,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [email], subject, html, text: `Your SPHOT code: ${code} (expires in ${OTP_TTL_MINUTES} min)` }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[OTP] Resend failed (${res.status}): ${body}`);
    return { delivered: false, devFallback: false };
  }
  return { delivered: true, devFallback: false };
}
