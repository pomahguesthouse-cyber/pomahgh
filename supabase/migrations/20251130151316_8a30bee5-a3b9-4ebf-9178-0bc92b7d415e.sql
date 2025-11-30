-- Add non-refundable flags to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS is_non_refundable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS monday_non_refundable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tuesday_non_refundable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS wednesday_non_refundable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS thursday_non_refundable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS friday_non_refundable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS saturday_non_refundable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sunday_non_refundable boolean DEFAULT false;

-- Add hotel policies to hotel_settings table
ALTER TABLE hotel_settings 
ADD COLUMN IF NOT EXISTS hotel_policies_text text,
ADD COLUMN IF NOT EXISTS hotel_policies_enabled boolean DEFAULT true;

-- Add rate type to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_non_refundable boolean DEFAULT false;