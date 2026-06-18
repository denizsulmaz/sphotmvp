import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSupabase } from "@/lib/supabaseServer";

/**
 * Lemon Squeezy webhook handler.
 * Uses the server-side Supabase client (service-role key) to bypass RLS.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

    if (!secret) {
      console.error("[Webhook] LEMONSQUEEZY_WEBHOOK_SECRET is not configured.");
      return new NextResponse("Server Configuration Error", { status: 500 });
    }

    // 1. Validate signature using timing-safe HMAC SHA256 comparison
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(rawBody).digest("hex");

    if (
      signature.length !== digest.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
    ) {
      console.warn("[Webhook] Invalid Lemon Squeezy webhook signature");
      return new NextResponse("Unauthorized Signature", { status: 401 });
    }

    // 2. Parse payload
    const payload = JSON.parse(rawBody);
    const eventName: string | undefined = payload.meta?.event_name;
    const customData: Record<string, string> | undefined =
      payload.meta?.custom_data;

    console.log(`[Webhook] Received event: ${eventName}`);

    // 3. Process paid order events
    if (
      (eventName === "order_created" || eventName === "payment_succeeded") &&
      customData?.booking_id
    ) {
      const bookingId = customData.booking_id;
      const orderId = payload.data?.id;

      const supabase = getServerSupabase();

      // Fetch booking details to get the associated availability slot ID
      const { data: booking, error: fetchError } = await supabase
        .from("bookings")
        .select("slot_id")
        .eq("id", bookingId)
        .single();

      if (fetchError || !booking) {
        console.error(
          `[Webhook] Booking with ID ${bookingId} not found in database.`
        );
        return new NextResponse("Booking Not Found", { status: 404 });
      }

      // Update booking status to 'paid' and register the Lemon Squeezy checkout order reference
      const { error: updateBookingError } = await supabase
        .from("bookings")
        .update({
          status: "paid",
          checkout_id: String(orderId || ""),
        })
        .eq("id", bookingId);

      if (updateBookingError) {
        console.error(
          `[Webhook] Failed to update booking status: ${updateBookingError.message}`
        );
        return new NextResponse("Database Update Error", { status: 500 });
      }

      // Update the availability slot status to 'booked' to lock out other buyers
      const slotIdsStr = customData?.slot_ids;
      if (slotIdsStr) {
        const slotIds = slotIdsStr.split(",").filter(Boolean);
        if (slotIds.length > 0) {
          const { error: updateSlotError } = await supabase
            .from("availability_slots")
            .update({ status: "booked" })
            .in("id", slotIds);

          if (updateSlotError) {
            console.error(
              `[Webhook] Failed to update slot status: ${updateSlotError.message}`
            );
          }
        }
      } else if (booking.slot_id) {
        const { error: updateSlotError } = await supabase
          .from("availability_slots")
          .update({ status: "booked" })
          .eq("id", booking.slot_id);

        if (updateSlotError) {
          console.error(
            `[Webhook] Failed to update slot status: ${updateSlotError.message}`
          );
        }
      }

      console.log(
        `[Webhook] Successfully processed reservation for booking: ${bookingId}`
      );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Webhook] Processing error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
