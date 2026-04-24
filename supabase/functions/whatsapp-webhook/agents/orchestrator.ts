import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { normalizePhone, isValidPhone } from '../utils/phone.ts';
import { normalizeIndonesianMessage } from '../utils/slang.ts';
import { isLikelyPersonName } from '../utils/format.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';
import { checkRateLimit } from '../middleware/rateLimiter.ts';
import { getCachedHotelSettings, ensureConversation, updateSession, hasRecentOrActiveBooking } from '../services/session.ts';
import { logMessage, getConversationHistory } from '../services/conversation.ts';
import { sendWhatsApp } from '../services/fonnte.ts';
import { handlePriceApproval } from './pricing.ts';
import { handleManagerChat } from './manager.ts';
import { handleGuestBookingFlow } from './booking.ts';
import { handleGuestFAQ } from './faq.ts';
import { handleComplaint } from './complaint.ts';
import { handlePaymentProof, extractImageUrl } from './paymentProof.ts';
import { handlePaymentApproval, isPaymentApprovalReply } from './paymentApproval.ts';
import { handlePriceListQuestion } from './priceList.ts';
import { setAgentConfigs, type AgentConfigRecord, type EscalationRule } from '../../_shared/agentConfigCache.ts';
import { classifyIntent } from './intentClassifier.ts';
import { decide } from './decisionEngine.ts';

/**
 * Orchestrator (v2) — AI-based decision engine.
 * 
 * Flow:
 *  1. Auth/parse/rate-limit/blocked checks
 *  2. Load settings + session + agent configs (parallel)
 *  3. Pre-routing handlers (run BEFORE intent classification):
 *     a. Image attachments → payment proof
 *     b. Manager replies (YA/TIDAK, APPROVE/REJECT, manager chat)
 *     c. Takeover mode (skip AI)
 *     d. Session creation + name collection
 *  4. AI Intent Classification (hybrid: keyword → LLM with memory)
 *  5. Decision Engine (rule-based intent → agent mapping)
 *  6. Dispatch to selected agent (tools used inside each agent)
 *  7. Error → human staff escalation
 */

/**
 * Singleton Supabase client untuk orchestrator.
 * 
 * Sebelumnya `createClient` dipanggil pada SETIAP request webhook, padahal
 * konfigurasinya identik (URL + service-role key dari EnvConfig). Membuat
 * client baru tiap request → overhead alokasi + GC + kehilangan keepalive
 * connection pool internal supabase-js. Cache di scope modul agar dipakai
 * ulang antar invocation pada worker yang sama.
 * 
 * Catatan: cache key dibandingkan dengan supabaseUrl agar aman jika EnvConfig
 * berubah (mis. saat dipakai di test/staging berbeda di proses yang sama).
 */
let cachedSupabase: SupabaseClient | null = null;
let cachedSupabaseUrl: string | null = null;

function getSupabaseClient(env: EnvConfig): SupabaseClient {
  if (cachedSupabase && cachedSupabaseUrl === env.supabaseUrl) {
    return cachedSupabase;
  }
  cachedSupabase = createClient(env.supabaseUrl, env.supabaseServiceKey) as SupabaseClient;
  cachedSupabaseUrl = env.supabaseUrl;
  return cachedSupabase;
}

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
    const notif = `🔴 *ERROR AGENT*\n\n📱 Tamu: ${phone}\n❌ Error: ${errorMessage.substring(0, 200)}\n⏰ ${now}\n\n_Sistem gagal memproses pesan tamu. Mohon ditindaklanjuti manual._`;
    await Promise.allSettled(targets.map(m => sendWhatsApp(m.phone, notif, fonnteApiKey)));
  } catch (err) {
    console.error('Failed to escalate to human staff:', err);
  }
}

