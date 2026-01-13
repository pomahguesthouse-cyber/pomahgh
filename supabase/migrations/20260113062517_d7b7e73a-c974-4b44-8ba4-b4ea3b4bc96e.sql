-- Add google_place_id column to hotel_settings
ALTER TABLE hotel_settings 
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Set Place ID for Pomah Guesthouse
UPDATE hotel_settings 
SET google_place_id = 'ChIJaUZXtrSLcC4RwmPfjuHaiO8'
WHERE id = (SELECT id FROM hotel_settings LIMIT 1);