import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { normalizePhone, isValidPhone } from '../utils/phone.ts';
import { normalizeIndonesianMessage } from '../utils/slang.ts';
import { isLikelyPersonName } from '../utils/format.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';
import { checkRateLimit } from '../middleware/rateLimiter.ts';
import { getCachedHotelSettings, ensureConversation, updateSession } from '../services/session.ts';
import { logMessage } from '../services/conversation.ts';
import { sendWhatsApp } from '../services/fonnte.ts';
import { handlePriceApproval } from './pricing.ts';
import { handleManagerChat } from './manager.ts';
import { handleGuestBookingFlow } from './booking.ts';
import { handleGuestFAQ, isRoomPhotoRequest } from './faq.ts';
import { handleComplaint, isComplaintMessage } from './complaint.ts';
import { isPaymentMessage } from './payment.ts';
import { handlePaymentProof, extractImageUrl } from './paymentProof.ts';
import { handlePaymentApproval, isPaymentApprovalReply } from './paymentApproval.ts';
import { handlePriceListQuestion, isGenericPriceQuestion } from './priceList.ts';
import { setAgentConfigs, isAgentActive, getEscalationTarget, type AgentConfigRecord, type EscalationRule } from '../../_shared/agentConfigCache.ts';

type IntentType = 'faq' | 'booking' | 'complaint';

/**
 * Detect intent category from normalized message.
 * Priority: complaint > booking (incl. payment keywords) > faq (default for unknown)
 * Payment is a sub-flow of Booking agent, not a separate top-level intent.
 */

// Module-level compiled regex (once per isolate warm start)
const BOOKING_RE = /\b(book|booking|pesan\s+kamar|reservas|cek\s+ketersediaan|ketersediaan|tersedia|available|ada\s+kamar|masih\s+ada|check.?in|check.?out|extend|perpanjang|tambah\s+(?:malam|hari)|cancel|batal|refund|promo|diskon|mau\s+(?:menginap|pesan|booking|nginap)|kamar\s+(?:kosong|tersedia|available)|hari\s+ini|malam\s+ini|besok|untuk\s+\d+\s+orang|\d+\s+(?:orang|kamar|malam))\b/i;
const PRICE_RE = /\b(?:(?:berapa|brp)\s+(?:harga|tarif|biaya|per\s*malam)|harga\s+kamar|tarif\s+kamar|biaya\s+(?:menginap|kamar)|jadi\s+berapa|total(?:nya)?)\b/i;
const ROOM_NAME_RE = /\b(deluxe|grand\s*deluxe|family\s*suite|single|standard|superior|twin|double|triple|kamar)\b/i;
const BOOKING_FOLLOWUP_RE = /^(ada\??|ada\s+ya\??|ada\s+ga\??|ada\s+gak\??|gimana(?:\s+kak)?\??|bagaimana(?:\s+kak)?\??|boleh\??|lanjut\??|cek\??|mau\??|jadi\??|di\s*web\s+masih\s+ada)$/i;
const FAQ_RE = /\b(fasilitas|facility|wifi|parkir|parking|sarapan|breakfast|kolam|pool|ac|handuk|towel|alamat|lokasi|location|arah|direction|dekat|nearby|jam\s+(?:buka|operasional|kerja)|buka\s+(?:jam|sampai)|tutup\s+(?:jam|pukul)|aturan|rule|policy|kebijakan|smoking|merokok|hewan|pet|anak|child|extra\s+bed|laundry|restoran|restaurant|mushola|masjid|transportasi|airport|bandara|stasiun|terminal)\b/i;

