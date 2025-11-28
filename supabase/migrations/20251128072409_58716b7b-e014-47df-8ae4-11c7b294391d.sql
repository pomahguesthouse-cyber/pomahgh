-- Add refund policy columns to hotel_settings table
ALTER TABLE hotel_settings
ADD COLUMN refund_policy_enabled boolean DEFAULT true,
ADD COLUMN refund_policy_type text DEFAULT 'partial',
ADD COLUMN full_refund_days_before integer DEFAULT 7,
ADD COLUMN partial_refund_days_before integer DEFAULT 3,
ADD COLUMN partial_refund_percentage numeric DEFAULT 50,
ADD COLUMN no_refund_days_before integer DEFAULT 1,
ADD COLUMN refund_policy_text text;