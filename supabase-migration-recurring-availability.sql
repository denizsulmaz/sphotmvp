-- ============================================================
-- SPHOT recurring availability migration — run against the LIVE DB
-- (paste into the Supabase SQL editor; idempotent, safe to re-run).
--
-- Replaces bulk slot-row creation with recurrence RULES:
--   * availability_rules      — one row per recurring pattern
--                               ("every Mon–Fri 19:00–23:00 until next July")
--   * availability_exceptions — one row per day (or hour) off
--
-- availability_slots is kept, but only stores BOOKED hours (materialized
-- at booking time) plus any legacy 'available' rows, which remain valid
-- and are unioned into the computed availability. No data conversion
-- required; nothing is deleted.
-- ============================================================

-- ─── 1. Recurrence rules ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.availability_rules (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  -- Days of week the rule applies to. 0=Sunday … 6=Saturday.
  days_of_week    SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  -- Daily window in minutes from local midnight (studio timezone at
  -- expansion time). 19:00–23:00 => 1140 / 1380.
  start_minute    INTEGER NOT NULL CHECK (start_minute >= 0 AND start_minute < 1440),
  end_minute      INTEGER NOT NULL CHECK (end_minute > 0 AND end_minute <= 1440),
  valid_from      DATE NOT NULL,
  valid_until     DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_minute > start_minute),
  CHECK (valid_until >= valid_from),
  -- Hard cap: one rule spans at most ~1 year. Renew yearly.
  CHECK (valid_until <= valid_from + 370)
);
CREATE INDEX IF NOT EXISTS idx_rules_photographer ON public.availability_rules (photographer_id, valid_until);
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for availability rules" ON public.availability_rules;
CREATE POLICY "Allow public read for availability rules" ON public.availability_rules
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow photographers to manage own rules" ON public.availability_rules;
CREATE POLICY "Allow photographers to manage own rules" ON public.availability_rules
  FOR ALL USING (auth.uid() = photographer_id) WITH CHECK (auth.uid() = photographer_id);
DROP POLICY IF EXISTS "Allow admins to manage rules" ON public.availability_rules;
CREATE POLICY "Allow admins to manage rules" ON public.availability_rules
  FOR ALL USING (public.is_admin());

-- ─── 2. Exceptions (days/hours off) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.availability_exceptions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  -- Local calendar date in the studio timezone.
  date            DATE NOT NULL,
  -- NULL start/end = the whole day is off; otherwise a minute range is off.
  start_minute    INTEGER CHECK (start_minute IS NULL OR (start_minute >= 0 AND start_minute < 1440)),
  end_minute      INTEGER CHECK (end_minute IS NULL OR (end_minute > 0 AND end_minute <= 1440)),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((start_minute IS NULL AND end_minute IS NULL) OR (start_minute IS NOT NULL AND end_minute IS NOT NULL AND end_minute > start_minute))
);
-- One exception per (photographer, date, window); COALESCE folds whole-day NULLs.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_exceptions_photographer_date
  ON public.availability_exceptions (photographer_id, date, COALESCE(start_minute, -1));
CREATE INDEX IF NOT EXISTS idx_exceptions_photographer ON public.availability_exceptions (photographer_id, date);
ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for availability exceptions" ON public.availability_exceptions;
CREATE POLICY "Allow public read for availability exceptions" ON public.availability_exceptions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow photographers to manage own exceptions" ON public.availability_exceptions;
CREATE POLICY "Allow photographers to manage own exceptions" ON public.availability_exceptions
  FOR ALL USING (auth.uid() = photographer_id) WITH CHECK (auth.uid() = photographer_id);
DROP POLICY IF EXISTS "Allow admins to manage exceptions" ON public.availability_exceptions;
CREATE POLICY "Allow admins to manage exceptions" ON public.availability_exceptions
  FOR ALL USING (public.is_admin());

-- ─── 3. Unread messages: read tracking + email log ───────────
-- One row per (conversation, user): when they last had the chat open.
CREATE TABLE IF NOT EXISTS public.conversation_reads (
  booking_id   UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (booking_id, user_id)
);
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own read markers" ON public.conversation_reads;
CREATE POLICY "Users manage own read markers" ON public.conversation_reads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- New-message email cooldown per (conversation, recipient). Service-role only.
CREATE TABLE IF NOT EXISTS public.message_email_log (
  booking_id   UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (booking_id, recipient_id)
);
ALTER TABLE public.message_email_log ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service role reads/writes it.

-- Count conversations with messages newer than the caller's read marker.
CREATE OR REPLACE FUNCTION public.unread_conversations_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(DISTINCT m.booking_id)::int
  FROM public.messages m
  JOIN public.bookings b ON b.id = m.booking_id
  LEFT JOIN public.conversation_reads r
    ON r.booking_id = m.booking_id AND r.user_id = auth.uid()
  WHERE (b.client_id = auth.uid() OR b.photographer_id = auth.uid())
    AND m.sender_id IS DISTINCT FROM auth.uid()
    AND m.created_at > COALESCE(r.last_read_at, 'epoch'::timestamptz);
$$;
