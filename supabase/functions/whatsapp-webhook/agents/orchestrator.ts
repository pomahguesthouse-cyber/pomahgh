import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { normalizePhone, isValidPhone } from '../utils/phone.ts';
import { normalizeIndonesianMessage } from '../utils/slang.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';
import { checkRateLimit } from '../middleware/rateLimiter.ts';
import { getCachedHotelSettings, ensureConversation, updateSession } from '../services/session.ts';
import { logMessage } from '../services/conversation.ts';
import { sendWhatsApp } from '../services/fonnte.ts';
import { handlePriceApproval } from './pricing.ts';
import { handleManagerChat } from './manager.ts';
import { handleNameCollection } from './intent.ts';
import { handleGuestBookingFlow } from './booking.ts';
import { handleGuestFAQ } from './faq.ts';
import { handleComplaint, isComplaintMessage } from './complaint.ts';
import { handlePayment, isPaymentMessage } from './payment.ts';
import { setAgentConfigs, isAgentActive, getEscalationTarget, type AgentConfigRecord, type EscalationRule } from '../../_shared/agentConfigCache.ts';

/**
 * Check if guest has a recent booking with pending payment.
 */
async function hasPendingPaymentBooking(supabase: SupabaseClient, phone: string): Promise<boolean> {
  const normalizedPhone = phone.startsWith('62') ? '0' + phone.slice(2) : phone;
  const { data } = await supabase
    .from('bookings')
    .select('id')
    .or(`guest_phone.eq.${phone},guest_phone.eq.${normalizedPhone}`)
    .in('payment_status', ['pending', 'unpaid'])
    .in('status', ['pending_payment', 'confirmed'])
    .order('created_at', { ascending: false })
    .limit(1);
  return !!(data && data.length > 0);
}

type IntentType = 'faq' | 'booking' | 'complaint' | 'payment';

/**
 * Detect intent category from normalized message.
 * Priority: complaint > payment > booking > faq (default for unknown)
 */
function detectIntent(message: string): IntentType {
  // 1. Complaint: negative sentiment takes highest priority
  if (isComplaintMessage(message)) {
    return 'complaint';
  }

  // 2. Payment: explicit payment-related keywords
  if (isPaymentMessage(message)) {
    return 'payment';
  }

  // 3. Booking: reservation, availability, pricing, room names, or short follow-ups
  const bookingPatterns = /\b(book|booking|pesan\s+kamar|reservas|cek\s+ketersediaan|ketersediaan|tersedia|available|ada\s+kamar|masih\s+ada|check.?in|check.?out|extend|perpanjang|tambah\s+(?:malam|hari)|cancel|batal|refund|promo|diskon|mau\s+(?:menginap|pesan|booking|nginap)|kamar\s+(?:kosong|tersedia|available)|hari\s+ini|malam\s+ini|besok|untuk\s+\d+\s+orang|\d+\s+(?:orang|kamar|malam))\b/i;
  const pricePatterns = /\b(?:(?:berapa|brp)\s+(?:harga|tarif|biaya|per\s*malam)|harga\s+kamar|tarif\s+kamar|biaya\s+(?:menginap|kamar)|jadi\s+berapa|total(?:nya)?)\b/i;
  // Room type names → always booking intent (need tool access for availability)
  const roomNamePatterns = /\b(deluxe|grand\s*deluxe|family\s*suite|single|standard|superior|twin|double|triple|kamar)\b/i;
  // Short follow-up messages in active conversations
  const bookingFollowUpPatterns = /^(ada\??|ada\s+ya\??|ada\s+ga\??|ada\s+gak\??|gimana(?:\s+kak)?\??|bagaimana(?:\s+kak)?\??|boleh\??|lanjut\??|cek\??|mau\??|jadi\??|di\s*web\s+masih\s+ada)$/i;

  if (bookingPatterns.test(message) || pricePatterns.test(message) || roomNamePatterns.test(message) || bookingFollowUpPatterns.test(message.trim())) {
    return 'booking';
  }

  // 4. FAQ: general info about facilities, location, etc.
  const faqPatterns = /\b(fasilitas|facility|wifi|parkir|parking|sarapan|breakfast|kolam|pool|ac|handuk|towel|alamat|lokasi|location|arah|direction|dekat|nearby|jam\s+(?:buka|operasional|kerja)|buka\s+(?:jam|sampai)|tutup\s+(?:jam|pukul)|aturan|rule|policy|kebijakan|smoking|merokok|hewan|pet|anak|child|extra\s+bed|laundry|restoran|restaurant|mushola|masjid|transportasi|airport|bandara|stasiun|terminal)\b/i;

  if (faqPatterns.test(message)) {
    return 'faq';
  }

  // Default UNKNOWN → FAQ (knowledge base fallback)
  return 'faq';
}

