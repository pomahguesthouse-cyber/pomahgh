-- Drop existing table
DROP TABLE IF EXISTS public.search_console_credentials;

-- Recreate with TEXT id
CREATE TABLE public.search_console_credentials (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  site_url TEXT,
  is_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_console_credentials ENABLE ROW LEVEL SECURITY;

-- Policy untuk authenticated users
CREATE POLICY "Allow authenticated access" ON public.search_console_credentials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default row
INSERT INTO public.search_console_credentials (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;