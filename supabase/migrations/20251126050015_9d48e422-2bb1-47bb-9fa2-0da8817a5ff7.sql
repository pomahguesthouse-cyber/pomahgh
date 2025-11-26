-- Add transition effect field to rooms table
ALTER TABLE rooms 
ADD COLUMN transition_effect TEXT DEFAULT 'slide' CHECK (transition_effect IN ('slide', 'fade', 'blur', 'zoom', 'flip'));

COMMENT ON COLUMN rooms.transition_effect IS 'Carousel transition animation effect for room images';