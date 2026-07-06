-- ============================================================
-- SPHOT V3.1 Migration — update status check & photographer timezone
-- Run via: node scripts/db.js exec scripts/update-schema.sql (requires SUPA_PW)
-- or execute directly in Supabase Dashboard SQL Editor
-- ============================================================

-- 1. Update check constraint on bookings status
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending', 
    'paid', 
    'confirmed', 
    'completed', 
    'cancellation_requested', 
    'cancelled', 
    'refunded', 
    'booking', 
    'shooted', 
    'edited', 
    'sent'
  ));

-- 2. Add timezone column to photographer profiles
ALTER TABLE public.photographer_profiles ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Seoul';
