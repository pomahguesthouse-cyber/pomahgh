
CREATE TABLE public.escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent text NOT NULL,
  to_agent text NOT NULL,
  condition_text text NOT NULL DEFAULT '',
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage escalation rules"
  ON public.escalation_rules FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Anyone can read active escalation rules"
  ON public.escalation_rules FOR SELECT
  TO public
  USING (true);

CREATE TRIGGER update_escalation_rules_updated_at
  BEFORE UPDATE ON public.escalation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default escalation rules matching current orchestrator logic
INSERT INTO public.escalation_rules (from_agent, to_agent, condition_text, priority) VALUES
  ('intent', 'faq', 'Intent = FAQ / informasi umum', 1),
  ('intent', 'booking', 'Intent = BOOKING / reservasi', 2),
  ('faq', 'booking', 'FAQ memerlukan tools (cek kamar, harga)', 3),
  ('booking', 'manager', 'Permintaan harga khusus / approval', 4),
  ('pricing', 'booking', 'Harga sudah dikonfirmasi manager', 5);
