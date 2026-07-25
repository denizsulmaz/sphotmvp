import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { sendEmailTo, sendNotificationEmail } from "@/lib/notify";
import { addDays, todayIn } from "@/lib/availability";
import { buildReminderHtml, formatHorizon } from "@/lib/availabilityReminderEmail";

// A photographer needs a reminder when their availability horizon (latest
// rule valid_until or latest legacy available slot) is less than this many
// days away.
const HORIZON_DAYS = 7;
// Don't remind the same photographer more often than this.
const RESEND_COOLDOWN_DAYS = 7;


/**
 * Daily cron: remind photographers whose set availability covers less than
 * the next 7 days. Protected by CRON_SECRET (Vercel cron sends it as a
 * Bearer token automatically when the env var is set).
 *
 * Query params:
 *   ?dry_run=1            — email only the summary to hi@, contact nobody
 *   ?include_never_set=1  — also remind photographers who never set any
 *                           availability (default: only those whose existing
 *                           schedule expired / is expiring)
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get("dry_run") === "1";
  const includeNeverSet = req.nextUrl.searchParams.get("include_never_set") === "1";

  const supabase = getServerSupabase();

  const [{ data: photographers }, { data: rules }, { data: slots }, { data: reminders }] =
    await Promise.all([
      supabase
        .from("photographer_profiles")
        .select("id, public_code, timezone, profiles:id(full_name)")
        .eq("is_approved", true),
      supabase.from("availability_rules").select("photographer_id, valid_until"),
      supabase
        .from("availability_slots")
        .select("photographer_id, start_time")
        .eq("status", "available")
        .gte("start_time", new Date().toISOString()),
      supabase.from("availability_reminder_log").select("photographer_id, last_sent_at"),
    ]);

  const maxRule = new Map<string, string>();
  for (const r of rules || []) {
    const prev = maxRule.get(r.photographer_id);
    if (!prev || r.valid_until > prev) maxRule.set(r.photographer_id, r.valid_until);
  }
  const maxSlot = new Map<string, string>();
  for (const s of slots || []) {
    const day = String(s.start_time).slice(0, 10);
    const prev = maxSlot.get(s.photographer_id);
    if (!prev || day > prev) maxSlot.set(s.photographer_id, day);
  }
  const lastReminded = new Map(
    (reminders || []).map((r) => [r.photographer_id, new Date(r.last_sent_at).getTime()])
  );
  const cooldownMs = RESEND_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

  const results: Array<{ code: string; name: string; horizon: string; emailed: boolean; reason?: string }> = [];

  for (const p of photographers || []) {
    const tz = p.timezone || "Asia/Seoul";
    const today = todayIn(tz);
    const cutoff = addDays(today, HORIZON_DAYS);
    const horizon = [maxRule.get(p.id), maxSlot.get(p.id)].filter(Boolean).sort().pop() || null;

    const isExpiring = horizon !== null && horizon < cutoff;
    const neverSet = horizon === null;
    if (!isExpiring && !(neverSet && includeNeverSet)) continue;

    const prof: any = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    const name = prof?.full_name || "Photographer";
    const entry = {
      code: p.public_code || p.id.slice(0, 8),
      name,
      horizon: horizon || "none set",
      emailed: false,
      reason: undefined as string | undefined,
    };
    results.push(entry);

    const last = lastReminded.get(p.id);
    if (last && Date.now() - last < cooldownMs) {
      entry.reason = "cooldown";
      continue;
    }
    if (dryRun) {
      entry.reason = "dry_run";
      continue;
    }

    const { data: userData } = await supabase.auth.admin.getUserById(p.id);
    const email = userData?.user?.email;
    if (!email) {
      entry.reason = "no_email";
      continue;
    }

    const subject = "Your SPHOT availability is running out";
    const sent = await sendEmailTo(
      email,
      subject,
      buildReminderHtml(name, neverSet ? null : horizon),
      `Hi ${name}, your SPHOT bookable schedule ${neverSet ? "is empty" : `only covers until ${formatHorizon(horizon!)}`}. Update it here: https://www.booksphot.com/photographer/schedule`
    );
    entry.emailed = sent;
    if (sent) {
      await supabase
        .from("availability_reminder_log")
        .upsert({ photographer_id: p.id, last_sent_at: new Date().toISOString() });
    } else {
      entry.reason = "send_failed";
    }
  }

  // Summary to hi@ whenever anything matched.
  if (results.length > 0) {
    const rows = results
      .map((r) => `<tr><td style="padding:3px 10px">${r.code}</td><td style="padding:3px 10px">${r.name}</td><td style="padding:3px 10px">${r.horizon}</td><td style="padding:3px 10px">${r.emailed ? "emailed" : r.reason || "-"}</td></tr>`)
      .join("");
    await sendNotificationEmail(
      `[SPHOT] Availability reminders${dryRun ? " (dry run)" : ""}: ${results.filter((r) => r.emailed).length}/${results.length} emailed`,
      `<h2>Availability reminder run</h2>
       <table style="border-collapse:collapse;font-size:13px"><tr><th style="text-align:left;padding:3px 10px">Code</th><th style="text-align:left;padding:3px 10px">Name</th><th style="text-align:left;padding:3px 10px">Horizon</th><th style="text-align:left;padding:3px 10px">Result</th></tr>${rows}</table>`,
      results.map((r) => `${r.code} ${r.name} ${r.horizon} ${r.emailed ? "emailed" : r.reason}`).join("\n")
    ).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    includeNeverSet,
    checked: (photographers || []).length,
    matched: results.length,
    emailed: results.filter((r) => r.emailed).length,
  });
}
