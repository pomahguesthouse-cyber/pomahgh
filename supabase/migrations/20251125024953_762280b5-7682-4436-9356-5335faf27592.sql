-- Create room_features table
CREATE TABLE public.room_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'Circle',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active room features"
  ON public.room_features FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert room features"
  ON public.room_features FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update room features"
  ON public.room_features FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete room features"
  ON public.room_features FOR DELETE
  USING (is_admin());

-- Seed default features
INSERT INTO public.room_features (feature_key, label, icon_name, display_order) VALUES
  ('wifi', 'WiFi', 'Wifi', 1),
  ('tv', 'TV', 'Tv', 2),
  ('ac', 'Air Conditioning', 'Wind', 3),
  ('coffee', 'Coffee Maker', 'Coffee', 4),
  ('bathtub', 'Bathtub', 'Bath', 5),
  ('minibar', 'Mini Bar', 'Refrigerator', 6),
  ('breakfast', 'Breakfast', 'UtensilsCrossed', 7),
  ('pool', 'Pool Access', 'Waves', 8),
  ('gym', 'Gym Access', 'Dumbbell', 9),
  ('parking', 'Free Parking', 'Car', 10),
  ('workspace', 'Work Space', 'Users', 11),
  ('shower', 'Rain Shower', 'ShowerHead', 12);

-- Trigger for updated_at
CREATE TRIGGER update_room_features_updated_at
  BEFORE UPDATE ON public.room_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();