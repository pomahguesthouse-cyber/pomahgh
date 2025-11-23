-- Add booking source columns to bookings table
ALTER TABLE bookings 
ADD COLUMN booking_source TEXT DEFAULT 'direct' CHECK (booking_source IN ('direct', 'ota', 'walk_in', 'other')),
ADD COLUMN ota_name TEXT,
ADD COLUMN other_source TEXT;

-- Add comments for documentation
COMMENT ON COLUMN bookings.booking_source IS 'Source of booking: direct, ota, walk_in, or other';
COMMENT ON COLUMN bookings.ota_name IS 'Name of OTA platform if booking_source is ota';
COMMENT ON COLUMN bookings.other_source IS 'Description if booking_source is other';