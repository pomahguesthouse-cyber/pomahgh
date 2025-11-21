-- Add latitude and longitude fields to hotel_settings for map display
ALTER TABLE public.hotel_settings
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;