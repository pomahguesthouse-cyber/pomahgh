// ============= AUDIT LOGGING =============

import type { ToolExecution } from "./types.ts";

interface AuditEntry {
  adminId: string;
  adminEmail: string | null;
  sessionId: string;
  userMessage: string;
  executedTools: ToolExecution[];
  aiResponse: string;
  durationMs: number;
  ipAddress: string;
  userAgent: string;
}

/**
 * Log audit entry to database
 * Non-blocking - failures don't break the chatbot
 */
export async function logAuditEntry(
  supabase: any,
  entry: AuditEntry
): Promise<void> {
  try {
    await supabase
      .from('admin_chatbot_audit_logs')
      .insert({
        admin_id: entry.adminId,
        admin_email: entry.adminEmail,
        session_id: entry.sessionId,
        user_message: entry.userMessage,
        tool_calls: entry.executedTools,
        ai_response: entry.aiResponse,
        duration_ms: entry.durationMs,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
      });
    
    console.log(`Audit log saved: admin=${entry.adminEmail}, message="${entry.userMessage.substring(0, 50)}..."`);
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't throw - audit logging failure shouldn't break the chatbot
  }
}
