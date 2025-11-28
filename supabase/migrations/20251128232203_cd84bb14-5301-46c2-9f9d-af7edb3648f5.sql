-- Create booking_rooms junction table for multiple room bookings
CREATE TABLE IF NOT EXISTS public.booking_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  price_per_night NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking ON public.booking_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_room ON public.booking_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_room_number ON public.booking_rooms(room_id, room_number);

-- Enable RLS
ALTER TABLE public.booking_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage booking_rooms"
ON public.booking_rooms FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own booking rooms"
ON public.booking_rooms FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM public.bookings 
    WHERE guest_email = (auth.jwt() ->> 'email'::text)
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_booking_rooms_updated_at
  BEFORE UPDATE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();