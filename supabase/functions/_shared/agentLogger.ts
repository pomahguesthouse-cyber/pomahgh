/**
 * Shared helper for logging agent decisions and tool executions.
 * Used by edge functions to populate the agent dashboard tables.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface DecisionLog {
  trace_id?: string;
  conversation_id?: string;
  phone_number?: string;
  from_agent: string;
  to_agent?: string;
  reason?: string;
  intent?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface ToolLog {
  trace_id?: string;
  conversation_id?: string;
  tool_name: string;
  arguments?: Record<string, unknown>;
  result_status: 'success' | 'pending' | 'failed';
  result_summary?: string;
  duration_ms?: number;
  error_message?: string;
  agent_name?: string;
}

/**
 * Log an agent routing decision (fire-and-forget).
 */
export function logAgentDecision(supabase: SupabaseClient, entry: DecisionLog): void {
  supabase.from('agent_decision_logs').insert(entry).then(({ error }) => {
    if (error) console.warn('[agentLogger] Decision log failed:', error.message);
  });
}

/**
 * Log a tool execution result (fire-and-forget).
 */
export function logToolExecution(supabase: SupabaseClient, entry: ToolLog): void {
  supabase.from('agent_tool_logs').insert(entry).then(({ error }) => {
    if (error) console.warn('[agentLogger] Tool log failed:', error.message);
  });
}
