-- =====================================================
-- Multi-Agent Dashboard: Agent Decision & Tool Logs
-- =====================================================

-- 1. Agent decision log — tracks routing decisions between agents
CREATE TABLE IF NOT EXISTS agent_decision_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id text,
  conversation_id uuid,
  phone_number text,
  from_agent text NOT NULL,
  to_agent text,
  reason text,
  intent text,
  confidence numeric(3,2),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 2. Tool execution log — tracks individual tool calls across agents
CREATE TABLE IF NOT EXISTS agent_tool_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id text,
  conversation_id uuid,
  tool_name text NOT NULL,
  arguments jsonb DEFAULT '{}',
  result_status text NOT NULL DEFAULT 'pending',
  result_summary text,
  duration_ms integer,
  error_message text,
  agent_name text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_agent_decisions_created ON agent_decision_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_conv ON agent_decision_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_trace ON agent_decision_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_agent_tools_created ON agent_tool_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tools_conv ON agent_tool_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_tools_trace ON agent_tool_logs(trace_id);

-- Enable RLS
ALTER TABLE agent_decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies: admin read-only access
CREATE POLICY "Admin read agent_decision_logs" ON agent_decision_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role insert agent_decision_logs" ON agent_decision_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin read agent_tool_logs" ON agent_tool_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role insert agent_tool_logs" ON agent_tool_logs
  FOR INSERT WITH CHECK (true);

-- Auto-cleanup: keep only 30 days of logs
CREATE OR REPLACE FUNCTION cleanup_agent_logs() RETURNS void AS $$
BEGIN
  DELETE FROM agent_decision_logs WHERE created_at < now() - interval '30 days';
  DELETE FROM agent_tool_logs WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup daily at 04:00 WIB (21:00 UTC)
SELECT cron.schedule(
  'cleanup-agent-logs-daily',
  '0 21 * * *',
  'SELECT cleanup_agent_logs()'
);
