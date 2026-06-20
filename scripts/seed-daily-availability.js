/**
 * TEST SEED: give every approved photographer 6 hourly slots every day
 * (10:00–16:00 local) for the next N days. Idempotent — skips slots that already
 * exist (by photographer + start_time) and never touches 'booked' ones.
 *
 * Run: NODE_PATH=./node_modules node scripts/seed-daily-availability.js [days]
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const env = {};
for (const l of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DAYS = parseInt(process.argv[2] || "30", 10);
const HOURS = [10, 11, 12, 13, 14, 15]; // 6 one-hour slots: 10:00–16:00

(async () => {
  const { data: phots, error } = await svc
    .from("photographer_profiles")
    .select("id, public_code")
    .eq("is_approved", true);
  if (error) throw error;

  let totalAdded = 0;
  for (const ph of phots) {
    // Existing slot start_times for this photographer (avoid duplicates).
    const { data: existing } = await svc
      .from("availability_slots")
      .select("start_time")
      .eq("photographer_id", ph.id);
    const have = new Set((existing || []).map((s) => new Date(s.start_time).toISOString()));

    const toInsert = [];
    const now = new Date();
    for (let d = 0; d < DAYS; d++) {
      for (const hour of HOURS) {
        const start = new Date(now);
        start.setUTCDate(start.getUTCDate() + d);
        start.setUTCHours(hour, 0, 0, 0);
        if (start.getTime() <= Date.now()) continue; // skip past hours today
        const end = new Date(start);
        end.setUTCHours(hour + 1, 0, 0, 0);
        const iso = start.toISOString();
        if (have.has(iso)) continue;
        toInsert.push({ photographer_id: ph.id, start_time: iso, end_time: end.toISOString(), status: "available" });
      }
    }
    // Insert in chunks.
    for (let i = 0; i < toInsert.length; i += 500) {
      const chunk = toInsert.slice(i, i + 500);
      const { error: insErr } = await svc.from("availability_slots").insert(chunk);
      if (insErr) throw new Error(`insert ${ph.public_code}: ${insErr.message}`);
    }
    totalAdded += toInsert.length;
    console.log(`✓ ${ph.public_code}: +${toInsert.length} slots`);
  }
  console.log(`\nDone. ${phots.length} photographers, ${totalAdded} slots added (${DAYS} days × 6h).`);
})().catch((e) => { console.error("SEED ERROR:", e.message); process.exit(1); });
