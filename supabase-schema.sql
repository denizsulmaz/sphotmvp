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
