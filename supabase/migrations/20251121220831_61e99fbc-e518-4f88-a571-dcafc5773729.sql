-- Add minimum and maximum stay settings to hotel_settings
ALTER TABLE hotel_settings
ADD COLUMN IF NOT EXISTS min_stay_nights integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_stay_nights integer DEFAULT 30;

-- Add check constraint to ensure min_stay is at least 1
ALTER TABLE hotel_settings
ADD CONSTRAINT check_min_stay_positive CHECK (min_stay_nights >= 1);

-- Add check constraint to ensure max_stay is greater than min_stay
ALTER TABLE hotel_settings
ADD CONSTRAINT check_max_stay_greater_than_min CHECK (max_stay_nights >= min_stay_nights);