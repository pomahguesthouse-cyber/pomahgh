-- Add subtitle-specific styling columns to hero_slides table
ALTER TABLE hero_slides 
ADD COLUMN IF NOT EXISTS subtitle_font_family text,
ADD COLUMN IF NOT EXISTS subtitle_font_size text,
ADD COLUMN IF NOT EXISTS subtitle_font_weight text,
ADD COLUMN IF NOT EXISTS subtitle_text_color text;