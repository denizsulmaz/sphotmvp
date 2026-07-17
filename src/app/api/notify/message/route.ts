import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { sendEmailTo } from "@/lib/notify";

// How recently the recipient must have had the chat open to count as
// "actively chatting" (their read marker is refreshed on every incoming
// message while the window is open/visible).
const ACTIVE_WINDOW_MS = 3 * 60 * 1000;
// Minimum gap between two new-message emails for the same conversation.
const COOLDOWN_MS = 30 * 60 * 1000;

/**
 * Fire-and-forget from ChatWindow after a message is sent. Emails the OTHER
 * participant that they have a new message — unless they are actively in the
 * chat (recent read marker) or were already emailed recently (cooldown).
 * Always returns 200 with { sent } so the chat flow never breaks.
 */
export async function POST(req: NextRequest) {
  try {
    const { access_token, booking_id } = await req.json();
    if (!access_token || !booking_id) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    const supabase = getServerSupabase();
    const { data: userData, error: authErr } = await supabase.auth.getUser(access_token);
    if (authErr || !userData.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const senderId = userData.user.id;

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, client_id, photographer_id")
      .eq("id", booking_id)
      .maybeSingle();
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.client_id !== senderId && booking.photographer_id !== senderId) {
      return NextResponse.json({ error: "Not a participant." }, { status: 403 });
    }
    const recipientId = booking.client_id === senderId ? booking.photographer_id : booking.client_id;
    const now = Date.now();

    // 1. Recipient actively chatting? (read marker refreshed while chat open)
    const { data: readRow } = await supabase
      .from("conversation_reads")
      .select("last_read_at")
      .eq("booking_id", booking_id)
      .eq("user_id", recipientId)
      .maybeSingle();
    if (readRow && now - new Date(readRow.last_read_at).getTime() < ACTIVE_WINDOW_MS) {
      return NextResponse.json({ ok: true, sent: false, reason: "recipient_active" });
    }

    // 2. Cooldown: already emailed for this conversation recently?
    const { data: logRow } = await supabase
      .from("message_email_log")
      .select("last_sent_at")
      .eq("booking_id", booking_id)
      .eq("recipient_id", recipientId)
      .maybeSingle();
    if (logRow && now - new Date(logRow.last_sent_at).getTime() < COOLDOWN_MS) {
      return NextResponse.json({ ok: true, sent: false, reason: "cooldown" });
    }

    // 3. Resolve recipient email + sender name.
    const { data: recipientUser } = await supabase.auth.admin.getUserById(recipientId);
    const email = recipientUser?.user?.email;
    if (!email) return NextResponse.json({ ok: true, sent: false, reason: "no_email" });

    const { data: senderProf } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", senderId)
      .maybeSingle();
    const senderName = senderProf?.full_name || "Your SPHOT contact";
    const chatPath = booking.client_id === recipientId ? "/client/chat" : "/photographer/chat";
    const chatUrl = `https://www.booksphot.com${chatPath}?booking=${booking_id}`;

    const subject = `New message from ${senderName} on SPHOT`;
    const text = `${senderName} sent you a new message about your booking.\n\nOpen the chat to reply: ${chatUrl}\n\n— SPHOT`;
    const html = `
      <h2>You have a new message</h2>
      <p><strong>${senderName}</strong> sent you a message about your booking.</p>
      <p><a href="${chatUrl}" style="display:inline-block;padding:10px 18px;background:#000;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;">Open the chat</a></p>
      <p style="color:#888;font-size:12px;">You won't get another email about this conversation for a while — new messages show up in the chat.</p>
      <hr/>
      <p><em>SPHOT</em></p>
    `;

    const sent = await sendEmailTo(email, subject, html, text);
    if (sent) {
      await supabase
        .from("message_email_log")
        .upsert({ booking_id, recipient_id: recipientId, last_sent_at: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true, sent });
  } catch (err: any) {
    console.error("[notify/message] Error:", err?.message || err);
    // Never fail the chat flow over a notification.
    return NextResponse.json({ ok: true, sent: false, reason: "error" });
  }
}
