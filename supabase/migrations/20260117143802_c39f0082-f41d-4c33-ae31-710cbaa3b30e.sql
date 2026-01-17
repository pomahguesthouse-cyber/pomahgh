-- Tabel untuk menyimpan data ranking dari Google Search Console
CREATE TABLE public.search_console_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url TEXT NOT NULL,
  query TEXT,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,
  position DECIMAL(5,2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabel untuk menyimpan kredensial GSC
CREATE TABLE public.search_console_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  site_url TEXT,
  is_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_console_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_console_credentials ENABLE ROW LEVEL SECURITY;

-- RLS policies for rankings (public read for admin)
CREATE POLICY "Allow read for authenticated users" 
ON public.search_console_rankings 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.search_console_rankings 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" 
ON public.search_console_rankings 
FOR DELETE 
TO authenticated
USING (true);

-- RLS policies for credentials
CREATE POLICY "Allow read for authenticated users" 
ON public.search_console_credentials 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.search_console_credentials 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON public.search_console_credentials 
FOR UPDATE 
TO authenticated
USING (true);

-- Index untuk query cepat
CREATE INDEX idx_rankings_date ON public.search_console_rankings(date);
CREATE INDEX idx_rankings_page ON public.search_console_rankings(page_url);
CREATE INDEX idx_rankings_query ON public.search_console_rankings(query);

-- Trigger untuk update updated_at
CREATE TRIGGER update_search_console_credentials_updated_at
BEFORE UPDATE ON public.search_console_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();