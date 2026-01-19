-- Create element_overrides table for persisting font/style changes
CREATE TABLE public.element_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id TEXT NOT NULL UNIQUE,
  overrides JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.element_overrides ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (admin) to manage
CREATE POLICY "Authenticated users can manage element_overrides"
ON public.element_overrides FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for public read (for website display)
CREATE POLICY "Public can read element_overrides"
ON public.element_overrides FOR SELECT
TO anon
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_element_overrides_updated_at
BEFORE UPDATE ON public.element_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();