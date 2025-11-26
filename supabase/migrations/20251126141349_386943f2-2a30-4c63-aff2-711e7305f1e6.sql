-- Create seo_settings table
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- General SEO
  site_title TEXT DEFAULT 'Pomah Guesthouse',
  meta_description TEXT,
  meta_keywords TEXT,
  canonical_url TEXT DEFAULT 'https://pomahguesthouse.com',
  default_og_image TEXT,
  
  -- Social Media SEO
  og_site_name TEXT DEFAULT 'Pomah Guesthouse',
  og_locale TEXT DEFAULT 'id_ID',
  twitter_handle TEXT,
  facebook_app_id TEXT,
  
  -- Local SEO
  business_type TEXT DEFAULT 'Hotel',
  geo_region TEXT DEFAULT 'ID-JT',
  geo_placename TEXT DEFAULT 'Semarang',
  geo_coordinates TEXT,
  price_range TEXT DEFAULT 'Rp',
  
  -- Indexing Control
  allow_indexing BOOLEAN DEFAULT true,
  follow_links BOOLEAN DEFAULT true,
  
  -- Analytics & Verification
  google_analytics_id TEXT,
  google_tag_manager_id TEXT,
  google_search_console_verification TEXT,
  bing_verification TEXT,
  facebook_pixel_id TEXT,
  
  -- Advanced SEO
  custom_head_scripts TEXT,
  robots_txt_custom TEXT,
  structured_data_enabled BOOLEAN DEFAULT true,
  
  -- Sitemap Settings
  sitemap_auto_generate BOOLEAN DEFAULT true,
  sitemap_change_freq TEXT DEFAULT 'weekly',
  sitemap_priority_home NUMERIC DEFAULT 1.0,
  sitemap_priority_rooms NUMERIC DEFAULT 0.8
);

-- Enable RLS
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view SEO settings
CREATE POLICY "Anyone can view SEO settings"
  ON public.seo_settings
  FOR SELECT
  USING (true);

-- Only admins can update SEO settings
CREATE POLICY "Admins can update SEO settings"
  ON public.seo_settings
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can insert SEO settings
CREATE POLICY "Admins can insert SEO settings"
  ON public.seo_settings
  FOR INSERT
  WITH CHECK (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_seo_settings_updated_at
  BEFORE UPDATE ON public.seo_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default SEO settings
INSERT INTO public.seo_settings (
  site_title,
  meta_description,
  meta_keywords,
  canonical_url,
  og_site_name,
  business_type,
  geo_region,
  geo_placename
) VALUES (
  'Pomah Guesthouse - Penginapan Nyaman di Semarang',
  'Pomah Guesthouse adalah pilihan penginapan murah dan strategis di Semarang. Tersedia berbagai tipe kamar dengan fasilitas lengkap untuk wisatawan dan pebisnis.',
  'penginapan semarang, hotel murah semarang, guesthouse semarang, pomah guesthouse',
  'https://pomahguesthouse.com',
  'Pomah Guesthouse',
  'Hotel',
  'ID-JT',
  'Semarang'
) ON CONFLICT DO NOTHING;