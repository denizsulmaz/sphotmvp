-- ============================================================
-- SPHOT V3 Supabase Schema — idempotent & hardened
-- Safe to run repeatedly. Run via: node scripts/db.js exec supabase-schema.sql
-- ============================================================

-- ─── 0. Helpers ─────────────────────────────────────────────
-- SECURITY DEFINER admin check avoids RLS recursion on profiles.
-- plpgsql (not sql) so the body is resolved at call time, letting this run
-- before public.profiles exists on a clean database.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO result;
  RETURN result;
END;
$$;

-- Generic updated_at touch trigger fn.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── 1. Photographer view counts ────────────────────────────
CREATE TABLE IF NOT EXISTS public.photographer_views (
  photographer_id TEXT PRIMARY KEY,
  count           INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.photographer_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_views" ON public.photographer_views;
CREATE POLICY "public_read_views" ON public.photographer_views FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_upsert_views" ON public.photographer_views;
CREATE POLICY "public_upsert_views" ON public.photographer_views FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_views" ON public.photographer_views;
CREATE POLICY "public_update_views" ON public.photographer_views FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION public.increment_photographer_view(p_id TEXT)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE new_count INTEGER;
BEGIN
  INSERT INTO public.photographer_views (photographer_id, count, updated_at)
    VALUES (p_id, 1, NOW())
  ON CONFLICT (photographer_id)
  DO UPDATE SET count = public.photographer_views.count + 1, updated_at = NOW()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

-- ─── 2. User Profiles & Roles ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'photographer', 'client')),
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for profiles" ON public.profiles;
CREATE POLICY "Allow public read for profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Allow admins to manage profiles" ON public.profiles;
CREATE POLICY "Allow admins to manage profiles" ON public.profiles
  FOR ALL USING (public.is_admin());

-- ─── 3. Photographer Profiles ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.photographer_profiles (
  id              UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  bio             TEXT,
  base_price      INTEGER DEFAULT 0,
  locations       TEXT[] DEFAULT '{}',
  categories      TEXT[] DEFAULT '{}',
  portfolio_urls  TEXT[] DEFAULT '{}',
  instagram       TEXT,
  instagram_url   TEXT,
  languages       TEXT[] DEFAULT '{}',
  english_level   TEXT DEFAULT 'Basic',
  response_speed  TEXT DEFAULT '1–3 hours',
  delivery_time   TEXT DEFAULT '1 week',
  styles          TEXT[] DEFAULT '{}',
  is_approved     BOOLEAN DEFAULT false,
  approved_at     TIMESTAMPTZ,
  public_code     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.photographer_profiles ADD COLUMN IF NOT EXISTS public_code TEXT;
ALTER TABLE public.photographer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for approved photographers" ON public.photographer_profiles;
CREATE POLICY "Allow public read for approved photographers" ON public.photographer_profiles
  FOR SELECT USING (is_approved = true OR auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "Allow photographers to update own profile" ON public.photographer_profiles;
CREATE POLICY "Allow photographers to update own profile" ON public.photographer_profiles
  FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Allow admins to manage photographer profiles" ON public.photographer_profiles;
CREATE POLICY "Allow admins to manage photographer profiles" ON public.photographer_profiles
  FOR ALL USING (public.is_admin());

-- ─── 4. Availability Slots ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_slots_photographer ON public.availability_slots (photographer_id, start_time);
CREATE INDEX IF NOT EXISTS idx_slots_status ON public.availability_slots (status);

DROP POLICY IF EXISTS "Allow public read for availability slots" ON public.availability_slots;
CREATE POLICY "Allow public read for availability slots" ON public.availability_slots
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow photographers to manage own slots" ON public.availability_slots;
CREATE POLICY "Allow photographers to manage own slots" ON public.availability_slots
  FOR ALL USING (auth.uid() = photographer_id);
DROP POLICY IF EXISTS "Allow admins to manage all slots" ON public.availability_slots;
CREATE POLICY "Allow admins to manage all slots" ON public.availability_slots
  FOR ALL USING (public.is_admin());

-- ─── 5. Bookings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  photographer_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  slot_id          UUID REFERENCES public.availability_slots(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'confirmed', 'completed', 'cancellation_requested', 'cancelled', 'refunded')),
  fee_krw          INTEGER NOT NULL DEFAULT 25000,
  checkout_id      TEXT,
  -- structured shoot details (mirrors checkout wizard)
  shoot_location   TEXT,
  location_type    TEXT,
  shoot_style      TEXT,
  group_size       TEXT,
  preferred_language TEXT,
  duration_label   TEXT,
  details          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Add columns if upgrading an older bookings table.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS shoot_location TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS location_type TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS shoot_style TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS group_size TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS preferred_language TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_label TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
-- Refund bookkeeping (mirrors the Lemon Squeezy refund response; null until refunded).
-- refund_amount is stored in the order's own currency minor units (e.g. KRW=won, USD=cents),
-- and refund_currency records which — so the value is correct regardless of store currency.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_amount INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_currency TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_id TEXT;
-- Who/why a cancellation was requested (set when a user requests cancellation).
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancel_requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ;
-- Widen status check to include 'confirmed', 'cancellation_requested', and 'refunded'.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'paid', 'confirmed', 'completed', 'cancellation_requested', 'cancelled', 'refunded'));

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.bookings (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_photographer ON public.bookings (photographer_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_bookings_touch ON public.bookings;
CREATE TRIGGER trg_bookings_touch BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "Allow users to view their own bookings" ON public.bookings;
CREATE POLICY "Allow users to view their own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = photographer_id OR public.is_admin());
DROP POLICY IF EXISTS "Allow clients to create bookings" ON public.bookings;
CREATE POLICY "Allow clients to create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);
DROP POLICY IF EXISTS "Allow participants to update bookings" ON public.bookings;
CREATE POLICY "Allow participants to update bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = photographer_id OR public.is_admin());

-- ─── 5b. Refunds (admin-issued, reason-required audit trail) ──
-- One row per refund issued. The financial source of truth is Lemon Squeezy;
-- this table records OUR internal context: which admin, why, how much, when.
-- amount is stored in the order currency's minor units; currency records which.
CREATE TABLE IF NOT EXISTS public.refunds (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id    UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  issued_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason        TEXT NOT NULL,
  amount        INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'KRW',
  ls_refund_id  TEXT,            -- Lemon Squeezy refund/order id (null in mock mode)
  is_live       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refunds_booking ON public.refunds (booking_id, created_at DESC);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
-- Participants can read refunds tied to their booking; admins can read all.
DROP POLICY IF EXISTS "Read own or admin refunds" ON public.refunds;
CREATE POLICY "Read own or admin refunds" ON public.refunds
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.client_id = auth.uid() OR b.photographer_id = auth.uid())
    )
  );
