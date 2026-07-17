-- ============================================================
-- SPHOT security hardening migration — run against the LIVE DB
-- (paste into the Supabase SQL editor and run once; idempotent,
-- safe to re-run).
--
-- What it does:
--   1. profiles: users can no longer change their own `role`
--      (privilege-escalation fix) — enforced via WITH CHECK using
--      a SECURITY DEFINER role lookup.
--   2. photographer_profiles: owners can no longer change
--      is_approved / approved_at / public_code; admin approval via
--      is_admin() is preserved.
--   3. bookings: participant UPDATE policy dropped — status/fee
--      changes only via service-role API routes (update-status,
--      cancel-request, refund, mock-pay, webhooks). Admin UPDATE kept.
--   4. photographer_views: public INSERT/UPDATE policies dropped;
--      increments only via SECURITY DEFINER RPC (adds exactly 1).
--   5. bookings.extra_slot_ids column added (multi-slot bookings).
--   6. Partial unique index: one active booking per slot.
--   7. Unique index on availability_slots(photographer_id, start_time).
--
-- NOTE: steps 6/7 will fail if the live data already contains
-- duplicate active bookings for one slot, or duplicate slot start
-- times for one photographer. De-duplicate first if that happens.
-- ============================================================

-- ─── 1. profiles: forbid self role change ───────────────────
-- SECURITY DEFINER role lookup (avoids recursive policy evaluation).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE result text;
BEGIN
  SELECT role INTO result FROM public.profiles WHERE id = auth.uid();
  RETURN result;
END;
$$;

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role IS NOT DISTINCT FROM public.current_user_role());

-- ─── 2. photographer_profiles: lock approval fields ─────────
-- SECURITY DEFINER check that approval/identity fields are unchanged in an
-- owner UPDATE (compares the NEW values against the stored row; STABLE means
-- the lookup sees the pre-update snapshot). Admins bypass via their own policy.
CREATE OR REPLACE FUNCTION public.photographer_locked_fields_unchanged(
  p_id UUID, p_is_approved BOOLEAN, p_approved_at TIMESTAMPTZ, p_public_code TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE result boolean;
BEGIN
  SELECT p_is_approved IS NOT DISTINCT FROM pp.is_approved
     AND p_approved_at IS NOT DISTINCT FROM pp.approved_at
     AND p_public_code IS NOT DISTINCT FROM pp.public_code
    INTO result
    FROM public.photographer_profiles pp
   WHERE pp.id = p_id;
  RETURN COALESCE(result, false);
END;
$$;

DROP POLICY IF EXISTS "Allow photographers to update own profile" ON public.photographer_profiles;
CREATE POLICY "Allow photographers to update own profile" ON public.photographer_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND public.photographer_locked_fields_unchanged(id, is_approved, approved_at, public_code)
  );

-- ─── 3. bookings: drop participant UPDATE, keep admin ───────
-- All legitimate status/fee changes go through service-role API routes,
-- which bypass RLS. Browsers must not flip status or fee_krw directly.
DROP POLICY IF EXISTS "Allow participants to update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow admins to update bookings" ON public.bookings;
CREATE POLICY "Allow admins to update bookings" ON public.bookings
  FOR UPDATE USING (public.is_admin());

-- ─── 4. photographer_views: writes only via increment RPC ───
DROP POLICY IF EXISTS "public_upsert_views" ON public.photographer_views;
DROP POLICY IF EXISTS "public_update_views" ON public.photographer_views;

CREATE OR REPLACE FUNCTION public.increment_photographer_view(p_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- ─── 5. bookings.extra_slot_ids ──────────────────────────────
-- Extra availability slots reserved by a multi-slot booking (released on cancel/refund).
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS extra_slot_ids UUID[] NOT NULL DEFAULT '{}';

-- ─── 6. One active booking per slot ──────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bookings_active_slot ON public.bookings (slot_id)
  WHERE slot_id IS NOT NULL AND status NOT IN ('cancelled', 'refunded');

-- ─── 7. No duplicate slot start times per photographer ───────
CREATE UNIQUE INDEX IF NOT EXISTS uniq_slots_photographer_start
  ON public.availability_slots (photographer_id, start_time);
