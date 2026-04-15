-- ============================================================
-- Agent System Improvements
-- 1. Seed Complaint & Payment agents into agent_configs
-- 2. Fix RLS: restrict agent_routing_logs INSERT to service_role only
-- 3. Add 30-day cron cleanup for agent_routing_logs
-- ============================================================

-- 1. Seed missing Complaint & Payment agents
INSERT INTO public.agent_configs (agent_id, name, role, icon, category, tags, system_prompt, temperature, escalation_target, auto_escalate)
VALUES
  ('complaint', 'Complaint Agent', 'Tangani keluhan tamu dengan empati, eskalasi ke staff jika perlu', '😤', 'specialist', '{"complaint","escalation","empathy"}', NULL, 0.2, 'manager', true),
  ('payment', 'Payment Agent', 'Proses konfirmasi pembayaran, bukti transfer, dan status invoice', '💳', 'specialist', '{"payment","invoice","confirmation"}', NULL, 0.3, 'manager', true)
ON CONFLICT (agent_id) DO NOTHING;

-- Also add escalation rules for the new agents
INSERT INTO public.escalation_rules (from_agent, to_agent, condition_text, priority)
VALUES
  ('complaint', 'manager', 'Keluhan butuh tindak lanjut manual dari pengelola', 6),
  ('payment', 'booking', 'Pembayaran terkonfirmasi, lanjut proses booking', 7)
ON CONFLICT DO NOTHING;

-- 2. Fix RLS: Remove overly permissive INSERT policy, service_role bypasses RLS
DROP POLICY IF EXISTS "Anyone can insert routing logs" ON public.agent_routing_logs;

-- 3. Cron cleanup: delete agent_routing_logs older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_agent_routing_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.agent_routing_logs
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$;

-- Schedule daily cleanup at 03:00 WIB (20:00 UTC previous day)
SELECT cron.schedule(
  'cleanup-agent-routing-logs-30d',
  '0 20 * * *',
  $$SELECT public.cleanup_agent_routing_logs()$$
);
