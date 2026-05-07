import type { SupabaseClient, EnvConfig, WhatsAppSession } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { formatForWhatsApp } from '../utils/format.ts';
import { ensureConversation, updateSession } from '../services/session.ts';
import { logMessage } from '../services/conversation.ts';
import { sendWhatsApp } from '../services/fonnte.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';
import { getFullHouseInfo, formatFullHouseReply } from '../../_shared/fullHousePricing.ts';

export { isFullHouseQuestion } from '../../_shared/fullHousePricing.ts';

/**
 * Reply immediately when guest asks about renting the whole guesthouse.
 */
export async function handleFullHouseQuestion(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  message: string,
  conversationId: string,
  env: EnvConfig,
  trace?: TraceContext,
): Promise<Response> {
  const convId = conversationId || (await ensureConversation(supabase, session, phone));
  await logMessage(supabase, convId, 'user', message);
  await updateSession(supabase, phone, convId, false);

  const info = await getFullHouseInfo(supabase);
  const response = formatFullHouseReply(info);

  await logMessage(supabase, convId, 'assistant', response);
  const formatted = formatForWhatsApp(response);
  const result = await sendWhatsApp(phone, formatted, env.fonnteApiKey);
  if (result.status === false) {
    console.error(`❌ FullHouse: Failed to send to ${phone}: ${result.detail}`);
  }

  logAgentDecision(supabase, {
    trace_id: trace?.traceId,
    phone_number: phone,
    conversation_id: convId,
    from_agent: 'orchestrator',
    to_agent: 'full_house',
    reason: 'full_house_question',
    intent: 'full_house_inquiry',
  });

  return new Response(JSON.stringify({ status: 'full_house_sent', conversation_id: convId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}