-- Remove room_brochure agent — its functionality is now handled by the FAQ agent (faq.ts)
-- The FAQ agent already had trySendRoomBrochure logic; the separate agent was redundant.

DELETE FROM public.escalation_rules WHERE from_agent = 'room_brochure' OR to_agent = 'room_brochure';
DELETE FROM public.agent_configs WHERE agent_id = 'room_brochure';
