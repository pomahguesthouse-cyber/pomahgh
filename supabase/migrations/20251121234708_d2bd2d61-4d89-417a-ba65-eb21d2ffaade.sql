-- Add columns for video support to hero_slides
ALTER TABLE hero_slides 
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image';

ALTER TABLE hero_slides 
ADD COLUMN IF NOT EXISTS video_url text;

-- Make image_url nullable since we can use video instead
ALTER TABLE hero_slides 
ALTER COLUMN image_url DROP NOT NULL;

-- Create storage bucket for hero videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-videos', 'hero-videos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy for admin upload
CREATE POLICY "Admins can upload hero videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hero-videos' AND
  is_admin()
);

-- RLS Policy for public read
CREATE POLICY "Anyone can view hero videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'hero-videos');

-- RLS Policy for admin delete
CREATE POLICY "Admins can delete hero videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'hero-videos' AND
  is_admin()
);