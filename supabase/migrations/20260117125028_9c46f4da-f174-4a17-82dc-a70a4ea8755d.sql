-- Drop constraint lama
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_status;

-- Buat constraint baru dengan nilai yang benar
ALTER TABLE bookings 
ADD CONSTRAINT valid_status 
CHECK (status = ANY (ARRAY['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']));

-- Update status 'completed' ke 'checked_out' jika ada
UPDATE bookings SET status = 'checked_out' WHERE status = 'completed';