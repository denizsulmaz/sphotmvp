import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { sendNotificationEmail } from "@/lib/notify";

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
    .select("id, status, client_id, photographer_id, slot_id, extra_slot_ids")
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

  // Release the slot(s) only on a final cancel. While a cancellation request is
  // under admin review the booking stays active — releasing the slot here would
  // let a new client pass the availability lock and then hit the one-active-
  // booking-per-slot unique index (409 loop) until the admin resolves it.
  // The refund/cancel routes release the slots when the admin decides.
  if (nextStatus === "cancelled") {
    const releaseIds = [booking.slot_id, ...((booking.extra_slot_ids as string[] | null) || [])].filter(Boolean);
    if (releaseIds.length > 0) {
      await supabase
        .from("availability_slots")
        .update({ status: "available" })
        .in("id", releaseIds);
    }
  }

  // System message into the chat.
  const note = wasPaid
    ? "🕊️ A cancellation was requested. Our team will review and process any eligible refund."
    : "❌ This booking was cancelled. The time slot has been released.";
  await supabase
    .from("messages")
    .insert({ booking_id, sender_id: null, kind: "system", content: note })
    .then(undefined, () => {});

  // Internal notification email (fire-and-forget: failure never fails the route).
  const { data: clientProf } = await supabase.from("profiles").select("full_name").eq("id", booking.client_id).maybeSingle();
  const { data: photoProf } = await supabase.from("profiles").select("full_name").eq("id", booking.photographer_id).maybeSingle();
  const clientName = clientProf?.full_name || "Client";
  const photoName = photoProf?.full_name || "Photographer";
  const subject = `[SPHOT] ${nextStatus === "cancelled" ? "Booking Cancelled" : "Cancellation Requested"} - ${clientName} & ${photoName}`;
  const textContent = `Booking ${booking_id} between Client: ${clientName} and Photographer: ${photoName} is now '${nextStatus}'.\nRequested by: ${callerId}\nReason: ${reason || "None"}`;
  const htmlContent = `
    <h2>SPHOT ${nextStatus === "cancelled" ? "Booking Cancelled" : "Cancellation Requested"}</h2>
    <p><strong>Client:</strong> ${clientName}</p>
    <p><strong>Photographer:</strong> ${photoName}</p>
    <p><strong>New Status:</strong> ${nextStatus}</p>
    <p><strong>Requested by:</strong> ${callerId}</p>
    <p><strong>Reason:</strong> ${reason || "None"}</p>
    <p><strong>Booking ID:</strong> ${booking_id}</p>
    <hr/>
    <p><em>SPHOT Alerts System</em></p>
  `;
  await sendNotificationEmail(subject, htmlContent, textContent).catch((e) =>
    console.error("[cancel-request] Email notification failed:", e?.message)
  );

  return NextResponse.json({ ok: true, status: nextStatus });
}
