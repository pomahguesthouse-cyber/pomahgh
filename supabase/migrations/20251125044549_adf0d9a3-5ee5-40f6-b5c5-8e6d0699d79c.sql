-- Create room_hotspots table
CREATE TABLE public.room_hotspots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  pitch NUMERIC NOT NULL,
  yaw NUMERIC NOT NULL,
  hotspot_type TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT,
  feature_key TEXT,
  icon_name TEXT DEFAULT 'Info',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_hotspots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active hotspots"
ON public.room_hotspots
FOR SELECT
USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert hotspots"
ON public.room_hotspots
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update hotspots"
ON public.room_hotspots
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete hotspots"
ON public.room_hotspots
FOR DELETE
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_room_hotspots_updated_at
BEFORE UPDATE ON public.room_hotspots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();