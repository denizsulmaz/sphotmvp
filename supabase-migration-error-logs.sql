-- ============================================================
-- SPHOT client error logging — run against the LIVE DB
-- (paste into the Supabase SQL editor; idempotent).
-- Errors are inserted by the service role via /api/log-error;
-- admins read them in the admin "Errors" tab.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.error_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message     TEXT NOT NULL,
  stack       TEXT,
  page        TEXT,
  user_agent  TEXT,
  source      TEXT NOT NULL DEFAULT 'client', -- client | boundary | unhandledrejection
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs (created_at DESC);
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read error logs" ON public.error_logs;
CREATE POLICY "Admins read error logs" ON public.error_logs
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins manage error logs" ON public.error_logs;
CREATE POLICY "Admins manage error logs" ON public.error_logs
  FOR DELETE USING (public.is_admin());
-- No INSERT policy: writes go through the service role only.
