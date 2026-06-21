import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { issueRefund } from "@/lib/lemonRefund";

/**
 * Issue a refund for a booking. **Admin-only and reason-required** — there is no
 * automatic refund anywhere in the app. An admin reviews the booking (in the
 * admin Refunds queue), types a reason, and calls this.
 *
 * Side effects:
 *   - calls the Lemon Squeezy refund API in live mode (skipped in mock mode),
 *   - writes a `refunds` audit row (who / why / amount / LS id),
 *   - sets the booking to 'refunded' and releases its slot,
 *   - posts a system message into the chat.
 *
 * Mock-safe: in mock payments mode the LS call is skipped but every side effect
 * still happens, so the flow is fully testable before live keys exist.
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
    .select("id, status, fee_krw, checkout_id, slot_id")
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

  // ── Issue the refund (real in live mode, synthetic in mock mode). ──
  const refund = await issueRefund(booking.checkout_id, booking.fee_krw, "KRW");
  if (!refund.ok) {
    return NextResponse.json({ error: refund.error || "Refund failed." }, { status: 502 });
  }

  // ── Audit row first (so we never lose the record even if a later step fails). ──
  const { error: auditErr } = await supabase.from("refunds").insert({
    booking_id,
    issued_by: adminId,
    reason,
    amount: refund.amount,
    currency: refund.currency,
    ls_refund_id: refund.refundId || null,
    is_live: refund.live,
  });
  if (auditErr) {
    return NextResponse.json(
      { error: `Refund issued but failed to record: ${auditErr.message}` },
      { status: 500 }
    );
  }

  // ── Mark the booking refunded + mirror the latest refund on the row. ──
  await supabase
    .from("bookings")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      refund_amount: refund.amount,
      refund_currency: refund.currency,
      refund_id: refund.refundId || null,
    })
    .eq("id", booking_id);

  // ── Release the slot so others can book it again. ──
  if (booking.slot_id) {
    await supabase
      .from("availability_slots")
      .update({ status: "available" })
      .eq("id", booking.slot_id);
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

  return NextResponse.json({ ok: true, status: "refunded", live: refund.live });
}
