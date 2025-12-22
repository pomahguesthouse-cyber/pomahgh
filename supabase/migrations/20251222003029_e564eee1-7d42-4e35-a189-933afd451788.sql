-- Create room_promotions table for flexible promotional pricing
CREATE TABLE public.room_promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  promo_price NUMERIC,
  discount_percentage NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  min_nights INTEGER DEFAULT 1,
  promo_code TEXT,
  badge_text TEXT DEFAULT 'PROMO',
  badge_color TEXT DEFAULT '#EF4444',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add constraint: either promo_price or discount_percentage must be set
ALTER TABLE public.room_promotions 
ADD CONSTRAINT promo_has_discount 
CHECK (promo_price IS NOT NULL OR discount_percentage IS NOT NULL);

-- Enable RLS
ALTER TABLE public.room_promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active promotions"
ON public.room_promotions
FOR SELECT
USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert promotions"
ON public.room_promotions
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update promotions"
ON public.room_promotions
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete promotions"
ON public.room_promotions
FOR DELETE
USING (is_admin());

-- Create index for efficient queries
CREATE INDEX idx_room_promotions_room_date ON public.room_promotions(room_id, start_date, end_date);
CREATE INDEX idx_room_promotions_active ON public.room_promotions(is_active) WHERE is_active = true;

-- Create trigger for updated_at
CREATE TRIGGER update_room_promotions_updated_at
BEFORE UPDATE ON public.room_promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();