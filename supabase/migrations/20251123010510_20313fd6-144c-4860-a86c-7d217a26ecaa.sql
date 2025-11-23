-- Add slug column to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generate slugs for existing rooms
UPDATE rooms 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Create function to auto-generate slug
CREATE OR REPLACE FUNCTION generate_room_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto-generating slugs
DROP TRIGGER IF EXISTS set_room_slug ON rooms;
CREATE TRIGGER set_room_slug
BEFORE INSERT OR UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION generate_room_slug();