/** Messages that are ambiguous short replies - could be payment context */
function isAmbiguousShortReply(message: string): boolean {
  return /^(ya|iya|oke|ok|baik|sudah|done|siap|non-text message|image|foto|photo)$/i.test(message.trim());
}

/**
 * Notify Human Staff (Super Admins) on critical errors.
 */
async function escalateToHumanStaff(
  supabase: SupabaseClient,
  phone: string,
  conversationId: string,
  errorMessage: string,
  managerNumbers: ManagerInfo[],
  fonnteApiKey: string,
): Promise<void> {
  try {
    const superAdmins = managerNumbers.filter(m => m.role === 'super_admin' || m.role === 'admin');
    const targets = superAdmins.length > 0 ? superAdmins : managerNumbers;
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const notif = `🔴 *ERROR AGENT*

📱 Tamu: ${phone}
❌ Error: ${errorMessage.substring(0, 200)}
⏰ ${now}

_Sistem gagal memproses pesan tamu. Mohon ditindaklanjuti manual._`;

    await Promise.allSettled(
      targets.map(m => sendWhatsApp(m.phone, notif, fonnteApiKey))
    );
  } catch (err) {
    console.error('Failed to escalate to human staff:', err);
  }
}

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
  if (!isValidPhone(phone)) {
    return new Response(JSON.stringify({ status: 'error', reason: 'invalid_phone_format' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const normalizedMessage = normalizeIndonesianMessage(String(message));
  trace?.info('Processing message', { phone, message_length: String(message).length });

  // Rate limit
  if (!checkRateLimit(phone)) {
    logAgentDecision(supabase, { trace_id: trace?.traceId, phone_number: phone, from_agent: 'orchestrator', reason: 'rate_limited' });
    return new Response(JSON.stringify({ status: "rate_limited" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load settings, chatbot persona, session, agent configs in parallel
  const [hotelSettings, { data: chatbotSettingsRow }, { data: session }, { data: agentConfigs }, { data: escalationRules }] = await Promise.all([
    getCachedHotelSettings(supabase),
    supabase.from('chatbot_settings').select('persona_name, greeting_message').single(),
    supabase.from('whatsapp_sessions').select('*').eq('phone_number', phone).single(),
    supabase.from('agent_configs').select('agent_id, is_active, system_prompt, temperature, escalation_target, auto_escalate'),
    supabase.from('escalation_rules').select('from_agent, to_agent, condition_text, priority, is_active').eq('is_active', true).order('priority', { ascending: true }),
  ]);

  // Populate shared agent config cache
  setAgentConfigs(
    (agentConfigs || []) as AgentConfigRecord[],
    (escalationRules || []) as EscalationRule[],
  );

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
    console.log(`⛔ Takeover active for ${phone} - AI skipped`);
    await supabase.from('whatsapp_sessions').update({ last_message_at: new Date().toISOString() }).eq('phone_number', phone);
    return new Response(JSON.stringify({ status: "takeover_mode", conversation_id: convId, reason: 'manual_takeover_active' }), {
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
    const { data: newConv, error: convError } = await supabase
      .from('chat_conversations')
      .insert({ session_id: `wa_${phone}_${Date.now()}`, message_count: 0 })
      .select().single();
    if (convError || !newConv?.id) {
      console.error('Failed to create conversation:', convError);
      return new Response(JSON.stringify({ status: 'error', reason: 'conversation_creation_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    conversationId = newConv.id;
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

  // === INTENT DETECTION: Route to appropriate agent ===
  let intent = detectIntent(normalizedMessage);

  // === CONTEXT-AWARE ROUTING: Ambiguous messages with pending payment → payment agent ===
  if ((intent === 'faq' || intent === 'booking') && isAmbiguousShortReply(normalizedMessage)) {
    const hasPending = await hasPendingPaymentBooking(supabase, phone);
    if (hasPending) {
      console.log(`💰 Context-aware routing: ${phone} has pending payment, routing ambiguous message to payment`);
      intent = 'payment';
    }
  }
  // Non-text messages (images/files) with pending payment → likely payment proof
  if (intent === 'faq' && /non-text message/i.test(normalizedMessage)) {
    const hasPending = await hasPendingPaymentBooking(supabase, phone);
    if (hasPending) {
      console.log(`💰 Context-aware routing: ${phone} sent media with pending payment → payment agent`);
      intent = 'payment';
    }
  }

  // Resolve target agent: check is_active, fallback to escalation_target
  let resolvedAgent: string = intent;
  if (!isAgentActive(resolvedAgent)) {
    const fallback = getEscalationTarget(resolvedAgent);
    resolvedAgent = (fallback && isAgentActive(fallback)) ? fallback : 'booking';
    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
      from_agent: 'orchestrator', to_agent: resolvedAgent,
      reason: `${intent}_agent_inactive`, intent,
    });
  }
  console.log(`🎯 Intent: ${intent}, Agent: ${resolvedAgent} for ${phone}`);

  try {
    // === COMPLAINT AGENT ===
    if (resolvedAgent === 'complaint') {
      logAgentDecision(supabase, {
        trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
        from_agent: 'orchestrator', to_agent: 'complaint',
        reason: 'complaint_intent_detected', intent: 'complaint',
      });
      return await handleComplaint(
        supabase, session as WhatsAppSession, phone, normalizedMessage,
        conversationId!, personaName, managerNumbers, env, trace
      );
    }

    // === PAYMENT AGENT ===
    if (resolvedAgent === 'payment') {
      logAgentDecision(supabase, {
        trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
        from_agent: 'orchestrator', to_agent: 'payment',
        reason: 'payment_intent_detected', intent: 'payment',
      });
      return await handlePayment(
        supabase, session as WhatsAppSession, phone, normalizedMessage,
        conversationId!, personaName, managerNumbers, env, trace
      );
    }

    // === FAQ AGENT ===
    if (resolvedAgent === 'faq') {
      logAgentDecision(supabase, {
        trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
        from_agent: 'orchestrator', to_agent: 'faq',
        reason: 'faq_intent_detected', intent: 'faq',
      });

      const faqResult = await handleGuestFAQ(
        supabase, session as WhatsAppSession, phone, normalizedMessage,
        conversationId!, personaName, env, trace
      );

      // If FAQ agent escalated (needed tools), use escalation_rules from DB
      const faqBody = await faqResult.clone().json().catch(() => null);
      if (faqBody?.status === 'faq_escalate_to_booking') {
        const faqEscTarget = getEscalationTarget('faq') || 'booking';
        console.log(`🔀 FAQ → ${faqEscTarget} Agent escalation`);
        logAgentDecision(supabase, {
          trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
          from_agent: 'faq', to_agent: faqEscTarget,
          reason: 'faq_needs_tools', intent: 'booking',
        });
        // Fall through to booking agent below
      } else {
        return faqResult;
      }
    }

    // === BOOKING AGENT: AI conversation with tools ===
    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
      from_agent: 'orchestrator', to_agent: 'booking',
      reason: resolvedAgent === 'faq' ? 'faq_escalation' : 'booking_intent_detected',
      intent: 'booking_inquiry',
    });
    return await handleGuestBookingFlow(
      supabase, session as WhatsAppSession, phone, normalizedMessage, conversationId!,
      personaName, managerNumbers, env, trace
    );

  } catch (agentError) {
    // === ERROR → HUMAN STAFF ESCALATION ===
    const errorMsg = (agentError as Error).message || 'Unknown agent error';
    console.error(`❌ Agent error for ${phone}:`, errorMsg);

    // Log error
    await logMessage(supabase, conversationId!, 'system',
      `[Error] Agent ${intent} failed: ${errorMsg}`
    );

    // Notify human staff
    await escalateToHumanStaff(supabase, phone, conversationId!, errorMsg, managerNumbers, env.fonnteApiKey);

    // Send apology to guest
    const apologyMsg = 'Maaf, ada kendala dalam memproses pesan Anda. Tim kami akan segera menghubungi Anda. 🙏';
    await sendWhatsApp(phone, apologyMsg, env.fonnteApiKey);
    await logMessage(supabase, conversationId!, 'assistant', apologyMsg);

    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
      from_agent: intent, to_agent: 'human_staff',
      reason: 'agent_error', intent: 'error_escalation',
    });

    return new Response(JSON.stringify({
      status: 'error_escalated', conversation_id: conversationId, error: errorMsg,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
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
