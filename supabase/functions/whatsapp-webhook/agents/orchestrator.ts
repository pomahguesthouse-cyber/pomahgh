import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { normalizePhone } from '../utils/phone.ts';
import { normalizeIndonesianMessage } from '../utils/slang.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';
import { checkRateLimit } from '../middleware/rateLimiter.ts';
import { getCachedHotelSettings, ensureConversation, updateSession } from '../services/session.ts';
import { logMessage } from '../services/conversation.ts';
import { handlePriceApproval } from './pricing.ts';
import { handleManagerChat } from './manager.ts';
import { handleNameCollection } from './intent.ts';
import { handleGuestBookingFlow } from './booking.ts';

/**
 * Orchestrator Agent: Central routing hub.
 * Determines message type and delegates to the appropriate agent.
 */
export async function orchestrate(
  req: Request,
  env: EnvConfig,
  trace?: TraceContext,
): Promise<Response> {
  const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey);

  // Parse body
  const body = await parseRequestBody(req);
  if (!body) {
    return new Response(JSON.stringify({ status: "error", reason: "invalid body format" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { sender, message } = body;
  if (!sender || !message) {
    return new Response(JSON.stringify({ status: "skipped", reason: "no sender or message" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const phone = normalizePhone(String(sender));
  const normalizedMessage = normalizeIndonesianMessage(String(message));
  trace?.info('Processing message', { phone, message_length: String(message).length });

  // Rate limit
  if (!checkRateLimit(phone)) {
    logAgentDecision(supabase, { trace_id: trace?.traceId, phone_number: phone, from_agent: 'orchestrator', reason: 'rate_limited' });
    return new Response(JSON.stringify({ status: "rate_limited" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load settings, chatbot persona, session in parallel
  const [hotelSettings, { data: chatbotSettingsRow }, { data: session }] = await Promise.all([
    getCachedHotelSettings(supabase),
    supabase.from('chatbot_settings').select('persona_name, greeting_message').single(),
    supabase.from('whatsapp_sessions').select('*').eq('phone_number', phone).single(),
  ]);

  const personaName = chatbotSettingsRow?.persona_name || 'Rani';
  const sessionTimeoutMinutes = hotelSettings?.whatsapp_session_timeout_minutes || 15;
  const aiWhitelist: string[] = hotelSettings?.whatsapp_ai_whitelist || [];
  const responseMode = hotelSettings?.whatsapp_response_mode || 'ai';
  const managerNumbers: ManagerInfo[] = hotelSettings?.whatsapp_manager_numbers || [];

  // Blocked check
  if ((session as WhatsAppSession)?.is_blocked) {
    return new Response(JSON.stringify({ status: "blocked" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // MANUAL mode
  if (responseMode === 'manual') {
    const convId = await ensureConversation(supabase, session, phone);
    await logMessage(supabase, convId, 'user', String(message));
    await updateSession(supabase, phone, convId, true);
    return new Response(JSON.stringify({ status: "manual_mode", conversation_id: convId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // AI whitelist (auto takeover)
  if (aiWhitelist.includes(phone)) {
    const convId = await ensureConversation(supabase, session, phone);
    await logMessage(supabase, convId, 'user', String(message));
    await updateSession(supabase, phone, convId, true);
    return new Response(JSON.stringify({ status: "whitelist_takeover", conversation_id: convId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Manager detection
  const isManager = managerNumbers.some(m => m.phone === phone);
  const managerInfo = isManager ? managerNumbers.find(m => m.phone === phone)! : null;

  // === PRICING AGENT: Price approval commands ===
  if (isManager && managerInfo) {
    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone,
      from_agent: 'orchestrator', to_agent: 'pricing',
      reason: 'manager_detected', intent: 'price_approval',
    });
    const priceResult = await handlePriceApproval(supabase, normalizedMessage, phone, managerInfo, env);
    if (priceResult) return priceResult;

    // === MANAGER AGENT: Pengelola chatbot ===
    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone,
      from_agent: 'orchestrator', to_agent: 'manager',
      reason: 'manager_chat', intent: 'manager_command',
    });
    return handleManagerChat(supabase, session, phone, normalizedMessage, managerInfo, env);
  }

  // === TAKEOVER mode (admin took over) ===
  if ((session as WhatsAppSession)?.is_takeover) {
    const convId = await ensureConversation(supabase, session, phone);
    await logMessage(supabase, convId, 'user', String(message));
    await supabase.from('whatsapp_sessions').update({ last_message_at: new Date().toISOString() }).eq('phone_number', phone);
    return new Response(JSON.stringify({ status: "takeover_mode", conversation_id: convId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // === Session management ===
  const SESSION_TIMEOUT = sessionTimeoutMinutes * 60 * 1000;
  const lastMessageAt = (session as WhatsAppSession)?.last_message_at ? new Date((session as WhatsAppSession).last_message_at!).getTime() : 0;
  const isStale = Date.now() - lastMessageAt > SESSION_TIMEOUT;
  let conversationId = (session as WhatsAppSession)?.conversation_id;
  const isNewSession = !conversationId || isStale;

  if (isNewSession) {
    const { data: newConv } = await supabase
      .from('chat_conversations')
      .insert({ session_id: `wa_${phone}_${Date.now()}`, message_count: 0 })
      .select().single();
    conversationId = newConv?.id;
  }

  // === INTENT AGENT: Name collection ===
  const nameResult = await handleNameCollection(
    supabase, session as WhatsAppSession, phone, conversationId!, String(message),
    normalizedMessage, isNewSession, personaName, env
  );
  if (nameResult) {
    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
      from_agent: 'orchestrator', to_agent: 'intent',
      reason: 'name_collection', intent: 'greeting',
    });
    return nameResult;
  }

  // === BOOKING AGENT: AI conversation ===
  logAgentDecision(supabase, {
    trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
    from_agent: 'orchestrator', to_agent: 'booking',
    reason: 'guest_booking_flow', intent: 'booking_inquiry',
  });
  return handleGuestBookingFlow(
    supabase, session as WhatsAppSession, phone, normalizedMessage, conversationId!,
    personaName, managerNumbers, env, trace
  );
}

/** Parse various content types from webhook body */
async function parseRequestBody(req: Request): Promise<Record<string, unknown> | null> {
  const contentType = req.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) return await req.json();
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      return Object.fromEntries(formData.entries());
    }
    const text = await req.text();
    if (!text || text.trim() === '') return null;
    try { return JSON.parse(text); } catch {
      return Object.fromEntries(new URLSearchParams(text).entries());
    }
  } catch {
    console.error("Body parse error");
    return null;
  }
}
