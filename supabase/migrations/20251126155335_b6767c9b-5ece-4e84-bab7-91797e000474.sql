-- Add animation columns to hero_slides table
ALTER TABLE hero_slides 
ADD COLUMN title_animation text DEFAULT 'fade-up',
ADD COLUMN subtitle_animation text DEFAULT 'fade-up',
ADD COLUMN title_animation_loop boolean DEFAULT false,
ADD COLUMN subtitle_animation_loop boolean DEFAULT false;