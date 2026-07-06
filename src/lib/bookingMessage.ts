import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Compose + insert the SPHOT system "pre-information" message for a booking.
 * Rendered centered in chat (kind='system', no sender). Idempotent: skips if a
 * system message already exists for this booking. Call with a service-role client.
 */
export async function insertBookingSystemMessage(
  supabase: SupabaseClient,
  bookingId: string
): Promise<void> {
  // Already has a system message? (e.g. webhook + redirect both fire) → skip.
  const { data: existing } = await supabase
    .from("messages")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("kind", "system")
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const { data: b } = await supabase
    .from("bookings")
    .select(
      "shoot_location, location_type, group_size, shoot_style, preferred_language, duration_label, details, slot_id, photographer_id"
    )
    .eq("id", bookingId)
    .single();
  if (!b) return;

  let scheduleLine = "";
  if (b.slot_id) {
    const { data: slot } = await supabase
      .from("availability_slots")
      .select("start_time, end_time")
      .eq("id", b.slot_id)
      .maybeSingle();
    if (slot) {
      const s = new Date(slot.start_time);
      const e = new Date(slot.end_time);

      // Resolve photographer timezone
      const { data: photoProfile } = await supabase
        .from("photographer_profiles")
        .select("timezone")
        .eq("id", b.photographer_id)
        .maybeSingle();
      const tz = photoProfile?.timezone || "Asia/Seoul";

      const date = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: tz
      }).format(s);

      const startStr = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: tz
      }).format(s);

      const endStr = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: tz
      }).format(e);

      const time = `${startStr} – ${endStr}`;
      scheduleLine = `⏰ Schedule: ${date}, ${time} (Studio Time)`;
    }
  }

  const lines = [
    "📸 Booking confirmed. Here are the shoot details the user shared:",
    b.shoot_location ? `📍 Location: ${b.shoot_location}${b.location_type ? ` (${b.location_type})` : ""}` : "",
    b.group_size ? `👥 Group size: ${b.group_size}` : "",
    b.shoot_style ? `✨ Style/Theme: ${b.shoot_style}` : "",
    scheduleLine,
    b.duration_label ? `🕐 Duration: ${b.duration_label}` : "",
    b.preferred_language ? `🌐 Language: ${b.preferred_language}` : "",
    b.details ? `📝 Notes: ${b.details}` : "",
    "",
    "You can now chat directly to finalize everything. 💬",
  ].filter(Boolean);

  await supabase.from("messages").insert({
    booking_id: bookingId,
    sender_id: null,
    kind: "system",
    content: lines.join("\n"),
  });
}
