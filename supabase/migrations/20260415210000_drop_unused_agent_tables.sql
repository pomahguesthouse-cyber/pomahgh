-- =====================================================
-- Drop unused agent_decision_logs & agent_tool_logs tables
-- Superseded by unified agent_routing_logs table
-- (created in 20260415121932_ab61742f migration)
-- =====================================================

-- Unschedule the old cleanup cron job
SELECT cron.unschedule('cleanup-agent-logs-daily');

-- Drop the old cleanup function
DROP FUNCTION IF EXISTS cleanup_agent_logs();

-- Drop the unused tables
DROP TABLE IF EXISTS agent_tool_logs;
DROP TABLE IF EXISTS agent_decision_logs;
