// ============= AUDIT LOGGING =============

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
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
  supabase: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    // Handle WhatsApp sources - they use format "whatsapp_XXXXX"
    const isWhatsAppAdmin = entry.adminId.startsWith('whatsapp_');
    
    // For WhatsApp, use a placeholder UUID since admin_id no longer has FK constraint
    // The actual phone number is stored in admin_email field
    const adminIdForDb = isWhatsAppAdmin 
      ? '00000000-0000-0000-0000-000000000000' // Placeholder UUID for WhatsApp
      : entry.adminId;
    
    const sourceType = isWhatsAppAdmin ? 'whatsapp' : 'web';
    
    const { error } = await supabase
      .from('admin_chatbot_audit_logs')
      .insert({
        admin_id: adminIdForDb,
        admin_email: entry.adminEmail, // Contains "Name (WhatsApp: phone)" for WhatsApp
        session_id: entry.sessionId,
        user_message: entry.userMessage,
        tool_calls: entry.executedTools,
        ai_response: entry.aiResponse,
        duration_ms: entry.durationMs,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        source_type: sourceType,
      });
    
    if (error) {
      console.error('Audit log insert error:', error);
    } else {
      console.log(`✅ Audit log saved: source=${sourceType}, admin=${entry.adminEmail}, message="${entry.userMessage.substring(0, 50)}..."`);
    }
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't throw - audit logging failure shouldn't break the chatbot
  }
}
