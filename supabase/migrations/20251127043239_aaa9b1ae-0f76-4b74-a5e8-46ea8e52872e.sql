-- Create building_3d_settings table
CREATE TABLE public.building_3d_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_url text,
  model_type text DEFAULT 'placeholder',
  title text DEFAULT 'Virtual Tour 3D',
  subtitle text DEFAULT 'Jelajahi hotel kami dalam tampilan 3D interaktif',
  background_color text DEFAULT '#1a1a2e',
  enable_auto_rotate boolean DEFAULT true,
  auto_rotate_speed numeric DEFAULT 0.5,
  camera_position_x numeric DEFAULT 5,
  camera_position_y numeric DEFAULT 3,
  camera_position_z numeric DEFAULT 5,
  enable_zoom boolean DEFAULT true,
  min_zoom numeric DEFAULT 2,
  max_zoom numeric DEFAULT 10,
  ambient_light_intensity numeric DEFAULT 0.5,
  directional_light_intensity numeric DEFAULT 1,
  show_section boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE building_3d_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active settings
CREATE POLICY "Anyone can view 3D settings"
ON public.building_3d_settings
FOR SELECT
USING (true);

-- Admins can insert settings
CREATE POLICY "Admins can insert 3D settings"
ON public.building_3d_settings
FOR INSERT
WITH CHECK (is_admin());

-- Admins can update settings
CREATE POLICY "Admins can update 3D settings"
ON public.building_3d_settings
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Admins can delete settings
CREATE POLICY "Admins can delete 3D settings"
ON public.building_3d_settings
FOR DELETE
USING (is_admin());

-- Create storage bucket for 3D models
INSERT INTO storage.buckets (id, name, public) 
VALUES ('3d-models', '3d-models', true);

-- Public can view 3D models
CREATE POLICY "Anyone can view 3D models"
ON storage.objects
FOR SELECT
USING (bucket_id = '3d-models');

-- Admins can upload 3D models
CREATE POLICY "Admins can upload 3D models"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = '3d-models' AND is_admin());

-- Admins can update 3D models
CREATE POLICY "Admins can update 3D models"
ON storage.objects
FOR UPDATE
USING (bucket_id = '3d-models' AND is_admin());

-- Admins can delete 3D models
CREATE POLICY "Admins can delete 3D models"
ON storage.objects
FOR DELETE
USING (bucket_id = '3d-models' AND is_admin());

-- Create updated_at trigger
CREATE TRIGGER update_building_3d_settings_updated_at
BEFORE UPDATE ON public.building_3d_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.building_3d_settings (
  title,
  subtitle,
  background_color,
  show_section,
  is_active
) VALUES (
  'Virtual Tour 3D',
  'Jelajahi hotel kami dalam tampilan 3D interaktif',
  '#1a1a2e',
  true,
  true
);