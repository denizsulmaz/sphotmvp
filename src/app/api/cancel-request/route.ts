import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

/**
 * A client or photographer requests cancellation of their own booking.
 *
 * This does NOT move money — refunds are admin-only (see /api/refund). It marks
 * the booking 'cancellation_requested', records who/why/when, releases the slot
 * so it can be re-booked, and posts a system message. The request then surfaces
 * in the admin Refunds queue for review.
 *
 * For an unpaid ('pending') booking there is nothing to refund, so it is set
 * straight to 'cancelled'.
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

  const supabase = getServerSupabase();

  // ── Authenticate the caller. ──
  const { data: userData, error: userErr } = await supabase.auth.getUser(access_token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const callerId = userData.user.id;

  // ── Load + authorize (must be a participant or admin). ──
  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, status, client_id, photographer_id, slot_id")
    .eq("id", booking_id)
    .single();
  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();
  const isAdmin = callerProfile?.role === "admin";
  const isParticipant =
    booking.client_id === callerId || booking.photographer_id === callerId;
  if (!isAdmin && !isParticipant) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  // Idempotency / terminal states.
  if (["cancellation_requested", "cancelled", "refunded"].includes(booking.status)) {
    return NextResponse.json({ ok: true, status: booking.status, alreadyDone: true });
  }

  const wasPaid = ["paid", "confirmed", "completed"].includes(booking.status);
  // Unpaid → nothing to refund, cancel outright. Paid → request admin review.
  const nextStatus = wasPaid ? "cancellation_requested" : "cancelled";

  const { error: updErr } = await supabase
    .from("bookings")
    .update({
      status: nextStatus,
      cancel_requested_by: callerId,
      cancel_reason: reason || null,
      cancel_requested_at: new Date().toISOString(),
    })
    .eq("id", booking_id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Release the slot so it can be re-booked while the request is reviewed.
  if (booking.slot_id) {
    await supabase
      .from("availability_slots")
      .update({ status: "available" })
      .eq("id", booking.slot_id);
  }

  // System message into the chat.
  const note = wasPaid
    ? "🕊️ A cancellation was requested. Our team will review and process any eligible refund. The time slot has been released."
    : "❌ This booking was cancelled. The time slot has been released.";
  await supabase
    .from("messages")
    .insert({ booking_id, sender_id: null, kind: "system", content: note })
    .then(undefined, () => {});

  return NextResponse.json({ ok: true, status: nextStatus });
}
