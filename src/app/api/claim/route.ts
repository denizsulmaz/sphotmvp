import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSupabase } from "@/lib/supabaseServer";
import { sendNotificationEmail } from "@/lib/notify";

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
  let claimError: string | null = null;
  const { error: updErr } = await supabase.auth.admin.updateUserById(t.photographer_id, {
    email: t.invited_email,
    password,
    email_confirm: true,
  });

  if (updErr) {
    // If the user doesn't exist in auth.users yet, create them with the pre-allocated photographer UUID
    const { error: createErr } = await supabase.auth.admin.createUser({
      id: t.photographer_id,
      email: t.invited_email,
      password: password,
      email_confirm: true,
    });
    if (createErr) {
      claimError = createErr.message || "Failed to configure user profile password.";
    }
  }

  if (claimError) {
    return NextResponse.json({ error: claimError }, { status: 400 });
  }

  await supabase.from("claim_tokens").update({ consumed: true }).eq("id", t.id);

  // 1. Fetch photographer name
  const { data: photoProf } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", t.photographer_id)
    .maybeSingle();
  const photoName = photoProf?.full_name || "Photographer";

  // 2. Resolve admin profile to act as the "someone" sending the welcome text
  const { data: adminProf } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  // If no admin, default to a null UUID so the database accepts it
  const adminId = adminProf?.id || "00000000-0000-0000-0000-000000000000";

  // 3. Create a welcome onboarding booking
  const { data: welcomeBooking, error: bkgErr } = await supabase
    .from("bookings")
    .insert({
      client_id: adminId,
      photographer_id: t.photographer_id,
      slot_id: null, // slotless onboarding chat
      status: "booking",
      fee_krw: 0,
      shoot_location: "SPHOT Onboarding Chat",
      details: "Welcome onboarding conversation",
    })
    .select()
    .single();

  if (!bkgErr && welcomeBooking) {
    // 4. Insert welcome text message from the admin
    await supabase.from("messages").insert({
      booking_id: welcomeBooking.id,
      sender_id: adminId,
      content: `Welcome to SPHOT! Your photographer profile has been claimed successfully. You can manage your calendar, update your portfolio, and coordinate with clients directly here. Let us know if you have any questions!`,
    });
  } else {
    console.error("[claim] Failed to create welcome chat:", bkgErr?.message);
  }

  // 5. Notify hi@booksphot.com about the claimed profile
  const subject = `[SPHOT] Photographer Profile Claimed - ${photoName}`;
  const textContent = `Photographer profile has been successfully claimed by:\nName: ${photoName}\nEmail: ${t.invited_email}\nPhotographer ID: ${t.photographer_id}`;
  const htmlContent = `
    <h2>Photographer Profile Claimed</h2>
    <p><strong>Name:</strong> ${photoName}</p>
    <p><strong>Email:</strong> ${t.invited_email}</p>
    <p><strong>Photographer ID:</strong> ${t.photographer_id}</p>
    <hr/>
    <p><em>SPHOT Alerts System</em></p>
  `;
  await sendNotificationEmail(subject, htmlContent, textContent);

  return NextResponse.json({ ok: true, email: t.invited_email });
}
