import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { hashOtp, isValidEmail, OTP_MAX_ATTEMPTS } from "@/lib/otp";

/**
 * Verify a 6-digit code and, on success, create a confirmed Supabase user
 * (role=client) so the client can immediately sign in. Idempotent-ish: if the
 * user already exists (e.g. retry), we treat a correct code as success.
 *
 * Body: { email, code, password, full_name }
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; code?: string; password?: string; full_name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").toLowerCase().trim();
  const code = (body.code || "").trim();
  const password = body.password || "";
  const fullName = (body.full_name || "").trim();

  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code sent to your email." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const supabase = getServerSupabase();

  // Find the latest unconsumed code for this email.
  const { data: otp } = await supabase
    .from("email_otps")
    .select("id, code_hash, attempts, consumed, expires_at")
    .eq("email", email)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) {
    return NextResponse.json({ error: "No active code. Please request a new one." }, { status: 400 });
  }
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    await supabase.from("email_otps").update({ consumed: true }).eq("id", otp.id);
    return NextResponse.json({ error: "This code has expired. Please request a new one." }, { status: 400 });
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await supabase.from("email_otps").update({ consumed: true }).eq("id", otp.id);
    return NextResponse.json({ error: "Too many attempts. Please request a new code." }, { status: 429 });
  }

  const matches = otp.code_hash === hashOtp(email, code);
  if (!matches) {
    await supabase.from("email_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  // Code is valid → consume it.
  await supabase.from("email_otps").update({ consumed: true }).eq("id", otp.id);

  // Create the confirmed user (or accept if they already exist).
  const { error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "client" },
  });

  if (createErr && !/already.*registered|already been registered|duplicate/i.test(createErr.message)) {
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }

  // Client signs in next (it has the password). Return success.
  return NextResponse.json({ ok: true });
}
