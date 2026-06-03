-- Fix search_path on trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Restrict checkout RPC to authenticated only (remove anon/public execute)
REVOKE EXECUTE ON FUNCTION public.create_pos_transaction(text, integer, integer, integer, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_pos_transaction(text, integer, integer, integer, jsonb) FROM anon;

-- Storage policies for menu-images (private bucket, owner-scoped by first path segment = uid)
CREATE POLICY "owner read menu images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "owner upload menu images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "owner update menu images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "owner delete menu images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]);