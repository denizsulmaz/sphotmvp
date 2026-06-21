-- ─── Refunds & cancellation requests ─────────────────────────────────
-- Idempotent. Apply with:
--   SUPA_PW='<db-pw>' node scripts/db.js exec scripts/add-refunds.sql

-- 1. New booking statuses + cancellation request bookkeeping.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancel_requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_amount INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_currency TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_id TEXT;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'paid', 'confirmed', 'completed', 'cancellation_requested', 'cancelled', 'refunded'));

-- 2. Refunds audit table (one row per refund; our internal context).
CREATE TABLE IF NOT EXISTS public.refunds (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id    UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  issued_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason        TEXT NOT NULL,
  amount        INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'KRW',
  ls_refund_id  TEXT,
  is_live       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refunds_booking ON public.refunds (booking_id, created_at DESC);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

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
