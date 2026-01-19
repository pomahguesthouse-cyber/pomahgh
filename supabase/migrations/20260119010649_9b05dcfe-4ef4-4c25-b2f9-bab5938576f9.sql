-- Create theme_config table
CREATE TABLE public.theme_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Default Theme',
  is_active BOOLEAN DEFAULT true,
  
  -- Colors (HSL format)
  color_primary TEXT DEFAULT '186 65% 35%',
  color_secondary TEXT DEFAULT '33 45% 85%',
  color_accent TEXT DEFAULT '186 75% 45%',
  color_background TEXT DEFAULT '36 33% 97%',
  color_foreground TEXT DEFAULT '25 20% 15%',
  color_muted TEXT DEFAULT '33 25% 92%',
  color_card TEXT DEFAULT '0 0% 100%',
  
  -- Typography
  font_heading TEXT DEFAULT 'Playfair Display',
  font_body TEXT DEFAULT 'Inter',
  font_size_base INTEGER DEFAULT 16,
  
  -- Spacing
  section_padding TEXT DEFAULT 'py-20',
  container_width TEXT DEFAULT 'max-w-7xl',
  border_radius TEXT DEFAULT '0.5rem',
  
  -- Header Customization
  header_style TEXT DEFAULT 'transparent',
  header_sticky BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create widget_config table
CREATE TABLE public.widget_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create template_presets table
CREATE TABLE public.template_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  theme_config JSONB NOT NULL,
  widget_config JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.theme_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for theme_config (public read, admin write)
CREATE POLICY "Anyone can read active theme" ON public.theme_config
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update theme" ON public.theme_config
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert theme" ON public.theme_config
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for widget_config (public read, admin write)
CREATE POLICY "Anyone can read widget config" ON public.widget_config
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage widget config" ON public.widget_config
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for template_presets (public read, admin write)
CREATE POLICY "Anyone can read template presets" ON public.template_presets
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage custom presets" ON public.template_presets
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert default theme
INSERT INTO public.theme_config (name, is_active) VALUES ('Default Theme', true);

-- Insert default widget configs
INSERT INTO public.widget_config (widget_id, sort_order, enabled, settings) VALUES
  ('header', 0, true, '{"sticky": true, "transparent": true}'),
  ('hero', 1, true, '{"animation": "fade-up"}'),
  ('welcome', 2, true, '{"animation": "fade-up"}'),
  ('google_rating', 3, true, '{}'),
  ('rooms', 4, true, '{"columns": 3}'),
  ('amenities', 5, true, '{}'),
  ('location', 6, true, '{}'),
  ('contact', 7, true, '{}'),
  ('footer', 8, true, '{}');

-- Insert system template presets
INSERT INTO public.template_presets (name, description, is_system, theme_config, widget_config) VALUES
  ('Modern', 'Clean lines with teal accents and modern typography', true, 
   '{"color_primary": "186 65% 35%", "color_secondary": "33 45% 85%", "font_heading": "Inter", "font_body": "Inter", "border_radius": "0.75rem"}',
   '[]'),
  ('Classic', 'Timeless elegance with warm tones and serif fonts', true,
   '{"color_primary": "25 40% 35%", "color_secondary": "40 30% 90%", "font_heading": "Playfair Display", "font_body": "Lora", "border_radius": "0.25rem"}',
   '[]'),
  ('Minimalist', 'Simple and clean with monochrome palette', true,
   '{"color_primary": "0 0% 20%", "color_secondary": "0 0% 95%", "font_heading": "Inter", "font_body": "Inter", "border_radius": "0"}',
   '[]'),
  ('Luxury', 'Premium feel with gold accents and elegant typography', true,
   '{"color_primary": "45 80% 45%", "color_secondary": "220 15% 20%", "font_heading": "Playfair Display", "font_body": "Lora", "border_radius": "0.5rem"}',
   '[]');

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_theme_config_updated_at
  BEFORE UPDATE ON public.theme_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_widget_config_updated_at
  BEFORE UPDATE ON public.widget_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();