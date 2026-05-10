-- Cleanup BUG 6: remove room_brochure escalation rule (handler removed)
DELETE FROM public.escalation_rules WHERE from_agent = 'room_brochure' OR to_agent = 'room_brochure';

-- Cleanup legacy agent_configs rows without handlers (payment delegated to booking; pricing is logging-only label)
DELETE FROM public.agent_configs WHERE agent_id IN ('payment', 'pricing');