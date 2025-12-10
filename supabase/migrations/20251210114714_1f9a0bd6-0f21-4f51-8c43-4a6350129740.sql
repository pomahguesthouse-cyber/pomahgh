-- Create room_addons table for configurable paid add-ons
CREATE TABLE public.room_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'Plus',
  price NUMERIC NOT NULL DEFAULT 0,
  price_type TEXT NOT NULL DEFAULT 'per_night',
  max_quantity INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  category TEXT DEFAULT 'general',
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create booking_addons table for storing selected add-ons per booking
CREATE TABLE public.booking_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.room_addons(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;

-- RLS policies for room_addons
CREATE POLICY "Anyone can view active room addons"
ON public.room_addons FOR SELECT
USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert room addons"
ON public.room_addons FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update room addons"
ON public.room_addons FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete room addons"
ON public.room_addons FOR DELETE
USING (is_admin());

-- RLS policies for booking_addons
CREATE POLICY "Admins can manage booking addons"
ON public.booking_addons FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view their own booking addons"
ON public.booking_addons FOR SELECT
USING (booking_id IN (
  SELECT id FROM public.bookings 
  WHERE guest_email = (auth.jwt() ->> 'email'::text)
));

CREATE POLICY "Users can insert their own booking addons"
ON public.booking_addons FOR INSERT
WITH CHECK (booking_id IN (
  SELECT id FROM public.bookings 
  WHERE guest_email = (auth.jwt() ->> 'email'::text)
));

-- Create indexes for performance
CREATE INDEX idx_room_addons_active ON public.room_addons(is_active, display_order);
CREATE INDEX idx_room_addons_room ON public.room_addons(room_id);
CREATE INDEX idx_booking_addons_booking ON public.booking_addons(booking_id);

-- Trigger for updated_at
CREATE TRIGGER update_room_addons_updated_at
BEFORE UPDATE ON public.room_addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();