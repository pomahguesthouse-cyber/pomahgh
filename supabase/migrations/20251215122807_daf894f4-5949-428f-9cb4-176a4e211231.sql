-- Add invoice_logo_url column to hotel_settings table
ALTER TABLE public.hotel_settings 
ADD COLUMN IF NOT EXISTS invoice_logo_url TEXT;