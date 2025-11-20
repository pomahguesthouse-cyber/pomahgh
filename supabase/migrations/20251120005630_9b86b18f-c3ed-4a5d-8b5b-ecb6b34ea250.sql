-- Add storage bucket for room images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-images',
  'room-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Storage policies for room images
CREATE POLICY "Anyone can view room images"
ON storage.objects FOR SELECT
USING (bucket_id = 'room-images');

CREATE POLICY "Admins can upload room images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'room-images' AND is_admin());

CREATE POLICY "Admins can update room images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'room-images' AND is_admin());

CREATE POLICY "Admins can delete room images"
ON storage.objects FOR DELETE
USING (bucket_id = 'room-images' AND is_admin());

-- Add new columns to rooms table
ALTER TABLE rooms
ADD COLUMN image_urls text[] DEFAULT '{}',
ADD COLUMN room_count integer DEFAULT 1 NOT NULL,
ADD COLUMN allotment integer DEFAULT 0 NOT NULL,
ADD COLUMN base_price numeric,
ADD COLUMN final_price numeric;

-- Migrate existing image_url to image_urls array
UPDATE rooms
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND image_url != '';

-- Add check constraint for room_count
ALTER TABLE rooms
ADD CONSTRAINT rooms_room_count_positive CHECK (room_count > 0);

-- Add check constraint for allotment
ALTER TABLE rooms
ADD CONSTRAINT rooms_allotment_non_negative CHECK (allotment >= 0);