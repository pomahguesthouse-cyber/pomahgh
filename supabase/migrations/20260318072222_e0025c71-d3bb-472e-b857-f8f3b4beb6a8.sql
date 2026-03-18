-- Add missing columns to hotel_settings
ALTER TABLE public.hotel_settings
ADD COLUMN IF NOT EXISTS homepage_slug text DEFAULT null,
ADD COLUMN IF NOT EXISTS hidden_page_slugs text[] DEFAULT '{}';