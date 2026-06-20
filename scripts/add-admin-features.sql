-- ============================================================
-- Admin features: profile claim tokens + chat/conversation reports
-- ============================================================

-- ─── Claim tokens (photographers claim their seed profile) ──
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
-- RLS on, no policies → only the service-role key (API routes) touch it.
ALTER TABLE public.claim_tokens ENABLE ROW LEVEL SECURITY;

-- ─── Reports (users flag a booking conversation) ────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id   UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  reporter_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status, created_at DESC);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Participants of the booking may create a report for it.
DROP POLICY IF EXISTS "participants_create_report" ON public.reports;
CREATE POLICY "participants_create_report" ON public.reports
  FOR INSERT WITH CHECK (
    auth.uid() = reporter_id AND
    EXISTS (SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id AND (auth.uid() = b.client_id OR auth.uid() = b.photographer_id))
  );

-- Admins manage all reports.
DROP POLICY IF EXISTS "admins_manage_reports" ON public.reports;
CREATE POLICY "admins_manage_reports" ON public.reports FOR ALL USING (public.is_admin());

-- Reporters can see their own reports.
DROP POLICY IF EXISTS "reporters_read_own" ON public.reports;
CREATE POLICY "reporters_read_own" ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR public.is_admin());
