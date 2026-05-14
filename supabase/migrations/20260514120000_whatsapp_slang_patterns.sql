-- ============================================================
-- WhatsApp Slang Patterns Table
-- Replaces hardcoded SLANG_MAP in supabase/functions/whatsapp-webhook/utils/slang.ts
-- so admin can manage normalization patterns without redeploy.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_slang_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slang TEXT NOT NULL,
  normalized TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'detected', 'seed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_slang_patterns_slang_unique UNIQUE (slang)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_slang_patterns_active
  ON public.whatsapp_slang_patterns (is_active)
  WHERE is_active = true;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_whatsapp_slang_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_whatsapp_slang_patterns_updated_at ON public.whatsapp_slang_patterns;
CREATE TRIGGER trg_whatsapp_slang_patterns_updated_at
  BEFORE UPDATE ON public.whatsapp_slang_patterns
  FOR EACH ROW EXECUTE FUNCTION public.set_whatsapp_slang_patterns_updated_at();

-- RLS
ALTER TABLE public.whatsapp_slang_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage slang patterns"
  ON public.whatsapp_slang_patterns FOR ALL USING (is_admin());

CREATE POLICY "Service role can manage slang patterns"
  ON public.whatsapp_slang_patterns FOR ALL USING (auth.role() = 'service_role');

-- Read-only access for authenticated users (so edge functions can SELECT via anon/auth role too)
CREATE POLICY "Authenticated can read active slang"
  ON public.whatsapp_slang_patterns FOR SELECT
  USING (is_active = true);

-- ============================================================
-- Seed: existing hardcoded SLANG_MAP entries
-- ============================================================

INSERT INTO public.whatsapp_slang_patterns (slang, normalized, source) VALUES
  ('dlx', 'deluxe', 'seed'),
  ('delux', 'deluxe', 'seed'),
  ('dluxe', 'deluxe', 'seed'),
  ('grnd', 'grand', 'seed'),
  ('grd', 'grand', 'seed'),
  ('fam', 'family', 'seed'),
  ('fmly', 'family', 'seed'),
  ('sgl', 'single', 'seed'),
  ('sngl', 'single', 'seed'),
  ('kmr', 'kamar', 'seed'),
  ('kmar', 'kamar', 'seed'),
  ('brp', 'berapa', 'seed'),
  ('brapa', 'berapa', 'seed'),
  ('bs', 'bisa', 'seed'),
  ('bsa', 'bisa', 'seed'),
  ('bza', 'bisa', 'seed'),
  ('gk', 'tidak', 'seed'),
  ('ga', 'tidak', 'seed'),
  ('ngga', 'tidak', 'seed'),
  ('gak', 'tidak', 'seed'),
  ('nggak', 'tidak', 'seed'),
  ('sy', 'saya', 'seed'),
  ('aku', 'saya', 'seed'),
  ('ak', 'saya', 'seed'),
  ('gw', 'saya', 'seed'),
  ('gue', 'saya', 'seed'),
  ('mlm', 'malam', 'seed'),
  ('malem', 'malam', 'seed'),
  ('org', 'orang', 'seed'),
  ('orng', 'orang', 'seed'),
  ('tgl', 'tanggal', 'seed'),
  ('tggl', 'tanggal', 'seed'),
  ('kpn', 'kapan', 'seed'),
  ('kapn', 'kapan', 'seed'),
  ('bsk', 'besok', 'seed'),
  ('besuk', 'besok', 'seed'),
  ('lsa', 'lusa', 'seed'),
  ('gmn', 'bagaimana', 'seed'),
  ('gimana', 'bagaimana', 'seed'),
  ('gmna', 'bagaimana', 'seed'),
  ('udh', 'sudah', 'seed'),
  ('udah', 'sudah', 'seed'),
  ('sdh', 'sudah', 'seed'),
  ('blm', 'belum', 'seed'),
  ('blum', 'belum', 'seed'),
  ('yg', 'yang', 'seed'),
  ('yng', 'yang', 'seed'),
  ('dg', 'dengan', 'seed'),
  ('dgn', 'dengan', 'seed'),
  ('utk', 'untuk', 'seed'),
  ('utuk', 'untuk', 'seed'),
  ('buat', 'untuk', 'seed'),
  ('krn', 'karena', 'seed'),
  ('krna', 'karena', 'seed'),
  ('lg', 'lagi', 'seed'),
  ('lgi', 'lagi', 'seed'),
  ('msh', 'masih', 'seed'),
  ('msih', 'masih', 'seed'),
  ('jg', 'juga', 'seed'),
  ('jga', 'juga', 'seed'),
  ('tp', 'tapi', 'seed'),
  ('tpi', 'tapi', 'seed'),
  ('sm', 'sama', 'seed'),
  ('ama', 'sama', 'seed'),
  ('trims', 'terima kasih', 'seed'),
  ('tq', 'terima kasih', 'seed'),
  ('makasih', 'terima kasih', 'seed'),
  ('mksh', 'terima kasih', 'seed')
ON CONFLICT (slang) DO NOTHING;
