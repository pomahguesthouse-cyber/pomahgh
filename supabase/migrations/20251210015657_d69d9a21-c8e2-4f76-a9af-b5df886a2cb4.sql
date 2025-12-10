-- Create explore_hero_slides table
CREATE TABLE public.explore_hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  duration INTEGER DEFAULT 5000,
  show_overlay BOOLEAN DEFAULT true,
  overlay_opacity NUMERIC DEFAULT 0.5,
  overlay_gradient_from TEXT DEFAULT '#0F766E',
  overlay_gradient_to TEXT DEFAULT '#000000',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.explore_hero_slides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active explore hero slides"
ON public.explore_hero_slides
FOR SELECT
USING ((is_active = true) OR is_admin());

CREATE POLICY "Admins can insert explore hero slides"
ON public.explore_hero_slides
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update explore hero slides"
ON public.explore_hero_slides
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete explore hero slides"
ON public.explore_hero_slides
FOR DELETE
USING (is_admin());

-- Create storage bucket for explore hero images
INSERT INTO storage.buckets (id, name, public) VALUES ('explore-hero-images', 'explore-hero-images', true);

-- Storage policies
CREATE POLICY "Anyone can view explore hero images"
ON storage.objects FOR SELECT
USING (bucket_id = 'explore-hero-images');

CREATE POLICY "Admins can upload explore hero images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'explore-hero-images' AND is_admin());

CREATE POLICY "Admins can update explore hero images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'explore-hero-images' AND is_admin());

CREATE POLICY "Admins can delete explore hero images"
ON storage.objects FOR DELETE
USING (bucket_id = 'explore-hero-images' AND is_admin());