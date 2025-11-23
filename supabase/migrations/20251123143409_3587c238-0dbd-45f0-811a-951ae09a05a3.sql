-- Add bank account information fields to hotel_settings
ALTER TABLE hotel_settings
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_holder_name TEXT;