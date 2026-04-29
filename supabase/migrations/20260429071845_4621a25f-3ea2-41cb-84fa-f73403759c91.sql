
-- =========================
-- SEO Agent: keywords pool
-- =========================
CREATE TABLE public.seo_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  normalized_keyword TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual', -- google_suggest | manual | gsc
  seed_keyword TEXT,
  search_volume_estimate INTEGER,
  intent_category TEXT, -- accommodation | attraction | event | food | other
  intent_score NUMERIC(3,2),
  intent_reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | qualified | rejected | generating | generated | published | failed
  rejection_reason TEXT,
  attraction_id UUID REFERENCES public.city_attractions(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seo_keywords_unique_norm UNIQUE (normalized_keyword)
);

CREATE INDEX idx_seo_keywords_status ON public.seo_keywords(status);
CREATE INDEX idx_seo_keywords_intent ON public.seo_keywords(intent_category);

ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seo_keywords"
ON public.seo_keywords
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE TRIGGER update_seo_keywords_updated_at
BEFORE UPDATE ON public.seo_keywords
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- SEO Agent: settings (single row)
-- =========================
CREATE TABLE public.seo_agent_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_keywords TEXT[] NOT NULL DEFAULT ARRAY['penginapan semarang','hotel murah semarang','guesthouse semarang','wisata semarang']::text[],
  target_intents TEXT[] NOT NULL DEFAULT ARRAY['accommodation','attraction']::text[],
  intent_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.60,
  auto_publish BOOLEAN NOT NULL DEFAULT false,
  article_min_words INTEGER NOT NULL DEFAULT 800,
  article_tone TEXT NOT NULL DEFAULT 'ramah, informatif, lokal khas Semarang',
  internal_link_targets TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  model_text TEXT NOT NULL DEFAULT 'google/gemini-2.5-pro',
  model_image TEXT NOT NULL DEFAULT 'google/gemini-3.1-flash-image-preview',
  model_classifier TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-lite',
  daily_generate_limit INTEGER NOT NULL DEFAULT 10,
  disclaimer_footer TEXT NOT NULL DEFAULT 'Informasi dapat berubah sewaktu-waktu. Silakan konfirmasi langsung sebelum berkunjung.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.seo_agent_settings DEFAULT VALUES;

ALTER TABLE public.seo_agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seo_agent_settings"
ON public.seo_agent_settings
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE TRIGGER update_seo_agent_settings_updated_at
BEFORE UPDATE ON public.seo_agent_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- SEO Agent: run logs
-- =========================
CREATE TABLE public.seo_agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID REFERENCES public.seo_keywords(id) ON DELETE SET NULL,
  attraction_id UUID REFERENCES public.city_attractions(id) ON DELETE SET NULL,
  step TEXT NOT NULL, -- research | filter | article | image | publish | evaluate
  status TEXT NOT NULL, -- success | failed | skipped
  model_used TEXT,
  tokens_used INTEGER,
  cost_estimate NUMERIC(10,4),
  seo_score INTEGER,
  readability_score NUMERIC(5,2),
  keyword_density NUMERIC(5,3),
  word_count INTEGER,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  duration_ms INTEGER,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_agent_runs_keyword ON public.seo_agent_runs(keyword_id);
CREATE INDEX idx_seo_agent_runs_step ON public.seo_agent_runs(step);
CREATE INDEX idx_seo_agent_runs_created ON public.seo_agent_runs(created_at DESC);

ALTER TABLE public.seo_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seo_agent_runs"
ON public.seo_agent_runs
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- =========================
-- city_attractions: tag konten agen
-- =========================
ALTER TABLE public.city_attractions
  ADD COLUMN IF NOT EXISTS created_by_agent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_keyword_id UUID REFERENCES public.seo_keywords(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meta_description TEXT;

CREATE INDEX IF NOT EXISTS idx_city_attractions_agent ON public.city_attractions(created_by_agent) WHERE created_by_agent = true;
