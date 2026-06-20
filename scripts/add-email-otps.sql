-- Custom email OTP store (6-digit codes, 15-min expiry, server-verified).
-- Codes are stored hashed; only API routes (service role) touch this table.
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

-- RLS on, no policies → only the service-role key (API routes) can read/write.
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Helper: purge expired/old codes (called opportunistically by the send route).
CREATE OR REPLACE FUNCTION public.purge_expired_otps()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.email_otps
  WHERE expires_at < NOW() - INTERVAL '1 day';
$$;