export async function orchestrate(
  req: Request,
  env: EnvConfig,
  trace?: TraceContext,
): Promise<Response> {
  const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey);

  // ── 1. PARSE BODY ──
  const body = await parseRequestBody(req);
  if (!body) {
    return new Response(JSON.stringify({ status: 'error', reason: 'invalid body format' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { sender, message } = body;
  const hasImageAttachment = !!extractImageUrl(body);
  if (!sender || (!message && !hasImageAttachment)) {
    return new Response(JSON.stringify({ status: 'skipped', reason: 'no sender or message' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const phone = normalizePhone(String(sender));
  if (!isValidPhone(phone)) {
    return new Response(JSON.stringify({ status: 'error', reason: 'invalid_phone_format' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const rawMessage = String(message ?? '');
  const normalizedMessage = normalizeIndonesianMessage(rawMessage);
  trace?.info('Processing message', { phone, message_length: rawMessage.length, has_image: hasImageAttachment });

  // ── 2. RATE LIMIT ──
  if (!await checkRateLimit(supabase, phone)) {
    logAgentDecision(supabase, { trace_id: trace?.traceId, phone_number: phone, from_agent: 'orchestrator', reason: 'rate_limited' });
    return new Response(JSON.stringify({ status: 'rate_limited' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── 3. LOAD CONTEXT (parallel) ──
  const [hotelSettings, { data: chatbotSettingsRow }, { data: session }, { data: agentConfigs }, { data: escalationRules }] = await Promise.all([
    getCachedHotelSettings(supabase),
    supabase.from('chatbot_settings').select('persona_name, greeting_message').single(),
    supabase.from('whatsapp_sessions').select('*').eq('phone_number', phone).single(),
    supabase.from('agent_configs').select('agent_id, is_active, system_prompt, temperature, escalation_target, auto_escalate'),
    supabase.from('escalation_rules').select('from_agent, to_agent, condition_text, priority, is_active').eq('is_active', true).order('priority', { ascending: true }),
  ]);

  setAgentConfigs(
    (agentConfigs || []) as AgentConfigRecord[],
    (escalationRules || []) as EscalationRule[],
  );

  const personaName = chatbotSettingsRow?.persona_name || 'Rani';
  const sessionTimeoutMinutes = hotelSettings?.whatsapp_session_timeout_minutes || 15;
  const aiWhitelist: string[] = hotelSettings?.whatsapp_ai_whitelist || [];
  const responseMode = hotelSettings?.whatsapp_response_mode || 'ai';
  const managerNumbers: ManagerInfo[] = hotelSettings?.whatsapp_manager_numbers || [];
  const memoryRetentionDays = hotelSettings?.whatsapp_memory_retention_days ?? 2;
  const historyWindowMessages = hotelSettings?.whatsapp_history_window_messages ?? 40;

  // ── 4. PRE-ROUTING GUARDS ──
  if ((session as WhatsAppSession)?.is_blocked) {
    return new Response(JSON.stringify({ status: 'blocked' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // MANUAL mode → log + takeover
  if (responseMode === 'manual') {
    const convId = await ensureConversation(supabase, session, phone);
    await logMessage(supabase, convId, 'user', rawMessage);
    await updateSession(supabase, phone, convId, true);
    return new Response(JSON.stringify({ status: 'manual_mode', conversation_id: convId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Whitelist auto-takeover
  if (aiWhitelist.includes(phone)) {
    const convId = await ensureConversation(supabase, session, phone);
    await logMessage(supabase, convId, 'user', rawMessage);
    await updateSession(supabase, phone, convId, true);
    return new Response(JSON.stringify({ status: 'whitelist_takeover', conversation_id: convId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const isManager = managerNumbers.some(m => m.phone === phone);
  const managerInfo = isManager ? managerNumbers.find(m => m.phone === phone)! : null;

  // ── 5. PRE-ROUTING HANDLERS (must run BEFORE intent classification) ──

  // 5a. IMAGE ATTACHMENT → payment proof OCR
  const imageUrl = extractImageUrl(body);
  if (imageUrl) {
    const convId = await ensureConversation(supabase, session, phone);
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

  // 5b. MANAGER COMMANDS (payment approval YA/TIDAK, price approval APPROVE/REJECT, manager chat)
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
      } catch (err) {
        console.error(`❌ PaymentApproval error for ${phone}:`, err);
        await sendWhatsApp(phone, 'Maaf, terjadi kesalahan saat memproses konfirmasi pembayaran.', env.fonnteApiKey);
        return new Response(JSON.stringify({ status: 'payment_approval_error' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const priceResult = await handlePriceApproval(supabase, normalizedMessage, phone, managerInfo, env);
    if (priceResult) {
      logAgentDecision(supabase, {
        trace_id: trace?.traceId, phone_number: phone,
        from_agent: 'orchestrator', to_agent: 'pricing',
        reason: 'manager_price_approval', intent: 'price_approval',
      });
      return priceResult;
    }

    // Default: manager chat
    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone,
      from_agent: 'orchestrator', to_agent: 'manager',
      reason: 'manager_chat', intent: 'manager_command',
    });
    return handleManagerChat(supabase, session, phone, normalizedMessage, managerInfo, env);
  }

  // 5c. TAKEOVER MODE → skip AI
  if ((session as WhatsAppSession)?.is_takeover) {
    const convId = await ensureConversation(supabase, session, phone);
    await logMessage(supabase, convId, 'user', rawMessage);
    console.log(`⛔ Takeover active for ${phone} - AI skipped`);
    await supabase.from('whatsapp_sessions').update({ last_message_at: new Date().toISOString() }).eq('phone_number', phone);
    return new Response(JSON.stringify({ status: 'takeover_mode', conversation_id: convId, reason: 'manual_takeover_active' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 5d. SESSION MANAGEMENT
  const SESSION_TIMEOUT = sessionTimeoutMinutes * 60 * 1000;
  const lastMessageAt = (session as WhatsAppSession)?.last_message_at ? new Date((session as WhatsAppSession).last_message_at!).getTime() : 0;
  const idleMs = Date.now() - lastMessageAt;
  const isStaleByTimeout = idleMs > SESSION_TIMEOUT;
  let conversationId = (session as WhatsAppSession)?.conversation_id;

  // Memory persistence rule: jika tamu punya booking aktif atau baru check-out
  // (≤ H+2), JANGAN reset percakapan walau idle melewati timeout. Chatbot harus
  // tetap mengingat konteks booking sampai 2 hari setelah check-out.
  let preserveMemory = false;
  if (isStaleByTimeout && conversationId) {
    preserveMemory = await hasRecentOrActiveBooking(supabase, phone, memoryRetentionDays).catch(() => false);
    if (preserveMemory) {
      console.log(`🧠 Preserving memory for ${phone} — guest has active/recent booking (≤ H+${memoryRetentionDays} checkout)`);
    }
  }

  const isNewSession = !conversationId || (isStaleByTimeout && !preserveMemory);

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

  // ── 5d.1 AUDIT MEMORY DECISION ──
  // Catat alasan kenapa chatbot mempertahankan atau mereset memory ke chat_messages
  // sebagai system message agar admin bisa audit langsung dari log percakapan.
  try {
    const idleMin = Math.round(idleMs / 60000);
    let memoryDecision: string;
    let memoryEmoji: string;
    if (!session) {
      memoryDecision = `first_contact | conversation baru dibuat (belum ada session sebelumnya)`;
      memoryEmoji = '🆕';
    } else if (!isStaleByTimeout) {
      memoryDecision = `keep_active | masih aktif (idle ${idleMin} mnt ≤ timeout ${sessionTimeoutMinutes} mnt) — memory dipertahankan`;
      memoryEmoji = '✅';
    } else if (preserveMemory) {
      memoryDecision = `preserve_h${memoryRetentionDays}_rule | idle ${idleMin} mnt > timeout ${sessionTimeoutMinutes} mnt, TAPI tamu punya booking aktif/recent (≤ H+${memoryRetentionDays} checkout) — memory dipertahankan`;
      memoryEmoji = '🧠';
    } else {
      memoryDecision = `reset_by_timeout | idle ${idleMin} mnt > timeout ${sessionTimeoutMinutes} mnt, tidak ada booking ≤ H+${memoryRetentionDays} — conversation baru dibuat`;
      memoryEmoji = '🔄';
    }
    await logMessage(
      supabase,
      conversationId!,
      'system',
      `${memoryEmoji} [MEMORY AUDIT] ${memoryDecision}`,
    );
  } catch (auditErr) {
    console.warn('[orchestrator] memory audit log failed:', auditErr);
  }

  // 5e. NAME COLLECTION
  try {
    const nameResult = await handleNameCollection(
      supabase, session as WhatsAppSession, phone, conversationId!, rawMessage,
      normalizedMessage, isNewSession, personaName, env,
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
  }

  // ── 6. AI INTENT CLASSIFICATION (memory-aware hybrid) ──
  const recentMessages = await getConversationHistory(supabase, conversationId!, historyWindowMessages).catch(() => []);
  const classification = await classifyIntent(normalizedMessage, {
    recentMessages: recentMessages.slice(-6),
    awaitingName: false, // already handled above
  });
  console.log(`🧠 Intent: ${classification.intent} (${classification.source}, conf=${classification.confidence.toFixed(2)})`);

  // ── 7. DECISION ENGINE → AGENT ──
  const decision = decide(classification.intent);
  console.log(`🎯 Route: ${classification.intent} → ${decision.agent} (${decision.reason})`);

  logAgentDecision(supabase, {
    trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
    from_agent: 'orchestrator', to_agent: decision.agent,
    reason: `${classification.source}:${decision.reason}`,
    intent: classification.intent,
    confidence: classification.confidence,
    metadata: { fallback_used: decision.fallbackUsed },
  });

  // ── 8. DISPATCH ──
  try {
    switch (decision.agent) {
      case 'price_list':
        return await handlePriceListQuestion(
          supabase, session as WhatsAppSession, phone, rawMessage,
          conversationId!, personaName, env, trace,
        );

      case 'room_brochure':
        // FAQ agent handles room photo/brochure flow
        return await handleGuestFAQ(
          supabase, session as WhatsAppSession, phone, rawMessage,
          conversationId!, personaName, env, trace,
        );

      case 'complaint':
        return await handleComplaint(
          supabase, session as WhatsAppSession, phone, normalizedMessage,
          conversationId!, personaName, managerNumbers, env, trace,
        );

      case 'name_collection':
        return await handleGuestFAQ(
          supabase, session as WhatsAppSession, phone, normalizedMessage,
          conversationId!, personaName, env, trace,
        );

      case 'faq': {
        const faqResult = await handleGuestFAQ(
          supabase, session as WhatsAppSession, phone, normalizedMessage,
          conversationId!, personaName, env, trace,
        );
        const faqBody = await faqResult.clone().json().catch(() => null);
        if (faqBody?.status === 'faq_escalate_to_booking') {
          console.log(`🔀 FAQ → Booking escalation`);
          logAgentDecision(supabase, {
            trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
            from_agent: 'faq', to_agent: 'booking',
            reason: 'faq_needs_tools', intent: 'booking',
          });
          return await handleGuestBookingFlow(
            supabase, session as WhatsAppSession, phone, normalizedMessage, conversationId!,
            personaName, managerNumbers, env, trace,
          );
        }
        return faqResult;
      }

      case 'booking':
      case 'payment':
      default:
        return await handleGuestBookingFlow(
          supabase, session as WhatsAppSession, phone, normalizedMessage, conversationId!,
          personaName, managerNumbers, env, trace,
          recentMessages, historyWindowMessages,
        );
    }
  } catch (agentError) {
    const errorMsg = (agentError as Error).message || 'Unknown agent error';
    console.error(`❌ Agent error for ${phone}:`, errorMsg);
    await logMessage(supabase, conversationId!, 'system', `[Error] Agent ${decision.agent} failed: ${errorMsg}`);
    await escalateToHumanStaff(supabase, phone, conversationId!, errorMsg, managerNumbers, env.fonnteApiKey);
    const apologyMsg = 'Maaf, ada kendala dalam memproses pesan Anda. Tim kami akan segera menghubungi Anda. 🙏';
    await sendWhatsApp(phone, apologyMsg, env.fonnteApiKey);
    await logMessage(supabase, conversationId!, 'assistant', apologyMsg);
    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone, conversation_id: conversationId,
      from_agent: decision.agent, to_agent: 'human_staff',
      reason: 'agent_error', intent: 'error_escalation',
    });
    return new Response(JSON.stringify({ status: 'error_escalated', conversation_id: conversationId, error: errorMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ────────────────────────────────────────────────────────────────────────────
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
    console.error('Body parse error');
    return null;
  }
}

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
      return null;
    }

    await supabase.from('whatsapp_sessions').upsert({
      phone_number: phone, conversation_id: conversationId,
      last_message_at: new Date().toISOString(), is_active: true,
      session_type: 'guest', awaiting_name: true, guest_name: null,
    }, { onConflict: 'phone_number' });

    await logMessage(supabase, conversationId, 'user', normalizedMessage);
    const greetingMsg = `Halo! 👋 Saya ${personaName} dari Pomah Guesthouse. Boleh saya tahu nama Anda?`;
    await logMessage(supabase, conversationId, 'assistant', greetingMsg);
    await sendWhatsApp(phone, greetingMsg, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: 'awaiting_name', conversation_id: conversationId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (session?.awaiting_name) {
    console.log(`📝 Awaiting name for ${phone}: "${rawMessage}"`);
    const guestNameCandidate = rawMessage.trim();

    if (!isLikelyPersonName(guestNameCandidate)) {
      const genericName = `Tamu WA ${phone.slice(-4)}`;
      await supabase.from('whatsapp_sessions').update({
        guest_name: genericName, awaiting_name: false, last_message_at: new Date().toISOString(),
      }).eq('phone_number', phone);
      if (conversationId) {
        await supabase.from('chat_conversations').update({ guest_email: `${genericName} (WA: ${phone})` }).eq('id', conversationId);
      }
      return null;
    }

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
    return new Response(JSON.stringify({ status: 'name_captured', guest_name: guestNameCandidate, conversation_id: conversationId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return null;
}
