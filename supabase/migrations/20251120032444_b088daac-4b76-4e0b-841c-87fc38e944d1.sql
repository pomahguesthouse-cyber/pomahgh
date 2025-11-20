-- Add room_numbers column to rooms table
ALTER TABLE public.rooms 
ADD COLUMN room_numbers text[] DEFAULT '{}';

COMMENT ON COLUMN public.rooms.room_numbers IS 'Array of room numbers/identifiers for this room type';