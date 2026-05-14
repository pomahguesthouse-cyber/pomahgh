-- Skenario tersimpan
CREATE TABLE public.chat_test_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'booking_normal',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_final_outcome TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_test_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scenarios"
ON public.chat_test_scenarios FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_chat_test_scenarios_updated_at
BEFORE UPDATE ON public.chat_test_scenarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Eksekusi run
CREATE TABLE public.chat_test_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID REFERENCES public.chat_test_scenarios(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'scenario',
  source_conversation_id UUID,
  test_phone TEXT NOT NULL,
  test_conversation_id UUID,
  status TEXT NOT NULL DEFAULT 'running',
  overall_score INTEGER,
  accuracy_score INTEGER,
  tone_score INTEGER,
  escalation_score INTEGER,
  summary TEXT,
  recommendations TEXT,
  triggered_by UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view runs"
ON public.chat_test_runs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins create runs"
ON public.chat_test_runs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update runs"
ON public.chat_test_runs FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete runs"
ON public.chat_test_runs FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_chat_test_runs_started ON public.chat_test_runs (started_at DESC);
CREATE INDEX idx_chat_test_runs_scenario ON public.chat_test_runs (scenario_id);

-- Transcript per langkah
CREATE TABLE public.chat_test_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.chat_test_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  assertions JSONB NOT NULL DEFAULT '[]'::jsonb,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_test_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view test messages"
ON public.chat_test_messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage test messages"
ON public.chat_test_messages FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_chat_test_messages_run ON public.chat_test_messages (run_id, step_index);

-- Seed 2 skenario dasar booking flow normal
INSERT INTO public.chat_test_scenarios (name, description, category, steps, expected_final_outcome) VALUES
(
  'Booking Deluxe 1 malam',
  'Tamu menanyakan deluxe 1 malam, pilih kamar, beri data lengkap.',
  'booking_normal',
  '[
    {"user_message": "halo, masih ada kamar deluxe untuk besok?", "expected_assertions": ["mentions_room_or_availability"]},
    {"user_message": "1 malam", "expected_assertions": ["mentions_check_in_date", "contains_price_rupiah"]},
    {"user_message": "oke kak ambil deluxe", "expected_assertions": ["asks_guest_data"]},
    {"user_message": "Budi Santoso, 081234567890, budi@mail.com, 2 orang", "expected_assertions": ["mentions_payment_or_bca", "mentions_booking_code"]}
  ]'::jsonb,
  'Bot mengirim instruksi pembayaran BCA dan kode booking PMH-XXXXXX.'
),
(
  'Cek availability tanggal range',
  'Tamu tanya 17-18 Mei, lalu langsung minta booking family suite.',
  'booking_normal',
  '[
    {"user_message": "kak masih ada kamar tgl 17-18 mei?", "expected_assertions": ["mentions_check_in_date", "mentions_room_or_availability"]},
    {"user_message": "family suite ya, kami 4 orang", "expected_assertions": ["asks_guest_data"]}
  ]'::jsonb,
  'Bot menampilkan availability lalu mengkonfirmasi & meminta data tamu.'
);