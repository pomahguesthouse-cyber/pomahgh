-- Add scraping columns to competitor_hotels
ALTER TABLE public.competitor_hotels 
ADD COLUMN IF NOT EXISTS scrape_url TEXT,
ADD COLUMN IF NOT EXISTS scrape_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;

-- Create scrape_logs table
CREATE TABLE IF NOT EXISTS public.scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_hotel_id UUID REFERENCES public.competitor_hotels(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  rooms_scraped INTEGER DEFAULT 0,
  prices_added INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for scrape_logs
CREATE INDEX IF NOT EXISTS idx_scrape_logs_hotel ON public.scrape_logs(competitor_hotel_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_created ON public.scrape_logs(created_at DESC);

-- Enable RLS on scrape_logs
ALTER TABLE public.scrape_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view scrape logs
CREATE POLICY "Authenticated users can view scrape_logs"
  ON public.scrape_logs FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert scrape logs
CREATE POLICY "Authenticated users can insert scrape_logs"
  ON public.scrape_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add 'auto-scrape' to price sources for competitor_price_surveys
COMMENT ON TABLE public.scrape_logs IS 'Logs for automated competitor price scraping activities';