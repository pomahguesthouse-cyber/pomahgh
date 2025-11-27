-- Create facility_hero_slides table
CREATE TABLE public.facility_hero_slides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  title text,
  subtitle text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  duration integer DEFAULT 4000,
  show_overlay boolean DEFAULT true,
  overlay_opacity numeric DEFAULT 0.4,
  overlay_gradient_from text DEFAULT '#000000',
  overlay_gradient_to text DEFAULT '#000000',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.facility_hero_slides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active facility hero slides" 
  ON public.facility_hero_slides FOR SELECT 
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can insert facility hero slides" 
  ON public.facility_hero_slides FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update facility hero slides" 
  ON public.facility_hero_slides FOR UPDATE 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete facility hero slides" 
  ON public.facility_hero_slides FOR DELETE 
  USING (public.is_admin());

-- Create storage bucket for facility hero images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('facility-hero-images', 'facility-hero-images', true);

-- Storage policies
CREATE POLICY "Public can view facility hero images" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'facility-hero-images');

CREATE POLICY "Admins can upload facility hero images" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'facility-hero-images' AND public.is_admin());

CREATE POLICY "Admins can update facility hero images" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'facility-hero-images' AND public.is_admin());

CREATE POLICY "Admins can delete facility hero images" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'facility-hero-images' AND public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_facility_hero_slides_updated_at
  BEFORE UPDATE ON public.facility_hero_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();