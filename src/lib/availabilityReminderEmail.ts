import { brandedEmail } from "@/lib/emailLayout";

export const SCHEDULE_URL = "https://www.booksphot.com/photographer/schedule";

export function formatHorizon(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * On-brand availability reminder (same shell as the welcome/claim emails:
 * centered card, black logo header, social + HQ footer). horizon is the
 * last covered local date, or null when no availability is set at all.
 */
export function buildReminderHtml(name: string, horizon: string | null): string {
  const message = horizon
    ? `Your bookable schedule only covers until <strong>${formatHorizon(horizon)}</strong>.<br/>After that, clients browsing SPHOT will not be able to book you.`
    : `You have no bookable hours set right now, so clients browsing SPHOT cannot book you.`;
  return brandedEmail({
    preheader: "Your bookable schedule is about to run out. Extending it takes one minute.",
    bodyHtml: `
      <div style="text-align:center;margin-bottom:18px;">
        <span style="display:inline-block;background:#fffa6c;border-radius:999px;padding:6px 14px;font-size:11px;font-weight:800;letter-spacing:0.08em;color:#000000;">SCHEDULE REMINDER</span>
      </div>
      <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111111;text-align:center;">Hi ${name}, your availability is running out</h1>
      <p style="margin:0 auto 10px;max-width:360px;color:#555555;font-size:14px;line-height:1.6;text-align:center;">
        ${message}
      </p>
      <p style="margin:0 auto 26px;max-width:360px;color:#555555;font-size:14px;line-height:1.6;text-align:center;">
        Keeping your calendar open takes one minute. A single recurring rule can cover up to a full year.
      </p>
      <div style="text-align:center;margin-bottom:20px;">
        <a href="${SCHEDULE_URL}" style="display:inline-block;background:#000000;color:#fffa6c;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:800;font-size:14px;">
          Update my schedule
        </a>
      </div>
      <p style="margin:24px auto 0;max-width:360px;color:#999999;font-size:12px;line-height:1.6;text-align:center;">
        You are receiving this because your SPHOT studio schedule is about to run out. We send at most one reminder per week.
      </p>`,
  });
}
