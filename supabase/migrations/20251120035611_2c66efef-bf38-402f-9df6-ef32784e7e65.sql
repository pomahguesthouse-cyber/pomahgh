-- Add time fields to bookings table
ALTER TABLE bookings 
ADD COLUMN check_in_time time DEFAULT '14:00:00',
ADD COLUMN check_out_time time DEFAULT '12:00:00';