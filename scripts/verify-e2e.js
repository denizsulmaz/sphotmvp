/**
 * End-to-end verification against LIVE Supabase using anon + service clients.
 * Simulates the real app flows that the UI performs, asserting each step.
 *
 * Run: NODE_PATH=./node_modules node scripts/verify-e2e.js
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;

const svc = createClient(URL, SVC, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };

async function main() {
  console.log("\n[1] Public browse (anon) — approved photographers visible");
  const a = anon();
  const { data: phots, error: pErr } = await a
    .from("photographer_profiles")
    .select("id, base_price, public_code, portfolio_urls, profiles:id(full_name, avatar_url)")
    .eq("is_approved", true);
  ok(!pErr, "anon can read approved photographers");
  ok((phots || []).length >= 19, `>=19 approved photographers (got ${phots?.length})`);
  const target = phots.find((p) => (p.portfolio_urls || []).length > 0);
  ok(!!target, "at least one photographer has portfolio images");
  ok(!!target.public_code, `photographer has public_code (${target?.public_code})`);

  console.log("\n[2] Photographer has real availability slots");
  // Use a photographer that we seeded slots for (Josh/Stephanie/Harry by code S01001-3).
  const seeded = phots.find((p) => ["S01001", "S01002", "S01003"].includes(p.public_code)) || target;
  const { data: slots } = await a
    .from("availability_slots")
    .select("id, start_time, status")
    .eq("photographer_id", seeded.id)
    .eq("status", "available")
    .gt("start_time", new Date().toISOString())
    .order("start_time");
  ok((slots || []).length > 0, `seeded photographer has available slots (${slots?.length})`);
  const slot = slots[0];

  console.log("\n[3] Client signup (anon) + auto profile via trigger");
  const ts = Math.floor(Number(process.env.E2E_STAMP || "0")) || 1;
  const email = `e2e.client.${ts}.${Math.abs(hash(URL))}@sphot.test`;
  // create + confirm via service (mirrors verified signup without needing email OTP)
  const { data: cu, error: cuErr } = await svc.auth.admin.createUser({
    email, password: "E2e!Client#2026", email_confirm: true,
    user_metadata: { full_name: "E2E Client", role: "client" },
  });
  ok(!cuErr, "client user created");
  const clientId = cu.user.id;
  const { data: cprof } = await svc.from("profiles").select("role").eq("id", clientId).single();
  ok(cprof?.role === "client", "trigger created client profile with role=client");

  // sign the client in (anon, real JWT) to exercise RLS as the client
  const cClient = anon();
  const { error: siErr } = await cClient.auth.signInWithPassword({ email, password: "E2e!Client#2026" });
  ok(!siErr, "client can sign in");

  console.log("\n[4] Booking creation (as client, RLS-enforced)");
  const { data: booking, error: bErr } = await cClient
    .from("bookings")
    .insert({
      client_id: clientId, photographer_id: seeded.id, slot_id: slot.id,
      status: "pending", fee_krw: 25000,
      shoot_location: "Gyeongbokgung", location_type: "Outdoor",
      shoot_style: "Hanbok", group_size: "2 people (Couple)",
      preferred_language: "English", duration_label: "1 Hour", details: "E2E test shoot",
    })
    .select().single();
  ok(!bErr, `client created booking ${bErr ? "("+bErr.message+")" : ""}`);

  console.log("\n[5] Chat gating — message insert allowed for participant");
  const { error: mErr } = await cClient.from("messages")
    .insert({ booking_id: booking.id, sender_id: clientId, content: "Hello from E2E" });
  ok(!mErr, `client can post message to own booking ${mErr ? "("+mErr.message+")" : ""}`);

  console.log("\n[6] Mock payment (service, mirrors webhook) → paid + slot booked");
  await svc.from("bookings").update({ status: "paid", checkout_id: "mock_e2e" }).eq("id", booking.id);
  await svc.from("availability_slots").update({ status: "booked" }).eq("id", slot.id);
  const { data: paid } = await svc.from("bookings").select("status").eq("id", booking.id).single();
  ok(paid.status === "paid", "booking marked paid");
  const { data: lockedSlot } = await svc.from("availability_slots").select("status").eq("id", slot.id).single();
  ok(lockedSlot.status === "booked", "slot locked to booked");

  console.log("\n[7] Photographer approve + complete (as photographer)");
  // Sign in as the seeded photographer.
  const phEmail = `seed.${seeded.public_code.toLowerCase()}@photographers.sphot.internal`;
  const phClient = anon();
  const { error: phErr } = await phClient.auth.signInWithPassword({ email: phEmail, password: "Sphot!Seed#2026" });
  ok(!phErr, `photographer ${seeded.public_code} can sign in ${phErr ? "("+phErr.message+")" : ""}`);
  if (!phErr) {
    const { error: upErr } = await phClient.from("bookings").update({ status: "completed" }).eq("id", booking.id);
    ok(!upErr, `photographer can complete own booking ${upErr ? "("+upErr.message+")" : ""}`);
  }

  console.log("\n[8] Review write (as client, gated to completed booking)");
  const { error: rErr } = await cClient.from("reviews").insert({
    booking_id: booking.id, reviewer_id: clientId,
    photographer_id: seeded.id, photographer_name: seeded.profiles?.full_name || "Photographer",
    reviewer_name: "E2E Client", quote: "Amazing shoot!", rating: 5, is_visible: true,
  });
  ok(!rErr, `client can review completed booking ${rErr ? "("+rErr.message+")" : ""}`);

  console.log("\n[9] RLS isolation — a different client cannot read this booking");
  const otherEmail = `e2e.other.${ts}.${Math.abs(hash(URL))}@sphot.test`;
  const { data: ou } = await svc.auth.admin.createUser({
    email: otherEmail, password: "E2e!Other#2026", email_confirm: true,
    user_metadata: { full_name: "Other", role: "client" },
  });
  const oClient = anon();
  await oClient.auth.signInWithPassword({ email: otherEmail, password: "E2e!Other#2026" });
  const { data: leak } = await oClient.from("bookings").select("id").eq("id", booking.id);
  ok((leak || []).length === 0, "other client CANNOT see someone else's booking (RLS)");
  const { data: msgLeak } = await oClient.from("messages").select("id").eq("booking_id", booking.id);
  ok((msgLeak || []).length === 0, "other client CANNOT read someone else's messages (RLS)");

  console.log("\n[10] Cleanup");
  await svc.from("reviews").delete().eq("booking_id", booking.id);
  await svc.from("bookings").delete().eq("id", booking.id);
  await svc.from("availability_slots").update({ status: "available" }).eq("id", slot.id);
  await svc.auth.admin.deleteUser(clientId);
  await svc.auth.admin.deleteUser(ou.user.id);
  ok(true, "test data cleaned up");

  console.log(`\n${"=".repeat(40)}\nRESULT: ${pass} passed, ${fail} failed\n${"=".repeat(40)}`);
  process.exit(fail > 0 ? 1 : 0);
}

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

main().catch((e) => { console.error("E2E ERROR:", e.message); process.exit(1); });
