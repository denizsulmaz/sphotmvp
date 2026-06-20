-- Portfolio storage bucket (public read; photographer-scoped writes by folder = their uid).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolios', 'portfolios', true, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','image/avif'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Avatars bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880,
        ARRAY['image/jpeg','image/png','image/webp','image/avif'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: public read, authenticated users write only within a folder named after their uid.
DROP POLICY IF EXISTS "portfolios_public_read" ON storage.objects;
CREATE POLICY "portfolios_public_read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('portfolios','avatars'));

DROP POLICY IF EXISTS "portfolios_owner_write" ON storage.objects;
CREATE POLICY "portfolios_owner_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('portfolios','avatars')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "portfolios_owner_update" ON storage.objects;
CREATE POLICY "portfolios_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN ('portfolios','avatars')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "portfolios_owner_delete" ON storage.objects;
CREATE POLICY "portfolios_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('portfolios','avatars')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Backfill any auth users that predate the handle_new_user trigger.
INSERT INTO public.profiles (id, full_name, role, avatar_url)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
       COALESCE(u.raw_user_meta_data->>'role', 'client'),
       COALESCE(u.raw_user_meta_data->>'avatar_url', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
