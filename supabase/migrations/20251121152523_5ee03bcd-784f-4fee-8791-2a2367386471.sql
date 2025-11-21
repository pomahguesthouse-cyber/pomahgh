-- Create nearby_locations table
CREATE TABLE IF NOT EXISTS public.nearby_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  distance_km NUMERIC(4,2) NOT NULL,
  travel_time_minutes INTEGER NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'MapPin',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.nearby_locations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active nearby locations"
ON public.nearby_locations
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage nearby locations"
ON public.nearby_locations
FOR ALL
USING (public.is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_nearby_locations_updated_at
  BEFORE UPDATE ON public.nearby_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();