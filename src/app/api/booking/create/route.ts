import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { insertBookingSystemMessage } from "@/lib/bookingMessage";
import { sendNotificationEmail } from "@/lib/notify";
import { expandAvailability, utcToLocalDay, addDays } from "@/lib/availability";

/**
 * Securely create a booking (service-role, bypasses RLS).
 *
 * Availability is rule-based: clients request hours by UTC start time
 * (`slot_starts: string[]`). The route validates every requested hour against
 * the photographer's rules/exceptions (or a legacy 'available' slot row) and
 * MATERIALIZES them as 'booked' availability_slots rows. Race safety comes
 * from the unique index on (photographer_id, start_time): a concurrent
 * booking of the same hour fails the insert and gets a 409.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      access_token,
      client_id,
      photographer_id,
      slot_starts,
      shoot_location,
      location_type,
      shoot_style,
      group_size,
      preferred_language,
      duration_label,
      details,
    } = body;

    if (!client_id || !photographer_id || !access_token) {
      return NextResponse.json(
        { error: "Missing required fields (client_id, photographer_id, access_token)." },
        { status: 400 }
      );
    }
    if (!Array.isArray(slot_starts) || slot_starts.length === 0 || slot_starts.length > 12) {
      return NextResponse.json(
        { error: "slot_starts must be a non-empty array of ISO start times (max 12)." },
        { status: 400 }
      );
    }
    // Normalize + validate the requested hours.
    const requestedStarts: string[] = [];
    for (const s of slot_starts) {
      const t = Date.parse(s);
      if (!Number.isFinite(t)) {
        return NextResponse.json({ error: "Invalid slot start time." }, { status: 400 });
      }
      if (t < Date.now()) {
        return NextResponse.json({ error: "Slot start time is in the past." }, { status: 400 });
      }
      requestedStarts.push(new Date(t).toISOString());
    }
    const uniqueStarts = Array.from(new Set(requestedStarts)).sort();

    const supabase = getServerSupabase();

    // Verify caller authentication status and authorize matching user ID
    const { data: userData, error: authErr } = await supabase.auth.getUser(access_token);
    if (authErr || !userData.user || userData.user.id !== client_id) {
      return NextResponse.json({ error: "Unauthorized operation." }, { status: 401 });
    }

    // 1. Load the photographer's timezone, rules, exceptions, and existing
    //    slot rows around the requested window, then expand availability.
    const { data: photoProfile } = await supabase
      .from("photographer_profiles")
      .select("timezone, is_approved")
      .eq("id", photographer_id)
      .maybeSingle();
    if (!photoProfile || !photoProfile.is_approved) {
      return NextResponse.json({ error: "Photographer not found." }, { status: 404 });
    }
    const tz = photoProfile.timezone || "Asia/Seoul";
    const fromDay = addDays(utcToLocalDay(uniqueStarts[0], tz), -1);
    const toDay = addDays(utcToLocalDay(uniqueStarts[uniqueStarts.length - 1], tz), 1);

    const [{ data: rules }, { data: exceptions }, { data: slotRows }] = await Promise.all([
      supabase.from("availability_rules").select("*").eq("photographer_id", photographer_id),
      supabase.from("availability_exceptions").select("*").eq("photographer_id", photographer_id),
      supabase
        .from("availability_slots")
        .select("id, start_time, end_time, status")
        .eq("photographer_id", photographer_id)
        .gte("start_time", `${fromDay}T00:00:00Z`)
        .lte("start_time", `${toDay}T23:59:59Z`),
    ]);

    const expanded = expandAvailability({
      rules: rules || [],
      exceptions: exceptions || [],
      slots: (slotRows || []) as any,
      timezone: tz,
      fromDate: fromDay,
      toDate: toDay,
    });
    const availableByStart = new Map(expanded.map((e) => [e.start_time, e]));

    for (const start of uniqueStarts) {
      if (!availableByStart.has(start)) {
        return NextResponse.json(
          { error: "One of the selected times is no longer available. Please pick another time." },
          { status: 409 }
        );
      }
    }

    // 2. Materialize the hours as 'booked' slot rows. For each hour: first try
    //    to claim a legacy 'available' row (update where status='available' —
    //    a concurrent claimer makes this a 0-row update), otherwise insert a
    //    new booked row (the unique index rejects a concurrent duplicate).
    const claimedIds: string[] = []; // in request order (primary first)
    const claimedLegacy: string[] = []; // pre-existing rows flipped to booked
    const insertedNew: string[] = []; // rows this request created
    let conflict = false;
    for (const start of uniqueStarts) {
      const slot = availableByStart.get(start)!;
      if (slot.source === "slot" && slot.slotId) {
        const { data: updated } = await supabase
          .from("availability_slots")
          .update({ status: "booked" })
          .eq("id", slot.slotId)
          .eq("status", "available")
          .select("id");
        if (updated && updated.length === 1) {
          claimedIds.push(slot.slotId);
          claimedLegacy.push(slot.slotId);
          continue;
        }
        conflict = true;
        break;
      }
      const { data: inserted, error: insErr } = await supabase
        .from("availability_slots")
        .insert({
          photographer_id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          status: "booked",
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        // Unique-index collision: a row for this hour already exists. If it's
        // an 'available' row (e.g. released by a cancellation, or created
        // between our expansion and now), claim it instead of failing.
        const { data: claimed } = await supabase
          .from("availability_slots")
          .update({ status: "booked" })
          .eq("photographer_id", photographer_id)
          .eq("start_time", slot.start_time)
          .eq("status", "available")
          .select("id");
        if (claimed && claimed.length === 1) {
          claimedIds.push(claimed[0].id);
          claimedLegacy.push(claimed[0].id);
          continue;
        }
        conflict = true;
        break;
      }
      claimedIds.push(inserted.id);
      insertedNew.push(inserted.id);
    }

    const releaseClaimed = async () => {
      // Legacy rows revert to available; rows we created are deleted (the hour
      // remains bookable through the rule that generated it).
      if (claimedLegacy.length > 0) {
        await supabase.from("availability_slots").update({ status: "available" }).in("id", claimedLegacy);
      }
      if (insertedNew.length > 0) {
        await supabase.from("availability_slots").delete().in("id", insertedNew);
      }
    };

    if (conflict) {
      await releaseClaimed();
      return NextResponse.json(
        { error: "Slot is no longer available. Please pick another time." },
        { status: 409 }
      );
    }

    // 3. Create the booking record with status='booking' and fee_krw=0
    const primarySlotId = claimedIds[0];
    const { data: booking, error: insertErr } = await supabase
      .from("bookings")
      .insert({
        client_id,
        photographer_id,
        slot_id: primarySlotId,
        extra_slot_ids: claimedIds.slice(1),
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
      await releaseClaimed();
      console.error("[booking/create] Booking insert failed:", insertErr?.message);
      return NextResponse.json(
        { error: "Slot is no longer available. Please pick another time." },
        { status: 409 }
      );
    }

    // 4. Post the initial system pre-info message in the conversation
    await insertBookingSystemMessage(supabase, booking.id).catch((e) =>
      console.error("[booking/create] Failed to insert system message:", e.message)
    );

    // 5. Retrieve client and photographer profile details for the email alert
    const { data: clientProf } = await supabase.from("profiles").select("full_name").eq("id", client_id).maybeSingle();
    const { data: photoProf } = await supabase.from("profiles").select("full_name").eq("id", photographer_id).maybeSingle();
    const clientName = clientProf?.full_name || "Client";
    const photoName = photoProf?.full_name || "Photographer";

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
