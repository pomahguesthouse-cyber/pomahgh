/**
 * Shared helper for logging agent decisions and tool executions.
 * Writes to agent_routing_logs table for dashboard observability.
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
  supabase.from('agent_routing_logs').insert({
    trace_id: entry.trace_id,
    conversation_id: entry.conversation_id,
    phone_number: entry.phone_number,
    from_agent: entry.from_agent,
    to_agent: entry.to_agent,
    reason: entry.reason,
    intent: entry.intent,
    metadata: entry.metadata || {},
  }).then(({ error }) => {
    if (error) console.warn('[agentLogger] Decision log failed:', error.message);
  });
}

/**
 * Log a tool execution result (fire-and-forget).
 * Stored as routing log with tool metadata.
 */
export function logToolExecution(supabase: SupabaseClient, entry: ToolLog): void {
  supabase.from('agent_routing_logs').insert({
    trace_id: entry.trace_id,
    conversation_id: entry.conversation_id,
    from_agent: entry.agent_name || 'unknown',
    to_agent: `tool:${entry.tool_name}`,
    reason: entry.result_status,
    duration_ms: entry.duration_ms,
    metadata: {
      tool_name: entry.tool_name,
      arguments: entry.arguments,
      result_summary: entry.result_summary,
      error_message: entry.error_message,
    },
  }).then(({ error }) => {
    if (error) console.warn('[agentLogger] Tool log failed:', error.message);
  });
}
