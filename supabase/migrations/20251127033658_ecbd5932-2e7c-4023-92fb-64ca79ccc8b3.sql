-- Add header customization columns to hotel_settings table
ALTER TABLE hotel_settings 
ADD COLUMN IF NOT EXISTS header_bg_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS header_bg_opacity NUMERIC DEFAULT 0.4,
ADD COLUMN IF NOT EXISTS header_blur INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS header_show_logo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS header_text_color TEXT DEFAULT '#ffffff';