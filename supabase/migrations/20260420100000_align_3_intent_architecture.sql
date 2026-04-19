-- Align multi-agent architecture to 3-intent model (faq, booking, complaint)
-- Payment is now a sub-flow of Booking agent, not a separate top-level intent.
-- Payment agent config is kept (for payment_proof/approval sub-agents) but not routed directly.

-- Update payment agent: set booking as escalation target (payment → booking fallback)
UPDATE public.agent_configs
SET escalation_target = 'booking',
    role = 'Sub-flow pembayaran dalam Booking agent. Handles bayar, transfer, rekening via chatbot-tools.'
WHERE agent_id = 'payment';

-- Ensure FAQ → booking escalation rule exists (FAQ can't answer → re-route via orchestrator)
INSERT INTO public.escalation_rules (from_agent, to_agent, condition_text, priority, is_active)
VALUES ('faq', 'booking', 'FAQ tidak bisa jawab, perlu tools booking/payment', 1, true)
ON CONFLICT DO NOTHING;

-- Remove any direct payment escalation rules from orchestrator level
-- (payment is now handled inside booking agent, not routed by orchestrator)
DELETE FROM public.escalation_rules
WHERE from_agent = 'payment' AND to_agent != 'payment_approval';
