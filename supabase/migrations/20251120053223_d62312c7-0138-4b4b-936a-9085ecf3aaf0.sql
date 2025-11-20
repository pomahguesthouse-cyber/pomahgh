-- Create table for room unavailable dates
CREATE TABLE IF NOT EXISTS public.room_unavailable_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  unavailable_date DATE NOT NULL,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, unavailable_date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_room_unavailable_dates_room_id ON public.room_unavailable_dates(room_id);
CREATE INDEX IF NOT EXISTS idx_room_unavailable_dates_date ON public.room_unavailable_dates(unavailable_date);

-- Enable RLS
ALTER TABLE public.room_unavailable_dates ENABLE ROW LEVEL SECURITY;

-- Policies (admin only)
CREATE POLICY "Admin can view unavailable dates"
  ON public.room_unavailable_dates FOR SELECT
  USING (is_admin());

CREATE POLICY "Admin can insert unavailable dates"
  ON public.room_unavailable_dates FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete unavailable dates"
  ON public.room_unavailable_dates FOR DELETE
  USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_room_unavailable_dates_updated_at
  BEFORE UPDATE ON public.room_unavailable_dates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();