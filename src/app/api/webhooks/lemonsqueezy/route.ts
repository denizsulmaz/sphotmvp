import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

    // 1. Validate signature using HMAC SHA256
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(rawBody).digest("hex");

    if (signature !== digest) {
      console.warn("Invalid Lemon Squeezy webhook signature");
      return new NextResponse("Unauthorized Signature", { status: 401 });
    }

    // 2. Parse payload
    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data;

    console.log(`Received Lemon Squeezy event: ${eventName}`, customData);

    // 3. Process paid order events
    if ((eventName === "order_created" || eventName === "payment_succeeded") && customData?.booking_id) {
      const bookingId = customData.booking_id;
      const orderId = payload.data?.id;

      if (!supabase) {
        console.error("Supabase client not initialized in webhook handler.");
        return new NextResponse("Database Connection Error", { status: 500 });
      }

      // Fetch booking details to get the associated availability slot ID
      const { data: booking, error: fetchError } = await supabase
        .from("bookings")
        .select("slot_id")
        .eq("id", bookingId)
        .single();

      if (fetchError || !booking) {
        console.error(`Booking with ID ${bookingId} not found in database.`);
        return new NextResponse("Booking Not Found", { status: 404 });
      }

      // Update booking status to 'paid' and register the Lemon Squeezy checkout order reference
      const { error: updateBookingError } = await supabase
        .from("bookings")
        .update({
          status: "paid",
          checkout_id: String(orderId || "")
        })
        .eq("id", bookingId);

      if (updateBookingError) {
        console.error(`Failed to update booking status to 'paid': ${updateBookingError.message}`);
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
            console.error(`Failed to update availability slots status to 'booked': ${updateSlotError.message}`);
          }
        }
      } else if (booking.slot_id) {
        const { error: updateSlotError } = await supabase
          .from("availability_slots")
          .update({ status: "booked" })
          .eq("id", booking.slot_id);

        if (updateSlotError) {
          console.error(`Failed to update availability slot status to 'booked': ${updateSlotError.message}`);
        }
      }

      console.log(`Successfully processed reservation payment for booking ID: ${bookingId}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
