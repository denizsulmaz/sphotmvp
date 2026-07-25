import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { sendNotificationEmail } from "@/lib/notify";

const MAX_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_PAGE = 300;
// Email hi@ at most once per hour per distinct error message.
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

/** Records a client-side error. Always returns 200 — logging must not fail loudly. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = String(body.message || "").slice(0, MAX_MESSAGE).trim();
    if (!message) return NextResponse.json({ ok: true });

    const stack = body.stack ? String(body.stack).slice(0, MAX_STACK) : null;
    const page = body.page ? String(body.page).slice(0, MAX_PAGE) : null;
    const source = ["boundary", "client", "unhandledrejection"].includes(body.source)
      ? body.source
      : "client";
    const userAgent = req.headers.get("user-agent")?.slice(0, 300) || null;

    const supabase = getServerSupabase();

    // Attach the user when a valid token is supplied (optional).
    let userId: string | null = null;
    if (body.access_token) {
      const { data } = await supabase.auth.getUser(String(body.access_token));
      userId = data.user?.id || null;
    }

    await supabase.from("error_logs").insert({
      user_id: userId,
      message,
      stack,
      page,
      user_agent: userAgent,
      source,
    });

    // Alert email for NEW errors (same message not seen in the last hour).
    const since = new Date(Date.now() - ALERT_COOLDOWN_MS).toISOString();
    const { count } = await supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .eq("message", message)
      .gte("created_at", since);
    if ((count ?? 0) <= 1) {
      await sendNotificationEmail(
        `[SPHOT] Client error: ${message.slice(0, 80)}`,
        `<h2>Client error reported</h2>
         <p><strong>Message:</strong> ${message}</p>
         <p><strong>Page:</strong> ${page || "unknown"}</p>
         <p><strong>User:</strong> ${userId || "anonymous"}</p>
         <p><strong>Source:</strong> ${source}</p>
         <pre style="font-size:11px;background:#f5f5f5;padding:8px;border-radius:6px;">${(stack || "no stack").slice(0, 1500)}</pre>
         <p>Full details in Admin → Errors.</p>`,
        `Client error: ${message}\nPage: ${page}\nUser: ${userId || "anonymous"}`
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
