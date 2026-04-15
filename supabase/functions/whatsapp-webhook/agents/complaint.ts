import type { SupabaseClient, EnvConfig, ManagerInfo, WhatsAppSession } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { logMessage } from '../services/conversation.ts';
import { sendWhatsApp } from '../services/fonnte.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';

/** Sentiment keywords and urgency levels */
const COMPLAINT_PATTERNS = {
  critical: /\b(ancam|hukum|lawyer|pengacara|polisi|media|viral|review\s+jelek|review\s+negatif|gugat|tuntut|rusak\s+parah|bahaya|emergency|darurat)\b|😡🤬/i,
  high: /\b(marah|gila|brengsek|bangsat|anjing|bego|tolol|bodoh|goblok|kampret|tai|parah\s+banget|sangat\s+kecewa|kapok|nyesel|menyesal|tidak\s+terima|ngga\s+terima|gak\s+terima)\b|[😡😤🤬💢😠]{2,}/i,
  medium: /\b(kecewa|mengecewakan|tidak\s+puas|komplain|keluhan|buruk|jelek|kotor|bau|berisik|rusak|lambat|lama\s+banget|ga\s+bisa|nggak\s+bisa|tidak\s+bisa|masalah|problem|issue)\b|[😡😤😠👎]/i,
  low: /\b(kurang|agak|sedikit|saran|masukan|mending|sebaiknya|harusnya|seharusnya|tolong\s+perbaiki|mohon\s+diperbaiki)\b/i,
};

export type ComplaintUrgency = 'critical' | 'high' | 'medium' | 'low';

/** Detect complaint urgency from message */
export function detectComplaintUrgency(message: string): ComplaintUrgency | null {
  if (COMPLAINT_PATTERNS.critical.test(message)) return 'critical';
  if (COMPLAINT_PATTERNS.high.test(message)) return 'high';
  if (COMPLAINT_PATTERNS.medium.test(message)) return 'medium';
  if (COMPLAINT_PATTERNS.low.test(message)) return 'low';
  return null;
}

/** Check if message is a complaint */
export function isComplaintMessage(message: string): boolean {
  return detectComplaintUrgency(message) !== null;
}

const EMPATHY_RESPONSES: Record<ComplaintUrgency, string> = {
  critical: 'Kami sangat memahami situasi Anda dan kami mohon maaf yang sebesar-besarnya. Tim manajemen kami akan *segera* menghubungi Anda untuk menyelesaikan masalah ini. 🙏',
  high: 'Kami sangat memahami kekecewaan Anda dan mohon maaf atas ketidaknyamanan ini. Tim manajemen kami akan segera menghubungi Anda. 🙏',
  medium: 'Mohon maaf atas ketidaknyamanan yang Anda alami. Kami sudah meneruskan keluhan Anda ke tim manajemen, dan mereka akan segera menghubungi Anda. 🙏',
  low: 'Terima kasih atas masukan Anda. Kami sudah mencatat saran ini dan meneruskannya ke tim kami untuk ditindaklanjuti. 🙏',
};

/**
 * Complaint Agent: Handle negative sentiment messages.
 * Sends empathetic response to guest and notifies all Super Admins.
 */
export async function handleComplaint(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  normalizedMessage: string,
  conversationId: string,
  personaName: string,
  managerNumbers: ManagerInfo[],
  env: EnvConfig,
  trace?: TraceContext,
): Promise<Response> {
  const urgency = detectComplaintUrgency(normalizedMessage) || 'medium';
  const guestName = session?.guest_name || `Tamu WA ${phone.slice(-4)}`;

  console.log(`🚨 Complaint Agent: urgency=${urgency}, phone=${phone}`);

  // Update session
  await supabase.from('whatsapp_sessions').upsert({
    phone_number: phone, conversation_id: conversationId,
    last_message_at: new Date().toISOString(), is_active: true, session_type: 'guest',
  }, { onConflict: 'phone_number' });

  // Log user message
  await logMessage(supabase, conversationId, 'user', normalizedMessage);

  // Send empathetic response
  const empathyResponse = EMPATHY_RESPONSES[urgency];
  await logMessage(supabase, conversationId, 'assistant', empathyResponse);
  await sendWhatsApp(phone, empathyResponse, env.fonnteApiKey);

  // Notify all Super Admins / Managers
  const superAdmins = managerNumbers.filter(m => 
    m.role === 'super_admin' || m.role === 'admin'
  );
  const notifyTargets = superAdmins.length > 0 ? superAdmins : managerNumbers;

  const urgencyEmoji: Record<ComplaintUrgency, string> = {
    critical: '🔴 CRITICAL',
    high: '🟠 HIGH',
    medium: '🟡 MEDIUM',
    low: '🟢 LOW',
  };

  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const notifMessage = `⚠️ *KELUHAN TAMU*

${urgencyEmoji[urgency]}

👤 Tamu: ${guestName}
📱 HP: ${phone}
💬 Pesan: "${normalizedMessage.substring(0, 200)}"

⏰ ${now}

_Segera hubungi tamu untuk menyelesaikan masalah ini._`;

  // Send notifications in parallel
  const notifyResults = await Promise.allSettled(
    notifyTargets.map(manager =>
      sendWhatsApp(manager.phone, notifMessage, env.fonnteApiKey)
    )
  );

  const successCount = notifyResults.filter(r => r.status === 'fulfilled').length;
  console.log(`📢 Complaint notifications sent: ${successCount}/${notifyTargets.length}`);

  // Log system message for audit
  await logMessage(supabase, conversationId, 'system',
    `[Complaint Agent] Urgency: ${urgency}. Notified ${successCount}/${notifyTargets.length} managers.`
  );

  logAgentDecision(supabase, {
    trace_id: trace?.traceId, conversation_id: conversationId, phone_number: phone,
    from_agent: 'complaint', to_agent: 'human_staff',
    reason: `complaint_${urgency}`, intent: 'complaint_escalation',
  });

  return new Response(JSON.stringify({
    status: 'complaint_handled', urgency, conversation_id: conversationId,
    notified_count: successCount,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
