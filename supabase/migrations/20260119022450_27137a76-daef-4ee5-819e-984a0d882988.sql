-- Create editor-images bucket for uploaded images
INSERT INTO storage.buckets (id, name, public)
VALUES ('editor-images', 'editor-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for public read
CREATE POLICY "Public read editor-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'editor-images');

-- RLS policy for authenticated upload
CREATE POLICY "Auth users upload editor-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'editor-images');

-- RLS policy for authenticated update
CREATE POLICY "Auth users update editor-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'editor-images');

-- RLS policy for authenticated delete
CREATE POLICY "Auth users delete editor-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'editor-images');