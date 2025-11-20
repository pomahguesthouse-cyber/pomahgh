-- Add duration and transition effect to hero_slides
ALTER TABLE public.hero_slides 
ADD COLUMN duration INTEGER DEFAULT 5000,
ADD COLUMN transition_effect TEXT DEFAULT 'fade';

-- Create facilities table
CREATE TABLE public.facilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facilities
CREATE POLICY "Anyone can view active facilities"
  ON public.facilities
  FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert facilities"
  ON public.facilities
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update facilities"
  ON public.facilities
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete facilities"
  ON public.facilities
  FOR DELETE
  USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();