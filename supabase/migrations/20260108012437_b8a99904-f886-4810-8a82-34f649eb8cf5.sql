-- Create competitor_hotels table
CREATE TABLE public.competitor_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  distance_km NUMERIC(4,2),
  website_url TEXT,
  google_maps_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create competitor_rooms table
CREATE TABLE public.competitor_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_hotel_id UUID NOT NULL REFERENCES public.competitor_hotels(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  room_type TEXT,
  max_guests INTEGER,
  comparable_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create competitor_price_surveys table
CREATE TABLE public.competitor_price_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_room_id UUID NOT NULL REFERENCES public.competitor_rooms(id) ON DELETE CASCADE,
  survey_date DATE NOT NULL DEFAULT CURRENT_DATE,
  price NUMERIC(12,2) NOT NULL,
  price_source TEXT DEFAULT 'manual',
  surveyed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create pricing_adjustment_logs table
CREATE TABLE public.pricing_adjustment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  previous_price NUMERIC(12,2),
  new_price NUMERIC(12,2),
  competitor_avg_price NUMERIC(12,2),
  adjustment_reason TEXT,
  adjustment_type TEXT DEFAULT 'auto',
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Add auto-pricing columns to rooms table
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS auto_pricing_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_auto_price NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS max_auto_price NUMERIC(12,2);

-- Enable RLS
ALTER TABLE public.competitor_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_price_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_adjustment_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitor_hotels
CREATE POLICY "Admin full access competitor_hotels" ON public.competitor_hotels
  FOR ALL USING (public.is_admin());

CREATE POLICY "Public read competitor_hotels" ON public.competitor_hotels
  FOR SELECT USING (true);

-- RLS Policies for competitor_rooms
CREATE POLICY "Admin full access competitor_rooms" ON public.competitor_rooms
  FOR ALL USING (public.is_admin());

CREATE POLICY "Public read competitor_rooms" ON public.competitor_rooms
  FOR SELECT USING (true);

-- RLS Policies for competitor_price_surveys
CREATE POLICY "Admin full access competitor_price_surveys" ON public.competitor_price_surveys
  FOR ALL USING (public.is_admin());

CREATE POLICY "Public read competitor_price_surveys" ON public.competitor_price_surveys
  FOR SELECT USING (true);

-- RLS Policies for pricing_adjustment_logs
CREATE POLICY "Admin full access pricing_adjustment_logs" ON public.pricing_adjustment_logs
  FOR ALL USING (public.is_admin());

CREATE POLICY "Public read pricing_adjustment_logs" ON public.pricing_adjustment_logs
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_competitor_rooms_hotel ON public.competitor_rooms(competitor_hotel_id);
CREATE INDEX idx_competitor_rooms_comparable ON public.competitor_rooms(comparable_room_id);
CREATE INDEX idx_price_surveys_room ON public.competitor_price_surveys(competitor_room_id);
CREATE INDEX idx_price_surveys_date ON public.competitor_price_surveys(survey_date);
CREATE INDEX idx_pricing_logs_room ON public.pricing_adjustment_logs(room_id);
CREATE INDEX idx_pricing_logs_executed ON public.pricing_adjustment_logs(executed_at);

-- Triggers for updated_at
CREATE TRIGGER update_competitor_hotels_updated_at
  BEFORE UPDATE ON public.competitor_hotels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competitor_rooms_updated_at
  BEFORE UPDATE ON public.competitor_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();