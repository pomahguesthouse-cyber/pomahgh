-- Create room_panoramas table for multiple 360° views per room
CREATE TABLE room_panoramas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_room_panoramas_room_id ON room_panoramas(room_id);
CREATE INDEX idx_room_panoramas_active ON room_panoramas(is_active);

-- Enable RLS
ALTER TABLE room_panoramas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active panoramas"
ON room_panoramas FOR SELECT
USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert panoramas"
ON room_panoramas FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update panoramas"
ON room_panoramas FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete panoramas"
ON room_panoramas FOR DELETE
USING (is_admin());

-- Update room_hotspots table
ALTER TABLE room_hotspots 
ADD COLUMN panorama_id UUID REFERENCES room_panoramas(id) ON DELETE CASCADE;

ALTER TABLE room_hotspots 
ADD COLUMN target_panorama_id UUID REFERENCES room_panoramas(id) ON DELETE SET NULL;

-- Migrate existing virtual_tour_url to room_panoramas
INSERT INTO room_panoramas (room_id, title, image_url, is_primary)
SELECT 
  id as room_id,
  'Main View' as title,
  virtual_tour_url as image_url,
  true as is_primary
FROM rooms
WHERE virtual_tour_url IS NOT NULL AND virtual_tour_url != '';

-- Link existing hotspots to primary panoramas
UPDATE room_hotspots rh
SET panorama_id = rp.id
FROM room_panoramas rp
WHERE rh.room_id = rp.room_id 
  AND rp.is_primary = true
  AND rh.panorama_id IS NULL;

-- Update trigger for updated_at
CREATE TRIGGER update_room_panoramas_updated_at
BEFORE UPDATE ON room_panoramas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();