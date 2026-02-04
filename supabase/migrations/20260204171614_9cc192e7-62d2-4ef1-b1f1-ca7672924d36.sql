-- Add hero_slides column to landing_pages for slider functionality
ALTER TABLE public.landing_pages
ADD COLUMN IF NOT EXISTS hero_slides jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.landing_pages.hero_slides IS 'Array of hero slide objects with id, image_url, and alt_text for slider functionality';