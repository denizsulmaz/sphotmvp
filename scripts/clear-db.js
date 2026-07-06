global.WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Load .env.local
const env = {};
const envPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SVC) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const svc = createClient(URL, SVC, { auth: { persistSession: false, autoRefreshToken: false } });

async function clearDb() {
  console.log("Starting SPHOT database cleanup...");

  try {
    // 1. Delete all reviews
    console.log("Deleting reviews...");
    const { error: revErr } = await svc
      .from("reviews")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // deletes all
    if (revErr) throw revErr;
    console.log("✓ Reviews deleted.");

    // 2. Delete all messages
    console.log("Deleting messages...");
    const { error: msgErr } = await svc
      .from("messages")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (msgErr) throw msgErr;
    console.log("✓ Messages deleted.");

    // 3. Delete all bookings
    console.log("Deleting bookings...");
    const { error: bkgErr } = await svc
      .from("bookings")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (bkgErr) throw bkgErr;
    console.log("✓ Bookings deleted.");

    // 4. Reset availability slots status to 'available'
    console.log("Resetting availability slots...");
    const { error: slotErr } = await svc
      .from("availability_slots")
      .update({ status: "available" })
      .eq("status", "booked");
    if (slotErr) throw slotErr;
    console.log("✓ Booked slots reset to available.");

    console.log("SPHOT database cleanup completed successfully!");
  } catch (err) {
    console.error("Error during database cleanup:", err.message || err);
    process.exit(1);
  }
}

clearDb();
