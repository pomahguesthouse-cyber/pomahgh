-- Fix booking_source constraint to allow 'admin' value
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_booking_source_check;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_booking_source_check 
CHECK (booking_source = ANY (ARRAY['direct'::text, 'ota'::text, 'walk_in'::text, 'other'::text, 'admin'::text]));