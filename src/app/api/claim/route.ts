import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSupabase } from "@/lib/supabaseServer";

/**
 * Consume a claim token: the photographer sets their email + password and takes
 * ownership of the seed profile. We update the existing auth user (same UUID, so
 * portfolio / public_code / bookings are preserved) with the real email + password
 * and mark it confirmed.
 *
 * GET  ?token=...  → validate token, return invited_email + photographer name.
 * POST { token, password } → apply the claim.
 */
function hashToken(t: string) {
  return crypto.createHash("sha256").update(t).digest("hex");
}

async function loadToken(supabase: ReturnType<typeof getServerSupabase>, token: string) {
  const { data } = await supabase
    .from("claim_tokens")
    .select("id, photographer_id, invited_email, consumed, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  return data;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const supabase = getServerSupabase();
  const t = await loadToken(supabase, token);
  if (!t || t.consumed || new Date(t.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invite is invalid or has expired." }, { status: 400 });
  }
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", t.photographer_id)
    .maybeSingle();
  return NextResponse.json({ ok: true, email: t.invited_email, name: prof?.full_name || "" });
}

export async function POST(req: NextRequest) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const token = body.token || "";
  const password = body.password || "";
  if (!token || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const t = await loadToken(supabase, token);
  if (!t || t.consumed || new Date(t.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invite is invalid or has expired." }, { status: 400 });
  }

  // Update the existing seed auth user → real email + chosen password, confirmed.
  const { error: updErr } = await supabase.auth.admin.updateUserById(t.photographer_id, {
    email: t.invited_email,
    password,
    email_confirm: true,
  });
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  await supabase.from("claim_tokens").update({ consumed: true }).eq("id", t.id);

  return NextResponse.json({ ok: true, email: t.invited_email });
}
