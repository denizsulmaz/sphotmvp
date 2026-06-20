# Sphot V3 — Handoff / Status

Status: **The platform is working end-to-end and verified.** Build is green (104 pages),
typecheck clean, and an automated end-to-end test passes 18/18 against the live Supabase DB.

## What was wrong (and is now fixed)
The code was never the problem — it built fine. The platform "didn't work" because the **live
Supabase database was empty of the V3 schema** (it had only `reviews` + `photographer_views`).
Every auth/booking/chat query hit non-existent tables and silently failed. Lemon Squeezy was also
entirely unconfigured.

## What was done

### Database (live Supabase, ap-southeast-2)
- Applied the full hardened, idempotent schema → `supabase-schema.sql`
  (profiles, photographer_profiles, availability_slots, bookings, messages, reviews, auth trigger,
  RLS via `is_admin()` to avoid recursion, indexes, realtime publication, storage buckets).
- Migrated all **19 static photographers → real approved, bookable Supabase accounts** with their
  original portfolio images and a public code (e.g. `#S01019`).
- Created an **admin account** and seeded availability slots for 3 photographers.

### App
- **Payments**: toggleable `mock` / `live` mode. Mock mode auto-succeeds (mirrors the LS webhook)
  so the full funnel is testable now; flip to live by adding LS env vars. See `.env.local.example`.
- **Reviews**: clients can leave a 1–5★ + comment on completed bookings (`ReviewModal`).
- **Real availability only**: removed fabricated/mock time-slots; booking always references a real slot.
- **Public photographer codes** (`#S01019`) shown on cards, profiles, chat, and the photographer's own profile.
- **i18n**: system now falls back EN when a key is untranslated; checkout funnel + chat + review are
  translated EN + TR (ru/ko fall back to EN until a native review).
- **SEO/Perf**: per-route metadata + OpenGraph, `robots.txt`, `sitemap.xml`, and profile/checkout pages
  are statically pre-rendered for every approved photographer (DB-driven `generateStaticParams`).
- **Brand assets centralized** → see "Rebranding" below.
- **Deploy**: removed the stale GitHub Pages workflow (static export can't run the webhook/SSR).
  Vercel is the single deploy target.

## Logins for testing
- **Admin**: `admin@booksphot.com` / `Sphot-Admin-2026!`
- **Photographer** (e.g. Josh): `seed.s01001@photographers.sphot.internal` / `Sphot!Seed#2026`
  (pattern: `seed.<code>@photographers.sphot.internal`, codes S01001–S01023)
- **Client**: sign up through the UI (or checkout inline signup).

## Required env vars (local `.env.local` and Vercel)
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY   # public
SUPABASE_SERVICE_ROLE_KEY                                 # server-only
NEXT_PUBLIC_PAYMENTS_MODE=mock                            # mock | live
# When going live with payments, add:
NEXT_PUBLIC_LEMONSQUEEZY_STORE_ID, NEXT_PUBLIC_LEMONSQUEEZY_PRODUCT_ID
LEMONSQUEEZY_WEBHOOK_SECRET, LEMONSQUEEZY_API_KEY
```
> ⚠️ On Vercel, set `SUPABASE_SERVICE_ROLE_KEY` (build-time `generateStaticParams`/`sitemap` use it;
> they degrade gracefully if absent).

## Rebranding (single source of truth)
- **Colors**: edit the RGB-channel CSS vars in `src/app/globals.css` (`--accent`, `--background`, …).
  Tailwind (`bg-accent`, opacity modifiers like `accent/20`) and raw CSS both follow automatically.
  Mirror in `src/lib/brand.ts` for JS-side use.
- **Font**: change the `next/font` import + `brandFont` line in `src/app/layout.tsx` (exposes
  `--font-brand`, used by Tailwind `font-sans`). Note name in `src/lib/brand.ts`.
- **Name / tagline / socials / contact / fee**: `src/lib/brand.ts`.

## Tooling / scripts (not used at runtime)
- `scripts/db.js` — run SQL against Supabase: `SUPA_PW='<db-pw>' node scripts/db.js exec <file.sql>`
- `scripts/migrate-photographers.js` — idempotent photographer seed.
- `scripts/seed-admin-and-slots.js` — admin + availability seed.
- `scripts/verify-e2e.js` — full lifecycle + RLS test: `node scripts/verify-e2e.js`.

## Verify it yourself
```
npm run build           # must be green
node scripts/verify-e2e.js   # 18/18 pass
npm start               # then browse localhost:3000
```

## Next phase (not started — per your note)
Separate photographer app: manage portfolio / calendar / chat on web.
