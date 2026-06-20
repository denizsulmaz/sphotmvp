import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import {
  generateOtpCode,
  hashOtp,
  isValidEmail,
  sendOtpEmail,
  OTP_TTL_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/otp";

/**
 * Issue a 6-digit email verification code (expires in OTP_TTL_MINUTES).
 * Stores a hashed code in public.email_otps (service role) and emails it via Resend.
 * In dev (no RESEND_API_KEY) the code is logged and returned as `devCode`.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").toLowerCase().trim();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabase = getServerSupabase();
  await supabase.rpc("purge_expired_otps").then(() => {}, () => {});

  // Cooldown: block rapid re-sends to the same email.
  const { data: recent } = await supabase
    .from("email_otps")
    .select("created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent?.created_at) {
    const ageMs = Date.now() - new Date(recent.created_at).getTime();
    if (ageMs < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      const wait = Math.ceil((OTP_RESEND_COOLDOWN_SECONDS * 1000 - ageMs) / 1000);
      return NextResponse.json(
        { error: `Please wait ${wait}s before requesting another code.` },
        { status: 429 }
      );
    }
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  // Invalidate prior unconsumed codes for this email, then insert the new one.
  await supabase.from("email_otps").update({ consumed: true }).eq("email", email).eq("consumed", false);
  const { error: insErr } = await supabase.from("email_otps").insert({
    email,
    code_hash: hashOtp(email, code),
    purpose: "signup",
    expires_at: expiresAt,
  });
  if (insErr) {
    return NextResponse.json({ error: "Could not issue a code. Try again." }, { status: 500 });
  }

  const { delivered, devFallback } = await sendOtpEmail(email, code);

  return NextResponse.json({
    ok: true,
    delivered,
    expiresInMinutes: OTP_TTL_MINUTES,
    // Only surfaced when no email provider is configured (development).
    ...(devFallback ? { devCode: code } : {}),
  });
}
