import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { sendNotificationEmail } from "@/lib/notify";

/**
 * API route to securely update a booking's status, add a system message to the chat,
 * and notify hi@booksphot.com about the status change.
 * Bypasses RLS using the service-role client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, bookingId, nextStatus } = body;

    if (!bookingId || !nextStatus || !access_token) {
      return NextResponse.json(
        { error: "bookingId, nextStatus, and access_token are required." },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // Verify caller authentication status
    const { data: userData, error: authErr } = await supabase.auth.getUser(access_token);
    if (authErr || !userData.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }
    const callerId = userData.user.id;

    // 1. Fetch current booking details
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, status, client_id, photographer_id, slot_id, extra_slot_ids")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // Verify participant authorization + determine caller role
    const isPhotographer = callerId === booking.photographer_id;
    const isClient = callerId === booking.client_id;
    let isAdmin = false;
    if (!isPhotographer && !isClient) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", callerId).maybeSingle();
      isAdmin = profile?.role === "admin";
    }

    if (!isPhotographer && !isClient && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to update this booking." }, { status: 403 });
    }

    const oldStatus = booking.status;
    if (oldStatus === nextStatus) {
      return NextResponse.json({ ok: true, message: "Status is already up to date." });
    }

    // Enforce the status state machine per caller role.
    const ALL_STATUSES = [
      "pending", "paid", "confirmed", "booking", "shooted", "edited",
      "sent", "completed", "cancellation_requested", "cancelled", "refunded",
    ];
    const PHOTOGRAPHER_TRANSITIONS: Record<string, string[]> = {
      booking: ["shooted"],
      shooted: ["edited"],
      edited: ["sent"],
      sent: ["completed"],
      // Legacy paid-flow transitions.
      paid: ["confirmed"],
      confirmed: ["completed"],
    };

    if (isAdmin) {
      if (!ALL_STATUSES.includes(nextStatus)) {
        return NextResponse.json({ error: `Invalid status '${nextStatus}'.` }, { status: 400 });
      }
    } else if (isPhotographer) {
      const allowed = PHOTOGRAPHER_TRANSITIONS[oldStatus] || [];
      if (!allowed.includes(nextStatus)) {
        return NextResponse.json(
          { error: `Photographers cannot change a booking from '${oldStatus}' to '${nextStatus}'.` },
          { status: 403 }
        );
      }
    } else {
      // Client: no direct status changes — cancellations go through /api/cancel-request.
      return NextResponse.json(
        { error: "Clients cannot change the booking status directly. To cancel, use the cancellation request flow." },
        { status: 403 }
      );
    }

    // 2. Perform the database update
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ status: nextStatus })
      .eq("id", bookingId);

    if (updateErr) {
      throw updateErr;
    }

    // 3. Post a system message in the messages stream
    let sysMsg = "";
    if (nextStatus === "booking") {
      sysMsg = "📸 Booking confirmed — shoot details finalized.";
    } else if (nextStatus === "shooted") {
      sysMsg = "📸 Status updated: Photographer marked the session as Shooted.";
    } else if (nextStatus === "edited") {
      sysMsg = "🎨 Status updated: Photographer marked the session as Edited (editing in progress).";
    } else if (nextStatus === "sent") {
      sysMsg = "✨ Status updated: Photographer marked the session as Files Sent. Client, please review and complete!";
    } else if (nextStatus === "completed") {
      sysMsg = "✅ Status updated: Booking completed and closed successfully.";
    } else if (nextStatus === "cancelled") {
      sysMsg = "❌ Status updated: Booking has been cancelled.";
      // Also release availability slot(s) if cancelled — primary + extras.
      const releaseIds = [booking.slot_id, ...((booking.extra_slot_ids as string[] | null) || [])].filter(Boolean);
      if (releaseIds.length > 0) {
        await supabase
          .from("availability_slots")
          .update({ status: "available" })
          .in("id", releaseIds);
      }
    }

    if (sysMsg) {
      await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: null,
        kind: "system",
        content: sysMsg,
      });
    }

    // 4. Retrieve client and photographer profile details for the email alert
    const { data: clientProf } = await supabase.from("profiles").select("full_name").eq("id", booking.client_id).maybeSingle();
    const { data: photoProf } = await supabase.from("profiles").select("full_name").eq("id", booking.photographer_id).maybeSingle();
    const clientName = clientProf?.full_name || "Client";
    const photoName = photoProf?.full_name || "Photographer";

    // 5. Send status change alert to hi@booksphot.com
    const subject = `[SPHOT] Status Change: ${photoName} & ${clientName} - ${nextStatus.toUpperCase()}`;
    const textContent = `Booking status changed for SPHOT connection between Photographer: ${photoName} and Client: ${clientName}.\nOld Status: ${oldStatus}\nNew Status: ${nextStatus}\nBooking ID: ${bookingId}`;
    const htmlContent = `
      <h2>Booking Status Change Alert</h2>
      <p><strong>Photographer:</strong> ${photoName}</p>
      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>Old Status:</strong> <span style="text-decoration: line-through; color: #777;">${oldStatus}</span></p>
      <p><strong>New Status:</strong> <span style="color: #22c55e; font-weight: bold;">${nextStatus}</span></p>
      <p><strong>Booking ID:</strong> ${bookingId}</p>
      <hr/>
      <p><em>SPHOT Alerts System</em></p>
    `;

    // Fire-and-forget: email failure must not 500 the route after the DB update succeeded.
    await sendNotificationEmail(subject, htmlContent, textContent).catch((e) =>
      console.error("[booking/update-status] Email notification failed:", e?.message)
    );

    return NextResponse.json({ ok: true, nextStatus });
  } catch (err: any) {
    console.error("[booking/update-status] Error:", err.message || err);
    return NextResponse.json({ error: err.message || "Failed to update status." }, { status: 500 });
  }
}
