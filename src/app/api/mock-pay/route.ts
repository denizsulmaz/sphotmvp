import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { insertBookingSystemMessage } from "@/lib/bookingMessage";

/**
 * Mock-payment endpoint — simulates a successful Lemon Squeezy webhook so the
 * full post-payment experience (chat unlock, slot lock) is testable before live
 * payment keys exist.
 *
 * Active ONLY when payments are in mock mode. Refuses when NEXT_PUBLIC_PAYMENTS_MODE
 * is explicitly "live" so it can never be used to bypass real payment in production.
 *
 * Uses the service-role client to mirror exactly what the real webhook does.
 */
export async function POST(req: NextRequest) {
  const mode = process.env.NEXT_PUBLIC_PAYMENTS_MODE || "mock";
  if (mode === "live") {
    return NextResponse.json(
      { error: "Mock payment is disabled in live mode." },
      { status: 403 }
    );
  }

  let body: { booking_id?: string; slot_ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const bookingId = body.booking_id;
  if (!bookingId) {
    return NextResponse.json({ error: "booking_id is required." }, { status: 400 });
  }

  const supabase = getServerSupabase();

  // Verify the booking exists and is still pending (idempotent: paid is fine too).
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status, slot_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (booking.status === "pending") {
    const { error: updErr } = await supabase
      .from("bookings")
      .update({ status: "paid", checkout_id: `mock_${Date.now()}` })
      .eq("id", bookingId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  }

  // Lock the booked slot(s) so other clients can't grab them.
  const slotIds = (body.slot_ids || []).filter(Boolean);
  const idsToLock = slotIds.length > 0 ? slotIds : booking.slot_id ? [booking.slot_id] : [];
  if (idsToLock.length > 0) {
    await supabase.from("availability_slots").update({ status: "booked" }).in("id", idsToLock);
  }

  // Post the SPHOT system pre-info message that opens the chat.
  await insertBookingSystemMessage(supabase, bookingId).catch((e) =>
    console.error("[mock-pay] system message:", e?.message)
  );

  return NextResponse.json({ ok: true, booking_id: bookingId, status: "paid" });
}
