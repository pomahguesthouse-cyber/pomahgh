-- ============================================================
-- Fix escalation rules to match actual backend agent routing
-- 
-- Previous rules were inaccurate:
--   - "intent → faq/booking" = orchestrator routing, NOT escalation
--   - "booking → manager" = doesn't exist in code
--   - "pricing → booking" = doesn't exist in code
--
-- Correct rules based on actual code in whatsapp-webhook/agents/:
--   1. faq → booking: FAQ agent returns faq_escalate_to_booking (needs tools)
--   2. complaint → human_staff: complaint.ts always notifies managers
--   3. payment_proof → payment_approval: OCR done, manager reviews
--   4. payment → booking: after payment info given, may need booking context
--   5. price_list → booking: guest wants to book after seeing prices
--   6. room_brochure → booking: guest wants to book after seeing photos
--   7. any_agent → human_staff: error catch in orchestrator
-- ============================================================

-- Remove incorrect rules
DELETE FROM public.escalation_rules 
WHERE (from_agent = 'intent' AND to_agent = 'faq')
   OR (from_agent = 'intent' AND to_agent = 'booking')
   OR (from_agent = 'booking' AND to_agent = 'manager')
   OR (from_agent = 'pricing' AND to_agent = 'booking');

-- Update existing faq → booking rule with better description
UPDATE public.escalation_rules
SET condition_text = 'FAQ butuh tools (cek ketersediaan, harga) → eskalasi ke booking agent',
    priority = 1
WHERE from_agent = 'faq' AND to_agent = 'booking';

-- Insert correct escalation rules (skip if already exists from previous migrations)
INSERT INTO public.escalation_rules (from_agent, to_agent, condition_text, priority, is_active)
VALUES
  ('complaint', 'human_staff', 'Semua keluhan tamu otomatis di-eskalasi ke manager via WhatsApp', 2, true),
  ('payment_proof', 'payment_approval', 'OCR bukti transfer selesai → kirim ke manager untuk konfirmasi YA/TIDAK', 3, true),
  ('payment', 'booking', 'Info pembayaran diberikan, tamu mungkin perlu lanjut ke proses booking', 4, true),
  ('price_list', 'booking', 'Tamu sudah lihat daftar harga → lanjut tanya ketersediaan/booking', 5, true),
  ('room_brochure', 'booking', 'Tamu sudah lihat foto/brosur kamar → lanjut booking', 6, true),
  ('booking', 'human_staff', 'Error atau tamu stuck berulang → eskalasi ke staff manusia', 7, true),
  ('payment_approval', 'booking', 'Pembayaran dikonfirmasi manager → kirim booking order ke tamu', 8, true)
ON CONFLICT DO NOTHING;
