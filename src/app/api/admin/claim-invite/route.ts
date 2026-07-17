import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSupabase } from "@/lib/supabaseServer";
import { brandedEmail } from "@/lib/emailLayout";

/**
 * Admin action: issue a profile-claim invite for a seed photographer.
 * Generates a one-time token (7-day expiry), stores its hash, and emails the
 * photographer a claim link via Resend (dev fallback returns the link).
 *
 * Body: { access_token, photographer_id, email }
 * Authenticated by passing the caller's Supabase access_token; we verify the
 * caller is an admin before doing anything.
 */
const CLAIM_TTL_DAYS = 7;

export async function POST(req: NextRequest) {
  let body: { access_token?: string; photographer_id?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { access_token, photographer_id } = body;
  const email = (body.email || "").toLowerCase().trim();
  if (!access_token || !photographer_id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const supabase = getServerSupabase();

  // Verify caller is an admin.
  const { data: userData, error: userErr } = await supabase.auth.getUser(access_token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get("host")}`;

  // Ensure the target is a real photographer profile.
  const { data: dbPh } = await supabase
    .from("photographer_profiles")
    .select(`
      id, 
      public_code, 
      profiles:id ( full_name, avatar_url )
    `)
    .eq("id", photographer_id)
    .maybeSingle();
  if (!dbPh) {
    return NextResponse.json({ error: "Photographer not found." }, { status: 404 });
  }

  const ph = dbPh as any;
  const profileInfo = Array.isArray(ph.profiles) ? ph.profiles[0] : ph.profiles;
  const photoName = profileInfo?.full_name || "Photographer";
  const avatarUrl = profileInfo?.avatar_url || "https://booksphot.com/media/default-profile.webp";
  const profileUrl = `${siteUrl}/p/${ph.public_code}`;

  // Generate token + store hash.
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + CLAIM_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Invalidate prior unconsumed invites for this photographer.
  await supabase.from("claim_tokens").update({ consumed: true }).eq("photographer_id", photographer_id).eq("consumed", false);
  const { error: insErr } = await supabase.from("claim_tokens").insert({
    photographer_id,
    token_hash: tokenHash,
    invited_email: email,
    expires_at: expiresAt,
  });
  if (insErr) {
    return NextResponse.json({ error: "Could not create invite." }, { status: 500 });
  }

  const claimUrl = `${siteUrl}/claim/${token}`;

  // Email via Resend (dev fallback: return the link).
  const apiKey = process.env.RESEND_API_KEY;
  const rawFrom = process.env.RESEND_FROM || '"SPHOT Team" <onboarding@resend.dev>';
  const from = rawFrom.includes("<")
    ? `"SPHOT Team" ${rawFrom.substring(rawFrom.indexOf("<"))}`
    : '"SPHOT Team" <team@email.booksphot.com>';

  if (apiKey) {
    let sendError: string | null = null;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Claim your SPHOT profile (${photoName})`,
        html: brandedEmail({
          preheader: "You've been invited to manage your SPHOT profile.",
          bodyHtml: `
            <div style="text-align:center;margin-bottom:24px;">
              <img src="${avatarUrl}" width="70" height="70" style="border-radius:50%;object-fit:cover;border:2px solid #000000;display:inline-block;" />
              <h2 style="margin:12px 0 2px;font-size:18px;font-weight:800;color:#111111;">${photoName}</h2>
              <p style="margin:0;font-size:13px;color:#888888;">
                <a href="${profileUrl}" style="color:#000000;font-weight:bold;text-decoration:underline;">booksphot.com/p/${ph.public_code}</a>
              </p>
            </div>
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111111;text-align:center;">Claim your profile</h1>
            <p style="margin:0 auto 24px;max-width:360px;color:#555555;font-size:14px;line-height:1.6;text-align:center;">
              You&rsquo;ve been invited to manage your photographer profile on SPHOT. Set your password to take ownership. Your portfolio and bookings are already set up.
            </p>
            <div style="text-align:center;margin-bottom:20px;">
              <a href="${claimUrl}" style="display:inline-block;background:#000000;color:#fffa6c;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:800;font-size:14px;">
                Claim my profile
              </a>
            </div>
            <p style="margin:24px auto 0;max-width:360px;color:#999999;font-size:12px;line-height:1.6;text-align:center;">
              This link expires in ${CLAIM_TTL_DAYS} days. If you weren&rsquo;t expecting this, you can ignore this email.
            </p>`,
        }),
        text: `Claim your SPHOT profile: ${claimUrl} (expires in ${CLAIM_TTL_DAYS} days)`,
      }),
    }).catch((e) => {
      console.error("[claim-invite] resend:", e);
      sendError = e?.message || "Network error while sending the invite email.";
      return null;
    });

    if (!sendError && res && !res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[claim-invite] resend failed:", res.status, detail);
      sendError = `Resend returned ${res.status}.`;
    }

    if (sendError) {
      // Roll back: mark the just-created token consumed so the admin can retry cleanly.
      await supabase
        .from("claim_tokens")
        .update({ consumed: true })
        .eq("token_hash", tokenHash);
      return NextResponse.json(
        { error: `The invite email failed to send (${sendError}) The invite token was rolled back — please retry.` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    ...(apiKey ? {} : { devClaimUrl: claimUrl }),
  });
}
