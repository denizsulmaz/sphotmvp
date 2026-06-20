/**
 * Migrate the 19 static photographers (src/data/photographers.json) into Supabase
 * as real, approved, bookable photographer accounts.
 *
 * - Creates an auth user per photographer (deterministic email) via Admin API.
 * - The handle_new_user trigger creates profile + photographer_profile rows.
 * - We then enrich photographer_profiles with real data + approve them.
 * - Portfolio images reference existing static assets under /media/p/{ID}/.
 *
 * Idempotent: re-running updates existing records, never duplicates.
 *
 * Run: NODE_PATH=./node_modules node scripts/migrate-photographers.js
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from .env.local)
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// load .env.local
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SVC) throw new Error("Missing Supabase env vars");

const admin = createClient(URL, SVC, { auth: { persistSession: false, autoRefreshToken: false } });

const photographers = require("../src/data/photographers.json");

// ── field parsing helpers ──────────────────────────────────
const splitList = (s) =>
  (s || "")
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);

const parsePrice = (s) => {
  const n = parseInt(String(s || "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

// Map a static photographer's media folder to portfolio URLs (max 10 per spec).
const portfolioUrls = (id) => {
  const dir = path.join(__dirname, "..", "public", "media", "p", id);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d+\.(webp|jpg|jpeg|png|avif)$/i.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .slice(0, 10)
    .map((f) => `/media/p/${id}/${f}`);
};

const avatarUrl = (id) => {
  const p = path.join(__dirname, "..", "public", "media", "p", id, `${id}.webp`);
  return fs.existsSync(p) ? `/media/p/${id}/${id}.webp` : "";
};

const emailFor = (id) => `seed.${id.toLowerCase()}@photographers.sphot.internal`;
const PASSWORD = "Sphot!Seed#2026"; // seed accounts; not used for public login

async function findUserByEmail(email) {
  // paginate admin list (small user base)
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

async function run() {
  let created = 0, updated = 0;
  for (const p of photographers) {
    const id = p.ID;
    const email = emailFor(id);
    const name = p.Name;

    let user = await findUserByEmail(email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: "photographer",
          avatar_url: avatarUrl(id),
          instagram: p.Instagram || "",
          instagram_url: p["URL Instagram"] || "",
          seed_static_id: id,
        },
      });
      if (error) throw new Error(`createUser ${id}: ${error.message}`);
      user = data.user;
      created++;
    } else {
      updated++;
    }

    // Ensure profile reflects current name/avatar/role.
    const { error: profErr } = await admin
      .from("profiles")
      .upsert({ id: user.id, role: "photographer", full_name: name, avatar_url: avatarUrl(id) });
    if (profErr) throw new Error(`profiles upsert ${id}: ${profErr.message}`);

    // Enrich + approve photographer profile.
    const { error: ppErr } = await admin.from("photographer_profiles").upsert({
      id: user.id,
      bio: "",
      base_price: parsePrice(p["Min Price KRW(per hour & starting from)"]),
      locations: splitList(p["Location Types"]),
      categories: splitList(p["Global Categories"]),
      portfolio_urls: portfolioUrls(id),
      instagram: p.Instagram || "",
      instagram_url: p["URL Instagram"] || "",
      languages: splitList(p.Languages),
      english_level: p["English Level"] || "Basic",
      response_speed: p["Response Speed"] || "1–3 hours",
      delivery_time: p["Delivery Time"] || "1 week",
      styles: splitList([p.Style, p["Style (Other)"]].filter(Boolean).join(",")),
      is_approved: true,
      approved_at: new Date().toISOString(),
    });
    if (ppErr) throw new Error(`photographer_profiles upsert ${id}: ${ppErr.message}`);

    console.log(`✓ ${id} ${name} -> ${user.id} (${portfolioUrls(id).length} imgs, ₩${parsePrice(p["Min Price KRW(per hour & starting from)"])})`);
  }
  console.log(`\nDone. created=${created} updated=${updated} total=${photographers.length}`);
}

run().catch((e) => {
  console.error("MIGRATION ERROR:", e.message);
  process.exit(1);
});
