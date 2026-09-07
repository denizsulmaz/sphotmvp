import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

const MAX_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_PAGE = 300;

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

    // Errors are recorded in error_logs only (Admin → Errors).
    // Alert emails were intentionally removed — they were too noisy.

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
