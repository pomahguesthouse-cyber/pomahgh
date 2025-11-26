-- Add gradient customization columns to hero_slides table
ALTER TABLE hero_slides 
ADD COLUMN overlay_gradient_from text DEFAULT '#0F766E',
ADD COLUMN overlay_gradient_to text DEFAULT '#000000',
ADD COLUMN overlay_opacity numeric DEFAULT 0.5 CHECK (overlay_opacity >= 0 AND overlay_opacity <= 1);