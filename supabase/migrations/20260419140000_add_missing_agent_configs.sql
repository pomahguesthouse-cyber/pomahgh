-- Add 3 missing agent configs: payment_proof, payment_approval, price_list
-- These agents exist in backend (whatsapp-webhook/agents/) but were never seeded into agent_configs
-- Note: room_brochure was removed — its functionality merged into FAQ agent

INSERT INTO public.agent_configs (agent_id, name, role, icon, category, tags, system_prompt, temperature, escalation_target, auto_escalate)
VALUES
  ('payment_proof', 'Payment Proof Agent', 'OCR bukti transfer, match ke booking, auto-approve atau kirim ke manager', '🧾', 'specialist', '{"payment","ocr","proof","validation"}', NULL, 0.1, 'payment_approval', false),
  ('payment_approval', 'Payment Approval Agent', 'Proses balasan YA/TIDAK manager untuk konfirmasi pembayaran', '✅', 'manager', '{"manager","approval","confirmation"}', NULL, 0.1, NULL, false),
  ('price_list', 'Price List Agent', 'Fast-path daftar harga semua kamar tanpa AI call', '📋', 'specialist', '{"pricing","fast","info"}', NULL, 0.1, 'booking', false)
ON CONFLICT (agent_id) DO NOTHING;

-- Escalation rules for new agents
INSERT INTO public.escalation_rules (from_agent, to_agent, condition_text, priority)
VALUES
  ('payment_proof', 'payment_approval', 'OCR selesai, kirim ke manager untuk konfirmasi', 8),
  ('price_list', 'booking', 'Tamu mau lanjut booking setelah lihat harga', 9)
ON CONFLICT DO NOTHING;

-- Clean up room_brochure if it was previously seeded
DELETE FROM public.escalation_rules WHERE from_agent = 'room_brochure' OR to_agent = 'room_brochure';
DELETE FROM public.agent_configs WHERE agent_id = 'room_brochure';
