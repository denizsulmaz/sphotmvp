/**
 * Seed: (1) a dedicated admin account, (2) future availability slots for a few
 * migrated photographers so the booking calendar is populated for verification.
 *
 * Idempotent. Run: NODE_PATH=./node_modules node scripts/seed-admin-and-slots.js
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ADMIN_EMAIL = "admin@booksphot.com";
const ADMIN_PASSWORD = "Sphot-Admin-2026!";

async function findUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit;
    if (data.users.length < 1000) return null;
    page++;
  }
}

async function ensureAdmin() {
  let user = await findUserByEmail(ADMIN_EMAIL);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Sphot Admin", role: "admin" },
    });
    if (error) throw new Error("createUser admin: " + error.message);
    user = data.user;
    console.log("✓ created admin user", ADMIN_EMAIL, user.id);
  } else {
    console.log("• admin user already exists", user.id);
  }
  // Force role=admin on the profile (trigger may have defaulted to client if metadata missing).
  const { error } = await admin
    .from("profiles")
    .upsert({ id: user.id, role: "admin", full_name: "Sphot Admin", avatar_url: "" });
  if (error) throw new Error("profiles upsert admin: " + error.message);
  console.log("✓ admin profile role set");
  return user;
}

async function seedSlots() {
  // Pick the first 3 approved photographers.
  const { data: phots, error } = await admin
    .from("photographer_profiles")
    .select("id, profiles:id(full_name)")
    .eq("is_approved", true)
    .limit(3);
  if (error) throw new Error("select photographers: " + error.message);

  for (const ph of phots) {
    const name = ph.profiles?.full_name || ph.id;
    // Build candidate slots: next 7 days, at 10:00, 14:00, 16:00 local-ish (UTC offsets fine for seed).
    const candidates = [];
    for (let d = 1; d <= 7; d++) {
      for (const hour of [10, 14, 16]) {
        const start = new Date();
        start.setUTCDate(start.getUTCDate() + d);
        start.setUTCHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setUTCHours(hour + 1, 0, 0, 0);
        candidates.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
    // Fetch existing slots to avoid duplicates (idempotency by start_time).
    const { data: existing } = await admin
      .from("availability_slots")
      .select("start_time")
      .eq("photographer_id", ph.id);
    const have = new Set((existing || []).map((s) => new Date(s.start_time).toISOString()));
    const toInsert = candidates
      .filter((c) => !have.has(c.start))
      .map((c) => ({ photographer_id: ph.id, start_time: c.start, end_time: c.end, status: "available" }));

    if (toInsert.length) {
      const { error: insErr } = await admin.from("availability_slots").insert(toInsert);
      if (insErr) throw new Error(`insert slots ${name}: ${insErr.message}`);
    }
    console.log(`✓ ${name}: +${toInsert.length} slots (already had ${have.size})`);
  }
}

(async () => {
  await ensureAdmin();
  await seedSlots();
  console.log("\nAdmin login → email:", ADMIN_EMAIL, " password:", ADMIN_PASSWORD);
})().catch((e) => {
  console.error("SEED ERROR:", e.message);
  process.exit(1);
});
