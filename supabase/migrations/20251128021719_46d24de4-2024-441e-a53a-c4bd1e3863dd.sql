-- Add room_number column for per-room blocking
ALTER TABLE public.room_unavailable_dates 
ADD COLUMN room_number TEXT;

-- Update unique constraint to include room_number
ALTER TABLE public.room_unavailable_dates 
DROP CONSTRAINT IF EXISTS room_unavailable_dates_room_id_unavailable_date_key;

ALTER TABLE public.room_unavailable_dates 
ADD CONSTRAINT room_unavailable_dates_unique 
UNIQUE (room_id, unavailable_date, room_number);