-- Create storage bucket for attraction images
INSERT INTO storage.buckets (id, name, public)
VALUES ('attraction-images', 'attraction-images', true);

-- RLS Policy untuk akses publik (read)
CREATE POLICY "Public can view attraction images"
ON storage.objects FOR SELECT
USING (bucket_id = 'attraction-images');

-- RLS Policy untuk admin (upload)
CREATE POLICY "Admins can upload attraction images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attraction-images' AND public.is_admin());

-- RLS Policy untuk admin (update)
CREATE POLICY "Admins can update attraction images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'attraction-images' AND public.is_admin());

-- RLS Policy untuk admin (delete)
CREATE POLICY "Admins can delete attraction images"
ON storage.objects FOR DELETE
USING (bucket_id = 'attraction-images' AND public.is_admin());