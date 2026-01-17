-- Tambah kolom alt_text ke tabel yang memiliki gambar
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS image_alt TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS image_alts JSONB DEFAULT '[]'::jsonb;

ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS alt_text TEXT;

ALTER TABLE facility_hero_slides ADD COLUMN IF NOT EXISTS alt_text TEXT;

ALTER TABLE explore_hero_slides ADD COLUMN IF NOT EXISTS alt_text TEXT;

ALTER TABLE city_attractions ADD COLUMN IF NOT EXISTS image_alt TEXT;
ALTER TABLE city_attractions ADD COLUMN IF NOT EXISTS gallery_alts JSONB DEFAULT '[]'::jsonb;

ALTER TABLE room_panoramas ADD COLUMN IF NOT EXISTS alt_text TEXT;