-- Writes happen only via the service-role API route, which bypasses RLS; no
-- client-side insert policy is granted on purpose.

-- ─── 6. Real-time Messages ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- System messages (booking confirmation, cancellation/refund notices) have no
-- human sender and a 'kind' discriminator. Allow null sender + add 'kind'.
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_messages_booking ON public.messages (booking_id, created_at);

-- Chat is unlocked only after the reservation fee is paid (status not 'pending').
DROP POLICY IF EXISTS "Allow booking participants to view messages" ON public.messages;
CREATE POLICY "Allow booking participants to view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
            AND (auth.uid() = b.client_id OR auth.uid() = b.photographer_id))
    OR public.is_admin()
  );
DROP POLICY IF EXISTS "Allow booking participants to insert messages" ON public.messages;
CREATE POLICY "Allow booking participants to insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
            AND (auth.uid() = b.client_id OR auth.uid() = b.photographer_id))
  );

-- ─── 7. Reviews (linked to bookings, gated post-completion) ──
CREATE TABLE IF NOT EXISTS public.reviews (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id    TEXT NOT NULL,
  photographer_name  TEXT NOT NULL,
  reviewer_name      TEXT NOT NULL,
  reviewer_country   TEXT,
  category           TEXT,
  quote              TEXT NOT NULL,
  result_photo_url   TEXT,
  rating             INTEGER DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_visible         BOOLEAN DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reviews_photographer ON public.reviews (photographer_id);

DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
CREATE POLICY "public_read_reviews" ON public.reviews FOR SELECT USING (is_visible = true OR public.is_admin());
-- Clients may insert a review only for their own completed booking.
DROP POLICY IF EXISTS "clients_insert_review" ON public.reviews;
CREATE POLICY "clients_insert_review" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id AND b.client_id = auth.uid() AND b.status = 'completed')
  );
DROP POLICY IF EXISTS "admins_manage_reviews" ON public.reviews;
CREATE POLICY "admins_manage_reviews" ON public.reviews FOR ALL USING (public.is_admin());

-- ─── 7b. Email OTP store (custom 6-digit codes, 15-min expiry) ──
CREATE TABLE IF NOT EXISTS public.email_otps (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  purpose     TEXT NOT NULL DEFAULT 'signup',
  attempts    INTEGER NOT NULL DEFAULT 0,
  consumed    BOOLEAN NOT NULL DEFAULT false,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON public.email_otps (email, created_at DESC);
-- RLS on, no policies → only the service-role key (API routes) can touch it.
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.purge_expired_otps()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.email_otps WHERE expires_at < NOW() - INTERVAL '1 day';
$$;

-- ─── 7c. Admin: claim tokens + conversation reports ─────────
CREATE TABLE IF NOT EXISTS public.claim_tokens (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token_hash       TEXT NOT NULL,
  invited_email    TEXT NOT NULL,
  consumed         BOOLEAN NOT NULL DEFAULT false,
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_photographer ON public.claim_tokens (photographer_id, created_at DESC);
ALTER TABLE public.claim_tokens ENABLE ROW LEVEL SECURITY;
-- (no policies → service-role only)

CREATE TABLE IF NOT EXISTS public.reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id   UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  reporter_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status, created_at DESC);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participants_create_report" ON public.reports;
CREATE POLICY "participants_create_report" ON public.reports
  FOR INSERT WITH CHECK (
    auth.uid() = reporter_id AND
    EXISTS (SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id AND (auth.uid() = b.client_id OR auth.uid() = b.photographer_id))
  );
DROP POLICY IF EXISTS "admins_manage_reports" ON public.reports;
CREATE POLICY "admins_manage_reports" ON public.reports FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "reporters_read_own" ON public.reports;
CREATE POLICY "reporters_read_own" ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR public.is_admin());

-- ─── 8. Auth Trigger: auto-create profile on signup ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  IF COALESCE(new.raw_user_meta_data->>'role', 'client') = 'photographer' THEN
    INSERT INTO public.photographer_profiles (id, instagram, instagram_url)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'instagram', ''),
      COALESCE(new.raw_user_meta_data->>'instagram_url', '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 9. Realtime: publish chat + bookings ───────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;
