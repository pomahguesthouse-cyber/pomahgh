-- Add 4 missing agent configs: payment_proof, payment_approval, price_list, room_brochure
-- These agents exist in backend (whatsapp-webhook/agents/) but were never seeded into agent_configs

INSERT INTO public.agent_configs (agent_id, name, role, icon, category, tags, system_prompt, temperature, escalation_target, auto_escalate)
VALUES
  ('payment_proof', 'Payment Proof Agent', 'OCR bukti transfer, match ke booking, auto-approve atau kirim ke manager', '🧾', 'specialist', '{"payment","ocr","proof","validation"}', NULL, 0.1, 'payment_approval', false),
  ('payment_approval', 'Payment Approval Agent', 'Proses balasan YA/TIDAK manager untuk konfirmasi pembayaran', '✅', 'manager', '{"manager","approval","confirmation"}', NULL, 0.1, NULL, false),
  ('price_list', 'Price List Agent', 'Fast-path daftar harga semua kamar tanpa AI call', '📋', 'specialist', '{"pricing","fast","info"}', NULL, 0.1, 'booking', false),
  ('room_brochure', 'Room Brochure Agent', 'Fast-path kirim foto kamar dan brosur PDF ke tamu', '🖼️', 'specialist', '{"media","brochure","fast","room"}', NULL, 0.1, 'booking', false)
ON CONFLICT (agent_id) DO NOTHING;

-- Escalation rules for new agents
INSERT INTO public.escalation_rules (from_agent, to_agent, condition_text, priority)
VALUES
  ('payment_proof', 'payment_approval', 'OCR selesai, kirim ke manager untuk konfirmasi', 8),
  ('price_list', 'booking', 'Tamu mau lanjut booking setelah lihat harga', 9),
  ('room_brochure', 'booking', 'Tamu mau booking setelah lihat foto kamar', 10)
ON CONFLICT DO NOTHING;
