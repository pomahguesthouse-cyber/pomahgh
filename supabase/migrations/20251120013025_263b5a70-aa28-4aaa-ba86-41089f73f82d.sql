-- Create hero_slides table for homepage background slider
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  overlay_text text NOT NULL,
  overlay_subtext text,
  font_family text DEFAULT 'Inter',
  font_size text DEFAULT 'text-5xl',
  font_weight text DEFAULT 'font-bold',
  text_color text DEFAULT 'text-card',
  text_align text DEFAULT 'center',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active hero slides"
  ON public.hero_slides
  FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert hero slides"
  ON public.hero_slides
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update hero slides"
  ON public.hero_slides
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete hero slides"
  ON public.hero_slides
  FOR DELETE
  USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_hero_slides_updated_at
  BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for hero images
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-images', 'hero-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for hero images
CREATE POLICY "Anyone can view hero images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'hero-images');

CREATE POLICY "Admins can upload hero images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'hero-images' AND is_admin());

CREATE POLICY "Admins can update hero images"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'hero-images' AND is_admin());

CREATE POLICY "Admins can delete hero images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'hero-images' AND is_admin());