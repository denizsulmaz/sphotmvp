-- ============================================================
-- SPHOT availability reminder log — run against the LIVE DB
-- (paste into the Supabase SQL editor; idempotent).
-- Tracks when each photographer was last reminded that their
-- availability horizon is under 7 days (7-day resend cooldown).
-- Service-role only.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.availability_reminder_log (
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  last_sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.availability_reminder_log ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service role reads/writes it.
