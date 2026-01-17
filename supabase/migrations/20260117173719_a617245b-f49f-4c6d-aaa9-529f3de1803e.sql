-- Create city_events table for Semarang events
CREATE TABLE public.city_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  long_description TEXT,
  image_url TEXT,
  image_alt TEXT,
  gallery_images TEXT[],
  gallery_alts JSONB,
  venue TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  event_date DATE NOT NULL,
  event_end_date DATE,
  event_time TEXT,
  price_range TEXT,
  organizer TEXT,
  contact_info TEXT,
  website_url TEXT,
  icon_name TEXT DEFAULT 'Calendar',
  category TEXT NOT NULL DEFAULT 'festival',
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.city_events ENABLE ROW LEVEL SECURITY;

-- Public read access for active events
CREATE POLICY "Public read access for active events" ON public.city_events
  FOR SELECT USING (is_active = true);

-- Admin full access using is_admin function
CREATE POLICY "Admin full access to city events" ON public.city_events
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_city_events_updated_at
  BEFORE UPDATE ON public.city_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.city_events;