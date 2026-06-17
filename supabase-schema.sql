-- ============================================================
-- SPHOT Supabase Schema
-- Paste this into: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── 1. Photographer view counts ────────────────────────────
CREATE TABLE IF NOT EXISTS photographer_views (
  photographer_id TEXT PRIMARY KEY,
  count           INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE photographer_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read counts (public)
CREATE POLICY "public_read_views" ON photographer_views
  FOR SELECT USING (true);

-- Allow anonymous upserts (increment from browser)
CREATE POLICY "public_upsert_views" ON photographer_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update_views" ON photographer_views
  FOR UPDATE USING (true);

-- RPC: Atomic increment (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_photographer_view(p_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO photographer_views (photographer_id, count, updated_at)
    VALUES (p_id, 1, NOW())
  ON CONFLICT (photographer_id)
  DO UPDATE SET
    count = photographer_views.count + 1,
    updated_at = NOW()
  RETURNING count INTO new_count;

  RETURN new_count;
END;
$$;

-- ─── 2. Client reviews ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
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

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_reviews" ON reviews
  FOR SELECT USING (is_visible = true);

-- Only allow inserts via service role (admin-only) — no public writes
-- To insert reviews: use Supabase Dashboard → Table Editor

-- ─── 3. Blog posts (optional — for future CMS migration) ────
-- Currently blogs are stored in-code (src/data/blog.ts)
-- When you have 20+ posts, create this table and migrate:
--
-- CREATE TABLE IF NOT EXISTS blog_posts (
--   id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   slug         TEXT UNIQUE NOT NULL,
--   title        TEXT NOT NULL,
--   excerpt      TEXT,
--   content_md   TEXT,
--   cover_image  TEXT,
--   tags         TEXT[],
--   published    BOOLEAN DEFAULT false,
--   created_at   TIMESTAMPTZ DEFAULT NOW()
-- );

-- ─── 4. User Profiles & Roles ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'photographer', 'client')),
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─── 5. Photographer Profiles ───────────────────────────────
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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.photographer_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can select approved photographers, admin/owner can select all
CREATE POLICY "Allow public read for approved photographers" ON public.photographer_profiles
  FOR SELECT USING (
    is_approved = true OR 
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Allow photographers to update own profile" ON public.photographer_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow admins to manage photographer profiles" ON public.photographer_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 6. Availability Slots ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for availability slots" ON public.availability_slots
  FOR SELECT USING (true);

CREATE POLICY "Allow photographers to manage own slots" ON public.availability_slots
  FOR ALL USING (
    auth.uid() = photographer_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'photographer')
  );

CREATE POLICY "Allow admins to manage all slots" ON public.availability_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 7. Bookings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  slot_id         UUID REFERENCES public.availability_slots(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'cancelled')),
  fee_krw         INTEGER NOT NULL DEFAULT 25000,
  checkout_id     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = photographer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Allow clients to create bookings" ON public.bookings
  FOR INSERT WITH CHECK (
    auth.uid() = client_id
  );

CREATE POLICY "Allow participants to update bookings" ON public.bookings
  FOR UPDATE USING (
    auth.uid() = client_id OR 
    auth.uid() = photographer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 8. Real-time Messages ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow booking participants to view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (auth.uid() = b.client_id OR auth.uid() = b.photographer_id)
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Allow booking participants to insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (auth.uid() = b.client_id OR auth.uid() = b.photographer_id)
    )
  );

-- ─── 9. Auth Trigger: Create profile automatically ──────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );

  -- If signing up as a photographer, also initialize photographer_profile
  IF COALESCE(new.raw_user_meta_data->>'role', 'client') = 'photographer' THEN
    INSERT INTO public.photographer_profiles (
      id, bio, base_price, locations, categories, portfolio_urls,
      instagram, instagram_url, languages, english_level, response_speed, delivery_time, styles, is_approved
    )
    VALUES (
      new.id, '', 0, '{}', '{}', '{}',
      COALESCE(new.raw_user_meta_data->>'instagram', ''),
      COALESCE(new.raw_user_meta_data->>'instagram_url', ''),
      '{}', 'Basic', '1–3 hours', '1 week', '{}', false
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.recreate_user_trigger()
RETURNS void AS $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT public.recreate_user_trigger();
