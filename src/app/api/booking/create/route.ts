import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { insertBookingSystemMessage } from "@/lib/bookingMessage";
import { sendNotificationEmail } from "@/lib/notify";

/**
 * API route to securely create a booking, lock slots, and send alerts.
 * Bypasses RLS constraints using the service-role client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      access_token,
      client_id,
      photographer_id,
      slot_id,
      shoot_location,
      location_type,
      shoot_style,
      group_size,
      preferred_language,
      duration_label,
      details,
    } = body;

    if (!client_id || !photographer_id || !slot_id || !access_token) {
      return NextResponse.json(
        { error: "Missing required fields (client_id, photographer_id, slot_id, access_token)." },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // Verify caller authentication status and authorize matching user ID
    const { data: userData, error: authErr } = await supabase.auth.getUser(access_token);
    if (authErr || !userData.user || userData.user.id !== client_id) {
      return NextResponse.json({ error: "Unauthorized operation." }, { status: 401 });
    }

    // 1. Lock all selected availability slots atomically BEFORE creating the booking.
    // Only flips slots that are still 'available' and belong to this photographer;
    // if any slot was taken in the meantime, revert and reject.
    const extraSlotIds: string[] = (body.extra_slot_ids || []).filter(Boolean);
    const allSlotIds = Array.from(new Set<string>([slot_id, ...extraSlotIds]));

    const { data: lockedSlots, error: lockErr } = await supabase
      .from("availability_slots")
      .update({ status: "booked" })
      .in("id", allSlotIds)
      .eq("status", "available")
      .eq("photographer_id", photographer_id)
      .select("id");

    const lockedIds = (lockedSlots || []).map((s) => s.id);
    if (lockErr || lockedIds.length !== allSlotIds.length) {
      // Revert any slots we did manage to flip.
      if (lockedIds.length > 0) {
        await supabase
          .from("availability_slots")
          .update({ status: "available" })
          .in("id", lockedIds);
      }
      return NextResponse.json(
        { error: "Slot is no longer available. Please pick another time." },
        { status: 409 }
      );
    }

    // 2. Create the booking record with status='booking' and fee_krw=0
    const { data: booking, error: insertErr } = await supabase
      .from("bookings")
      .insert({
        client_id,
        photographer_id,
        slot_id,
        extra_slot_ids: allSlotIds.filter((id) => id !== slot_id),
        status: "booking",
        fee_krw: 0,
        shoot_location,
        location_type,
        shoot_style,
        group_size,
        preferred_language,
        duration_label,
        details,
      })
      .select()
      .single();

    if (insertErr || !booking) {
      // Release the slots we locked (covers unique-index violations on slot_id too).
      await supabase
        .from("availability_slots")
        .update({ status: "available" })
        .in("id", lockedIds);
      console.error("[booking/create] Booking insert failed:", insertErr?.message);
      return NextResponse.json(
        { error: "Slot is no longer available. Please pick another time." },
        { status: 409 }
      );
    }

    // 3. Post the initial system pre-info message in the conversation
    await insertBookingSystemMessage(supabase, booking.id).catch((e) =>
      console.error("[booking/create] Failed to insert system message:", e.message)
    );

    // 4. Retrieve client and photographer profile details for the email alert
    const { data: clientProf } = await supabase.from("profiles").select("full_name").eq("id", client_id).maybeSingle();
    const { data: photoProf } = await supabase.from("profiles").select("full_name").eq("id", photographer_id).maybeSingle();
    const clientName = clientProf?.full_name || "Client";
    const photoName = photoProf?.full_name || "Photographer";

    // 5. Send status change / creation email notification to hi@booksphot.com
    const subject = `[SPHOT] New Connection Booking - ${clientName} & ${photoName}`;
    const textContent = `New connection booking created between Client: ${clientName} and Photographer: ${photoName}.\nStatus: booking\nLocation: ${shoot_location} (${location_type})\nStyle: ${shoot_style}\nDuration: ${duration_label}\nDetails: ${details || "None"}`;
    const htmlContent = `
      <h2>New SPHOT Connection Booking</h2>
      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>Photographer:</strong> ${photoName}</p>
      <p><strong>Status:</strong> booking (Payment wall suspended)</p>
      <p><strong>Location:</strong> ${shoot_location} (${location_type})</p>
      <p><strong>Style:</strong> ${shoot_style}</p>
      <p><strong>Duration:</strong> ${duration_label}</p>
      <p><strong>Notes:</strong> ${details || "None"}</p>
      <hr/>
      <p><em>SPHOT Alerts System</em></p>
    `;

    // Fire-and-forget: email failure should NOT cause a 500 when the booking already succeeded.
    sendNotificationEmail(subject, htmlContent, textContent).catch((e) =>
      console.error("[booking/create] Email notification failed:", e?.message)
    );

    return NextResponse.json({ ok: true, booking });
  } catch (err: any) {
    console.error("[booking/create] Error:", err.message || err);
    return NextResponse.json({ error: err.message || "Failed to create booking." }, { status: 500 });
  }
}
