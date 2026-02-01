-- Add page_schema column to store visual editor JSON data
ALTER TABLE public.landing_pages 
ADD COLUMN IF NOT EXISTS page_schema jsonb DEFAULT '{"sections": []}'::jsonb;

-- Add hero_image_url and hero_image_alt if not exists
ALTER TABLE public.landing_pages 
ADD COLUMN IF NOT EXISTS hero_image_url text,
ADD COLUMN IF NOT EXISTS hero_image_alt text;