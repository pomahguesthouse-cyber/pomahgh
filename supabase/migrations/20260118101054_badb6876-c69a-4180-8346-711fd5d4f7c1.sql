-- Drop constraint lama jika ada
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_status;

-- Buat constraint baru dengan no_show
ALTER TABLE bookings 
ADD CONSTRAINT valid_status 
CHECK (status = ANY (ARRAY['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']));