-- Create storage bucket for 360 images
INSERT INTO storage.buckets (id, name, public)
VALUES ('360-images', '360-images', true);

-- RLS Policy: Anyone can view 360 images (public bucket)
CREATE POLICY "Anyone can view 360 images"
ON storage.objects FOR SELECT
USING (bucket_id = '360-images');

-- RLS Policy: Only authenticated users can upload 360 images
CREATE POLICY "Authenticated users can upload 360 images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = '360-images' AND auth.role() = 'authenticated');

-- RLS Policy: Only admins can delete 360 images
CREATE POLICY "Admins can delete 360 images"
ON storage.objects FOR DELETE
USING (bucket_id = '360-images' AND public.is_admin());