-- Public, human-readable photographer code (e.g. S01019) shown on profiles & chat.
ALTER TABLE public.photographer_profiles ADD COLUMN IF NOT EXISTS public_code TEXT;

-- Backfill seeded photographers from the auth metadata seed_static_id.
UPDATE public.photographer_profiles pp
SET public_code = (u.raw_user_meta_data->>'seed_static_id')
FROM auth.users u
WHERE u.id = pp.id
  AND pp.public_code IS NULL
  AND COALESCE(u.raw_user_meta_data->>'seed_static_id', '') <> '';

-- For any photographer still without a code, generate a sequential one (S01024, ...).
-- Sequence starts above the seeded range.
CREATE SEQUENCE IF NOT EXISTS public.photographer_code_seq START 1024;

DO $$
DECLARE r RECORD; n INTEGER;
BEGIN
  FOR r IN SELECT id FROM public.photographer_profiles WHERE public_code IS NULL OR public_code = '' LOOP
    n := nextval('public.photographer_code_seq');
    UPDATE public.photographer_profiles SET public_code = 'S0' || n WHERE id = r.id;
  END LOOP;
END $$;

-- Unique index so codes don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS idx_photographer_public_code
  ON public.photographer_profiles (public_code);

-- Auto-assign a code to future photographers on insert.
CREATE OR REPLACE FUNCTION public.assign_photographer_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.public_code IS NULL OR NEW.public_code = '' THEN
    NEW.public_code := 'S0' || nextval('public.photographer_code_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_photographer_code ON public.photographer_profiles;
CREATE TRIGGER trg_assign_photographer_code
  BEFORE INSERT ON public.photographer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_photographer_code();
