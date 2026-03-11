-- Add Booking.com specific configuration to channel_managers
ALTER TABLE channel_managers 
ADD COLUMN IF NOT EXISTS ota_provider TEXT DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS booking_property_id TEXT,
ADD COLUMN IF NOT EXISTS booking_hotel_id TEXT,
ADD COLUMN IF NOT EXISTS receive_bookings BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_availability BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_channel_managers_ota ON channel_managers(ota_provider) WHERE ota_provider = 'booking.com';

COMMENT ON COLUMN channel_managers.ota_provider IS 'OTA provider: booking.com, agoda, etc.';
COMMENT ON COLUMN channel_managers.booking_property_id IS 'Booking.com property ID';
COMMENT ON COLUMN channel_managers.receive_bookings IS 'Receive bookings via webhook';
COMMENT ON COLUMN channel_managers.push_availability IS 'Push availability to OTA';
