-- Add custom_json_ld column to seo_settings table
ALTER TABLE public.seo_settings
ADD COLUMN custom_json_ld text DEFAULT NULL;