function detectIntent(message: string): IntentType {
  // 1. Complaint: negative sentiment takes highest priority
  if (isComplaintMessage(message)) {
    return 'complaint';
  }

  // 2. Booking: reservation, availability, pricing, room names, payment, or short follow-ups
  //    Payment keywords (bayar, transfer, rekening) route to Booking agent which handles
  //    payment as a sub-flow via chatbot-tools (get_bank_accounts, check_payment_status).
  if (BOOKING_RE.test(message) || PRICE_RE.test(message) || ROOM_NAME_RE.test(message) || BOOKING_FOLLOWUP_RE.test(message.trim()) || isPaymentMessage(message)) {
    return 'booking';
  }

  // 3. FAQ: general info about facilities, location, etc.
  if (FAQ_RE.test(message)) {
    return 'faq';
  }

  // Default UNKNOWN → FAQ (knowledge base fallback)
  return 'faq';
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
  // Allow image-only messages (no caption). Only `sender` is strictly required.
  // For image attachments, Fonnte may send empty `message` field.
  const hasImageAttachment = !!extractImageUrl(body);
  if (!sender || (!message && !hasImageAttachment)) {
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
  const normalizedMessage = normalizeIndonesianMessage(String(message ?? ''));
  trace?.info('Processing message', { phone, message_length: String(message ?? '').length, has_image: hasImageAttachment });

  // Rate limit
  if (!await checkRateLimit(supabase, phone)) {
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

  // === IMAGE DETECTION: route image attachments to payment proof OCR ===
  // Guests: only when they have a pending booking (handled inside paymentProof).
  // Admins/managers: always — admin foto = bukti transfer untuk booking apapun (caption = kode booking).
  const imageUrl = extractImageUrl(body);
  if (imageUrl) {
    const convId = await ensureConversation(supabase, session, phone);
    // Caption may come as `message` (Fonnte sends image caption inside the message field).
    const caption = typeof message === 'string' ? message : null;
    try {
      return await handlePaymentProof(supabase, phone, imageUrl, convId, managerNumbers, env, trace, {
        submittedByManager: isManager ? managerInfo : null,
        caption,
      });
    } catch (proofError) {
      console.error(`❌ PaymentProof error for ${phone}:`, proofError);
      await sendWhatsApp(phone, 'Maaf, terjadi kendala saat memproses gambar Anda. Silakan coba kirim ulang. 🙏', env.fonnteApiKey);
      return new Response(JSON.stringify({ status: 'payment_proof_error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // === PAYMENT APPROVAL (manager YA/TIDAK reply ke notifikasi bukti transfer) ===
  if (isManager && managerInfo) {
    const approvalDecision = isPaymentApprovalReply(normalizedMessage);
    if (approvalDecision) {
      logAgentDecision(supabase, {
        trace_id: trace?.traceId, phone_number: phone,
        from_agent: 'orchestrator', to_agent: 'payment_approval',
        reason: 'manager_yes_no_reply', intent: approvalDecision,
      });
      try {
        return await handlePaymentApproval(supabase, phone, approvalDecision, managerInfo, managerNumbers, env);
      } catch (approvalError) {
        console.error(`❌ PaymentApproval error for ${phone}:`, approvalError);
        await sendWhatsApp(phone, 'Maaf, terjadi kesalahan saat memproses konfirmasi pembayaran. Silakan coba lagi.', env.fonnteApiKey);
        return new Response(JSON.stringify({ status: 'payment_approval_error' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // === PRICING AGENT: Price approval commands ===
  if (isManager && managerInfo) {
    const priceResult = await handlePriceApproval(supabase, normalizedMessage, phone, managerInfo, env);
    if (priceResult) {
      logAgentDecision(supabase, {
        trace_id: trace?.traceId, phone_number: phone,
        from_agent: 'orchestrator', to_agent: 'pricing',
        reason: 'manager_price_approval', intent: 'price_approval',
      });
      return priceResult;
    }

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

  // === NAME COLLECTION (merged into Orchestrator) ===
  try {
    const nameResult = await handleNameCollection(
      supabase, session as WhatsAppSession, phone, conversationId!, String(message),
      normalizedMessage, isNewSession, personaName, env
    );
    if (nameResult) {
      logAgentDecision(supabase, {
        trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
        from_agent: 'orchestrator', to_agent: 'orchestrator',
        reason: 'name_collection', intent: 'greeting',
      });
      return nameResult;
    }
  } catch (nameError) {
    console.error(`❌ NameCollection error for ${phone}:`, nameError);
    // Non-fatal: continue to next agent
  }

  // === FAST PATH: Room photo / brochure requests ===
  // "ada foto kamar?", "minta brosur", "ada gambar kamarnya?" → route to FAQ agent (handles brochure PDF)
  if (isRoomPhotoRequest(normalizedMessage)) {
    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
      from_agent: 'orchestrator', to_agent: 'faq',
      reason: 'room_photo_request_fastpath', intent: 'room_photo_request',
    });
    return handleGuestFAQ(
      supabase, session as WhatsAppSession, phone, String(message),
      conversationId!, personaName, env, trace,
    );
  }

  // === FAST PATH: Generic price-list questions ===
  // "berapa harga kamar / rate semalam" → langsung kirim daftar harga
  // tanpa perlu tanya tipe kamar atau panggil tool.
  if (isGenericPriceQuestion(normalizedMessage)) {
    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
      from_agent: 'orchestrator', to_agent: 'price_list',
      reason: 'generic_price_question_fastpath', intent: 'price_inquiry',
    });
    return handlePriceListQuestion(
      supabase, session as WhatsAppSession, phone, String(message),
      conversationId!, personaName, env, trace,
    );
  }

  // === INTENT DETECTION: Route to appropriate agent (3 intents: faq, booking, complaint) ===
  const intent = detectIntent(normalizedMessage);

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

/**
 * Name collection (merged from former Intent Agent).
 * Handles greeting + name capture for new/stale sessions.
 * Returns Response if fully handled, null to continue to AI agents.
 */
async function handleNameCollection(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  conversationId: string,
  rawMessage: string,
  normalizedMessage: string,
  isNewSession: boolean,
  personaName: string,
  env: EnvConfig,
): Promise<Response | null> {
  // New session flow
  if (isNewSession) {
    console.log(`🆕 New session for ${phone}`);
    const questionPatterns = /[?？]|berapa|harga|kamar|booking|check.?in|check.?out|tersedia|available|promo|fasilitas|alamat|lokasi|wifi|bayar|transfer|cancel|batal|kapan|bagaimana|gimana|apakah|bisa.{1,20}(kamar|booking|pesan|check)|ada.{1,20}(kamar|promo|diskon)|mau.{1,20}(pesan|booking|menginap|nginap)|ingin|cari|pesan\s+kamar|sewa|tarif|biaya|diskon|info\s+(kamar|harga|booking)|informasi/i;
    const isQuestion = questionPatterns.test(normalizedMessage);

    if (isQuestion) {
      console.log(`⏭️ First message is a question - bypassing name prompt`);
      const genericName = `Tamu WA ${phone.slice(-4)}`;
      await supabase.from('whatsapp_sessions').upsert({
        phone_number: phone, conversation_id: conversationId,
        last_message_at: new Date().toISOString(), is_active: true,
        session_type: 'guest', awaiting_name: false, guest_name: genericName,
      }, { onConflict: 'phone_number' });

      if (conversationId) {
        await supabase.from('chat_conversations').update({ guest_email: `${genericName} (WA: ${phone})` }).eq('id', conversationId);
      }
      return null; // Fall through to AI
    }

    // Ask for name
    await supabase.from('whatsapp_sessions').upsert({
      phone_number: phone, conversation_id: conversationId,
      last_message_at: new Date().toISOString(), is_active: true,
      session_type: 'guest', awaiting_name: true, guest_name: null,
    }, { onConflict: 'phone_number' });

    await logMessage(supabase, conversationId, 'user', normalizedMessage);
    const greetingMsg = `Halo! 👋 Saya ${personaName} dari Pomah Guesthouse. Boleh saya tahu nama Anda?`;
    await logMessage(supabase, conversationId, 'assistant', greetingMsg);
    await sendWhatsApp(phone, greetingMsg, env.fonnteApiKey);

    return new Response(JSON.stringify({ status: "awaiting_name", conversation_id: conversationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Awaiting name flow
  if (session?.awaiting_name) {
    console.log(`📝 Awaiting name for ${phone}: "${rawMessage}"`);
    const guestNameCandidate = rawMessage.trim();

    if (!isLikelyPersonName(guestNameCandidate)) {
      console.log(`⏭️ Not a valid name - bypassing`);
      const genericName = `Tamu WA ${phone.slice(-4)}`;
      await supabase.from('whatsapp_sessions').update({
        guest_name: genericName, awaiting_name: false, last_message_at: new Date().toISOString(),
      }).eq('phone_number', phone);

      if (conversationId) {
        await supabase.from('chat_conversations').update({ guest_email: `${genericName} (WA: ${phone})` }).eq('id', conversationId);
      }
      return null; // Fall through to AI
    }

    // Valid name
    await supabase.from('whatsapp_sessions').update({
      guest_name: guestNameCandidate, awaiting_name: false, last_message_at: new Date().toISOString(),
    }).eq('phone_number', phone);

    if (conversationId) {
      await supabase.from('chat_conversations').update({ guest_email: `${guestNameCandidate} (WA: ${phone})` }).eq('id', conversationId);
    }

    await logMessage(supabase, conversationId, 'user', guestNameCandidate);
    const confirmMsg = `Terima kasih, Kak ${guestNameCandidate}! 😊 Saya ${personaName} dari Pomah Guesthouse. Ada yang bisa saya bantu hari ini?`;
    await logMessage(supabase, conversationId, 'assistant', confirmMsg);
    await sendWhatsApp(phone, confirmMsg, env.fonnteApiKey);

    return new Response(JSON.stringify({ status: "name_captured", guest_name: guestNameCandidate, conversation_id: conversationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return null;
}
