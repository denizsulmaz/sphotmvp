import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { sendNotificationEmail } from "@/lib/notify";

/**
 * Mark a booking refunded. **Admin-only and reason-required** — there is no
 * automatic refund anywhere in the app. An admin reviews the booking (in the
 * admin Refunds queue), types a reason, and calls this.
 *
 * Payments are removed from the product, so this is a DB-only action — no
 * external money movement. Side effects:
 *   - writes a `refunds` audit row (who / why / amount),
 *   - sets the booking to 'refunded' and releases its slot(s),
 *   - posts a system message into the chat.
 *
 * Body: { access_token, booking_id, reason }
 */

export async function POST(req: NextRequest) {
  let body: { access_token?: string; booking_id?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { access_token, booking_id } = body;
  const reason = (body.reason || "").trim();
  if (!access_token || !booking_id) {
    return NextResponse.json(
      { error: "access_token and booking_id are required." },
      { status: 400 }
    );
  }
  if (reason.length < 3) {
    return NextResponse.json(
      { error: "A refund reason is required." },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();

  // ── Authenticate + require admin. ──
  const { data: userData, error: userErr } = await supabase.auth.getUser(access_token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const adminId = userData.user.id;
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", adminId)
    .single();
  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  // ── Load the booking. ──
  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, status, fee_krw, slot_id, extra_slot_ids, client_id, photographer_id")
    .eq("id", booking_id)
    .single();
  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  // Idempotency: already refunded → return success without re-charging.
  if (booking.status === "refunded") {
    return NextResponse.json({ ok: true, status: "refunded", alreadyDone: true });
  }

  // Only a charged booking can be refunded.
  const refundable = ["paid", "confirmed", "completed", "cancellation_requested"].includes(
    booking.status
  );
  if (!refundable) {
    return NextResponse.json(
      { error: `Cannot refund a booking in status '${booking.status}'.` },
      { status: 422 }
    );
  }

  // Payments are removed — DB-only refund; no external money movement.
  const refundAmount = booking.fee_krw || 0;
  const refundCurrency = "KRW";

  // ── Audit row first (so we never lose the record even if a later step fails). ──
  const { error: auditErr } = await supabase.from("refunds").insert({
    booking_id,
    issued_by: adminId,
    reason,
    amount: refundAmount,
    currency: refundCurrency,
    ls_refund_id: null,
    is_live: false,
  });
  if (auditErr) {
    return NextResponse.json(
      { error: `Refund failed to record: ${auditErr.message}` },
      { status: 500 }
    );
  }

  // ── Mark the booking refunded + mirror the latest refund on the row. ──
  await supabase
    .from("bookings")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      refund_amount: refundAmount,
      refund_currency: refundCurrency,
      refund_id: null,
    })
    .eq("id", booking_id);

  // ── Release the slot(s) so others can book them again. ──
  const releaseIds = [booking.slot_id, ...((booking.extra_slot_ids as string[] | null) || [])].filter(Boolean);
  if (releaseIds.length > 0) {
    await supabase
      .from("availability_slots")
      .update({ status: "available" })
      .in("id", releaseIds);
  }

  // ── System message into the chat. ──
  await supabase
    .from("messages")
    .insert({
      booking_id,
      sender_id: null,
      kind: "system",
      content:
        "🔁 This booking was cancelled and the reservation fee has been refunded. The time slot has been released.",
    })
    .then(undefined, () => {});

  // Internal notification email (fire-and-forget: failure never fails the route).
  const { data: clientProf } = await supabase.from("profiles").select("full_name").eq("id", booking.client_id).maybeSingle();
  const { data: photoProf } = await supabase.from("profiles").select("full_name").eq("id", booking.photographer_id).maybeSingle();
  const clientName = clientProf?.full_name || "Client";
  const photoName = photoProf?.full_name || "Photographer";
  const subject = `[SPHOT] Refund Issued - ${clientName} & ${photoName}`;
  const textContent = `Refund issued for booking ${booking_id} between Client: ${clientName} and Photographer: ${photoName}.\nAmount: ${refundAmount} ${refundCurrency}\nReason: ${reason}\nIssued by admin: ${adminId}`;
  const htmlContent = `
    <h2>SPHOT Refund Issued</h2>
    <p><strong>Client:</strong> ${clientName}</p>
    <p><strong>Photographer:</strong> ${photoName}</p>
    <p><strong>Amount:</strong> ${refundAmount} ${refundCurrency}</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p><strong>Issued by admin:</strong> ${adminId}</p>
    <p><strong>Booking ID:</strong> ${booking_id}</p>
    <hr/>
    <p><em>SPHOT Alerts System</em></p>
  `;
  await sendNotificationEmail(subject, htmlContent, textContent).catch((e) =>
    console.error("[refund] Email notification failed:", e?.message)
  );

  return NextResponse.json({ ok: true, status: "refunded" });
}
