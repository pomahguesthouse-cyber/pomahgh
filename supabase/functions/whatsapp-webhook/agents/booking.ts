import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from "../types.ts";
import { corsHeaders } from "../types.ts";
import { normalizePhone, isValidPhone } from "../utils/phone.ts";
import { normalizeIndonesianMessage } from "../utils/slang.ts";
import { isLikelyPersonName, extractPushname } from "../utils/format.ts";
import type { TraceContext } from "../../_shared/traceContext.ts";
import { logAgentDecision } from "../../_shared/agentLogger.ts";
import { checkRateLimit } from "../middleware/rateLimiter.ts";
import { checkDuplicate, extractMessageId } from "../middleware/dedup.ts";
import {
  getCachedHotelSettings,
  ensureConversation,
  updateSession,
  hasRecentOrActiveBooking,
  isPastLastCheckout,
} from "../services/session.ts";
import { logMessage, getConversationHistory } from "../services/conversation.ts";
import { sendWhatsApp } from "../services/fonnte.ts";
import { handlePriceApproval } from "./pricing.ts";
import { handleManagerChat } from "./manager.ts";
import { handleGuestBookingFlow } from "./booking.ts";
import { handleGuestFAQ } from "./faq.ts";
import { handleComplaint } from "./complaint.ts";
import { handlePaymentProof, extractImageUrl } from "./paymentProof.ts";
import { handlePaymentApproval, isPaymentApprovalReply } from "./paymentApproval.ts";
import { handlePriceListQuestion } from "./priceList.ts";
import { handleFullHouseQuestion, isFullHouseQuestion } from "./fullHouse.ts";
import { setAgentConfigs, type AgentConfigRecord, type EscalationRule } from "../../_shared/agentConfigCache.ts";
import { classifyIntent } from "./intentClassifier.ts";
import { decide } from "./decisionEngine.ts";
import { transitionState, getState } from "../state/conversationState.ts";

/**
 * Orchestrator (v2) — AI-based decision engine.
 *
 * Flow:
 *  1. Auth/parse/rate-limit/blocked checks
 *  2. Load settings + session + agent configs (parallel, cached)
 *  3. Pre-routing handlers (run BEFORE intent classification):
 *     5.1. Takeover for non-manager guests
 *     5.2. Image attachments → payment proof
 *     5.3. Manager replies (YA/TIDAK, APPROVE/REJECT, manager chat)
 *     5.4. Session management (memory rules)
 *     5.5. Memory audit log (fire-and-forget)
 *     5.6. Human handover detection
 *     5.7. Name collection (pushname bypass / greeting bypass)
 *  4. AI Intent Classification (hybrid: keyword → LLM with memory)
 *  5. Decision Engine (rule-based intent → agent mapping)
 *  6. Dispatch to selected agent (tools used inside each agent)
 *  7. Error → human staff escalation
 */

// ────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL CACHES & PATTERNS
// ────────────────────────────────────────────────────────────────────────────

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

/**
 * TTL cache untuk agent_configs + escalation_rules.
 *
 * Data ini jarang berubah (admin edit via Prompt Studio mungkin <1x/hari),
 * tapi sebelumnya di-fetch SETIAP request → 2 round-trip DB ~50-100ms.
 * Dengan TTL 60s, hemat ~30-80ms per request setelah cache warm.
 *
 * Setelah admin save di Prompt Studio, panggil invalidateAgentConfigCache()
 * dari endpoint API yang handle save agar perubahan langsung terlihat tanpa
 * menunggu TTL expire.
 */
type CachedAgentConfigPayload = {
  configs: AgentConfigRecord[];
  rules: EscalationRule[];
  expiresAt: number;
};

let cachedAgentConfigPayload: CachedAgentConfigPayload | null = null;
const AGENT_CONFIG_TTL_MS = 60_000;

async function getAgentConfigsAndRules(supabase: SupabaseClient): Promise<CachedAgentConfigPayload> {
  const now = Date.now();
  if (cachedAgentConfigPayload && cachedAgentConfigPayload.expiresAt > now) {
    return cachedAgentConfigPayload;
  }

  const [{ data: configs }, { data: rules }] = await Promise.all([
    supabase
      .from("agent_configs")
      .select("agent_id, is_active, custom_instructions, temperature, escalation_target, auto_escalate"),
    supabase
      .from("escalation_rules")
      .select("from_agent, to_agent, condition_text, priority, is_active")
      .eq("is_active", true)
      .order("priority", { ascending: true }),
  ]);

  cachedAgentConfigPayload = {
    configs: (configs || []) as AgentConfigRecord[],
    rules: (rules || []) as EscalationRule[],
    expiresAt: now + AGENT_CONFIG_TTL_MS,
  };
  return cachedAgentConfigPayload;
}

/** Force invalidation untuk dipanggil dari admin endpoint setelah edit agent_configs / escalation_rules. */
export function invalidateAgentConfigCache(): void {
  cachedAgentConfigPayload = null;
}

/** Greeting-bypass intent buckets — hoisted dari handleNameCollection untuk hindari re-compile per request. */
const INTENT_PATTERNS: Record<string, RegExp> = {
  price:
    /berapa|brp|harga|tarif|biaya|sewa|diskon|promo|pricelist|price\s*list|daftar\s*harga|tarif\s*kamar|list\s*harga|rate\s*kamar/i,
  full_house:
    /full\s*house|sewa\s*(satu|1|seluruh|semua)?\s*(rumah|guesthouse|villa)|seluruh\s*kamar|borong\s*(rumah|guesthouse)/i,
  availability: /tersedia|kosong|available|ready|hari\s+ini|malam\s+ini|besok|bsk|lusa|weekend|minggu\s+depan/i,
  brochure: /foto|gambar|brosur|katalog|preview/i,
  booking:
    /booking|reservas|pesan|menginap|nginap|stay|check.?in|check.?out|extend|mau.{1,20}(pesan|booking|menginap|nginap)/i,
  room: /kamar|kmr|tipe|model|\d+\s*(orang|tamu|malam|hari|kamar)/i,
  facility: /fasilitas|wifi|sarapan|breakfast|parkir|kolam|pool/i,
  location: /alamat|lokasi|maps|arah/i,
  payment: /bayar|transfer|rekening|payment|cancel|batal|refund/i,
  generic_question: /[?？]|kapan|bagaimana|gimana|apakah|ingin|cari|info(?:rmasi)?|nanya|tanya|cek/i,
};

/** Pattern eksplisit untuk handover ke admin manusia. Dijaga ketat agar tidak false-positive. */
const HUMAN_HANDOVER_PATTERNS: RegExp[] = [
  /admin\s*(yang\s*)?(asli|manusia|beneran|sungguhan)/i,
  /(bukan|stop|matikan|jangan)\s*(bot|chatbot|ai)/i,
  /(masih|ini)\s*bot/i,
  /tolong\s*(panggil|hubungi)\s*admin/i,
  /chat\s*(sama|ke)\s*admin\s*(asli|manusia)/i,
  /bicara\s*(sama|ke|dengan)\s*(admin|manusia)/i,
];

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

async function escalateToHumanStaff(
  supabase: SupabaseClient,
  phone: string,
  conversationId: string,
  errorMessage: string,
  managerNumbers: ManagerInfo[],
  fonnteApiKey: string,
): Promise<void> {
  try {
    const superAdmins = managerNumbers.filter((m) => m.role === "super_admin" || m.role === "admin");
    const targets = superAdmins.length > 0 ? superAdmins : managerNumbers;
    const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const notif = `🔴 *ERROR AGENT*\n\n📱 Tamu: ${phone}\n❌ Error: ${errorMessage.substring(0, 200)}\n⏰ ${now}\n\n_Sistem gagal memproses pesan tamu. Mohon ditindaklanjuti manual._`;
    await Promise.allSettled(targets.map((m) => sendWhatsApp(m.phone, notif, fonnteApiKey)));
  } catch (err) {
    console.error("Failed to escalate to human staff:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ORCHESTRATE
// ────────────────────────────────────────────────────────────────────────────

export async function orchestrate(req: Request, env: EnvConfig, trace?: TraceContext): Promise<Response> {
  const supabase = getSupabaseClient(env);

  // ── 1. PARSE BODY ──
  const body = await parseRequestBody(req);
  if (!body) {
    return new Response(JSON.stringify({ status: "error", reason: "invalid body format" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { sender, message } = body;

  // Extract image URL ONCE; reuse di stage 5.1 dan 5.2 (sebelumnya dipanggil 3x).
  const imageUrl = extractImageUrl(body);
  const hasImageAttachment = !!imageUrl;

  if (!sender || (!message && !hasImageAttachment)) {
    return new Response(JSON.stringify({ status: "skipped", reason: "no sender or message" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const phone = normalizePhone(String(sender));
  if (!isValidPhone(phone)) {
    return new Response(JSON.stringify({ status: "error", reason: "invalid_phone_format" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const rawMessage = String(message ?? "");
  const normalizedMessage = normalizeIndonesianMessage(rawMessage);
  trace?.info("Processing message", { phone, message_length: rawMessage.length, has_image: hasImageAttachment });

  // Pushname dari Fonnte — dipakai untuk skip prompt nama.
  // Normalisasi konsisten via helper (handle name/pushname/notify/notifyName,
  // string kosong, NBSP, whitespace berlebih, number, null).
  const pushname = extractPushname(body);

  // ── 1b. WEBHOOK DEDUP / IDENTICAL-TEXT THROTTLE ──
  // Stops Fonnte retry storms (same message_id ~every 60s) and auto-sender
  // spam (same text from guest within 90s). Image messages bypass this so
  // payment proof attachments are never dropped.
  if (!hasImageAttachment) {
    const messageId = extractMessageId(body);
    const dup = await checkDuplicate(supabase, { phone, messageId, normalizedText: normalizedMessage });
    if (dup.skip) {
      trace?.info("Duplicate message skipped", { phone, reason: dup.reason, message_id: messageId });
      logAgentDecision(supabase, {
        trace_id: trace?.traceId,
        phone_number: phone,
        from_agent: "orchestrator",
        reason: dup.reason,
      });
      return new Response(JSON.stringify({ status: "skipped", reason: dup.reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ── 2. RATE LIMIT ──
  if (!(await checkRateLimit(supabase, phone))) {
    logAgentDecision(supabase, {
      trace_id: trace?.traceId,
      phone_number: phone,
      from_agent: "orchestrator",
      reason: "rate_limited",
    });
    return new Response(JSON.stringify({ status: "rate_limited" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 3. LOAD CONTEXT (parallel + cached) ──
  // Hanya ambil kolom yang benar-benar dipakai downstream (sesuai interface
  // WhatsAppSession). Tambah ORDER BY last_message_at DESC + LIMIT 1 agar
  // memanfaatkan composite index `idx_whatsapp_sessions_phone_last_message`
  // dan defensive jika ada baris duplikat per phone_number.
  //
  // agent_configs + escalation_rules di-cache 60s (jarang berubah; admin
  // wajib panggil invalidateAgentConfigCache() setelah edit di Prompt Studio).
  const SESSION_COLUMNS =
    "phone_number, conversation_id, last_message_at, is_active, is_blocked, " +
    "is_takeover, takeover_at, session_type, awaiting_name, guest_name, " +
    "pending_messages, pending_since, conversation_state";

  const [hotelSettings, { data: chatbotSettingsRow }, { data: sessionRaw }, agentConfigPayload] = await Promise.all([
    getCachedHotelSettings(supabase),
    supabase.from("chatbot_settings").select("persona_name, greeting_message").single(),
    supabase
      .from("whatsapp_sessions")
      .select(SESSION_COLUMNS)
      .eq("phone_number", phone)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getAgentConfigsAndRules(supabase),
  ]);

  const session = sessionRaw as unknown as WhatsAppSession | null;

  // SIDE EFFECT: setAgentConfigs() menulis ke module-level cache di agentConfigCache.ts
  // yang dibaca oleh handler agent (booking.ts, faq.ts, dll) saat resolve
  // custom_instructions per agent_id. WAJIB dipanggil SEBELUM dispatch ke agent.
  setAgentConfigs(agentConfigPayload.configs, agentConfigPayload.rules);

  const personaName = chatbotSettingsRow?.persona_name || "Rani";
  const sessionTimeoutMinutes = hotelSettings?.whatsapp_session_timeout_minutes || 15;
  const aiWhitelist: string[] = hotelSettings?.whatsapp_ai_whitelist || [];
  const responseMode = hotelSettings?.whatsapp_response_mode || "ai";
  const managerNumbers: ManagerInfo[] = hotelSettings?.whatsapp_manager_numbers || [];
  const memoryRetentionDays = hotelSettings?.whatsapp_memory_retention_days ?? 2;
  const historyWindowMessages = hotelSettings?.whatsapp_history_window_messages ?? 40;

  // Compute session state ONCE; reuse di semua transitionState calls.
  const currentState = getState(session);

  // ── 4. PRE-ROUTING GUARDS ──
  if (session?.is_blocked) {
    return new Response(JSON.stringify({ status: "blocked" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // MANUAL mode → log + takeover
  if (responseMode === "manual") {
    const convId = await ensureConversation(supabase, session, phone);
    await logMessage(supabase, convId, "user", rawMessage);
    await updateSession(supabase, phone, convId, true);
    await transitionState(supabase, {
      phone,
      conversationId: convId,
      from: currentState,
      to: "takeover",
      reason: "response_mode_manual",
    });
    return new Response(JSON.stringify({ status: "manual_mode", conversation_id: convId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Whitelist auto-takeover
  if (aiWhitelist.includes(phone)) {
    const convId = await ensureConversation(supabase, session, phone);
    await logMessage(supabase, convId, "user", rawMessage);
    await updateSession(supabase, phone, convId, true);
    await transitionState(supabase, {
      phone,
      conversationId: convId,
      from: currentState,
      to: "takeover",
      reason: "whitelist_takeover",
    });
    return new Response(JSON.stringify({ status: "whitelist_takeover", conversation_id: convId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isManager = managerNumbers.some((m) => m.phone === phone);
  const managerInfo = isManager ? managerNumbers.find((m) => m.phone === phone)! : null;

  // ── 5. PRE-ROUTING HANDLERS (must run BEFORE intent classification) ──
  // Order matters: takeover → image → manager → session mgmt → audit log → handover → name

  // 5.1. TAKEOVER MODE → skip AI for non-manager guests (covers text + image + any input)
  // Manager commands (5.3) are still processed below because managers are not subject to takeover.
  if (!isManager && session?.is_takeover) {
    const convId = await ensureConversation(supabase, session, phone);
    const logged = imageUrl ? `[Image attached] ${imageUrl}` : rawMessage;
    await logMessage(supabase, convId, "user", logged);
    console.log(`⛔ Takeover active for ${phone} - AI skipped (pre-routing)`);
    await supabase
      .from("whatsapp_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("phone_number", phone);
    if (currentState !== "takeover") {
      await transitionState(supabase, {
        phone,
        conversationId: convId,
        from: currentState,
        to: "takeover",
        reason: "takeover_active",
      });
    }
    return new Response(
      JSON.stringify({ status: "takeover_mode", conversation_id: convId, reason: "manual_takeover_active" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 5.2. IMAGE ATTACHMENT → payment proof OCR
  if (imageUrl) {
    const convId = await ensureConversation(supabase, session, phone);
    const caption = typeof message === "string" ? message : null;
    try {
      return await handlePaymentProof(supabase, phone, imageUrl, convId, managerNumbers, env, trace, {
        submittedByManager: isManager ? managerInfo : null,
        caption,
      });
    } catch (proofError) {
      console.error(`❌ PaymentProof error for ${phone}:`, proofError);
      await sendWhatsApp(
        phone,
        "Maaf, terjadi kendala saat memproses gambar Anda. Silakan coba kirim ulang. 🙏",
        env.fonnteApiKey,
      );
      return new Response(JSON.stringify({ status: "payment_proof_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // 5.3. MANAGER COMMANDS (payment approval YA/TIDAK, price approval APPROVE/REJECT, manager chat)
  if (isManager && managerInfo) {
    const approvalDecision = isPaymentApprovalReply(normalizedMessage);
    if (approvalDecision) {
      logAgentDecision(supabase, {
        trace_id: trace?.traceId,
        phone_number: phone,
        from_agent: "orchestrator",
        to_agent: "payment_approval",
        reason: "manager_yes_no_reply",
        intent: approvalDecision,
      });
      try {
        return await handlePaymentApproval(supabase, phone, approvalDecision, managerInfo, managerNumbers, env);
      } catch (err) {
        console.error(`❌ PaymentApproval error for ${phone}:`, err);
        await sendWhatsApp(phone, "Maaf, terjadi kesalahan saat memproses konfirmasi pembayaran.", env.fonnteApiKey);
        return new Response(JSON.stringify({ status: "payment_approval_error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const priceResult = await handlePriceApproval(supabase, normalizedMessage, phone, managerInfo, env);
    if (priceResult) {
      logAgentDecision(supabase, {
        trace_id: trace?.traceId,
        phone_number: phone,
        from_agent: "orchestrator",
        to_agent: "pricing",
        reason: "manager_price_approval",
        intent: "price_approval",
      });
      return priceResult;
    }

    // Default: manager chat
    logAgentDecision(supabase, {
      trace_id: trace?.traceId,
      phone_number: phone,
      from_agent: "orchestrator",
      to_agent: "manager",
      reason: "manager_chat",
      intent: "manager_command",
    });
    return handleManagerChat(supabase, session, phone, normalizedMessage, managerInfo, env);
  }

  // NOTE: takeover for non-manager guests handled di stage 5.1 di atas.
  // Managers tidak tunduk pada takeover (selalu masuk ke 5.3 manager handlers).

  // 5.4. SESSION MANAGEMENT (memory rules)
  const SESSION_TIMEOUT = sessionTimeoutMinutes * 60 * 1000;
  const lastMessageAt = (session as WhatsAppSession)?.last_message_at
    ? new Date((session as WhatsAppSession).last_message_at!).getTime()
    : 0;
  const idleMs = Date.now() - lastMessageAt;
  const isStaleByTimeout = idleMs > SESSION_TIMEOUT;
  let conversationId = (session as WhatsAppSession)?.conversation_id;

  // Hard rule: jika tanggal hari ini SUDAH MELEWATI check_out booking terakhir,
  // memory percakapan WAJIB di-reset — chatbot tidak boleh mempertahankan
  // konteks tamu yang sudah selesai menginap.
  let pastCheckout = false;
  if (conversationId) {
    pastCheckout = await isPastLastCheckout(supabase, phone).catch(() => false);
    if (pastCheckout) {
      console.log(`🧹 Resetting memory for ${phone} — today > last booking check_out`);
    }
  }

  // Memory persistence rule: jika tamu punya booking aktif atau baru check-out
  // (≤ H+2), JANGAN reset percakapan walau idle melewati timeout. Chatbot harus
  // tetap mengingat konteks booking sampai 2 hari setelah check-out.
  let preserveMemory = false;
  if (isStaleByTimeout && conversationId && !pastCheckout) {
    preserveMemory = await hasRecentOrActiveBooking(supabase, phone, memoryRetentionDays).catch(() => false);
    if (preserveMemory) {
      console.log(
        `🧠 Preserving memory for ${phone} — guest has active/recent booking (≤ H+${memoryRetentionDays} checkout)`,
      );
    }
  }

  const isNewSession = !conversationId || pastCheckout || (isStaleByTimeout && !preserveMemory);

  if (isNewSession) {
    const { data: newConv, error: convError } = await supabase
      .from("chat_conversations")
      .insert({ session_id: `wa_${phone}_${Date.now()}`, message_count: 0 })
      .select()
      .single();
    if (convError || !newConv?.id) {
      console.error("Failed to create conversation:", convError);
      return new Response(JSON.stringify({ status: "error", reason: "conversation_creation_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    conversationId = newConv.id;
    // Reset state ke idle saat sesi baru dimulai (timeout / past checkout / first contact).
    await transitionState(supabase, {
      phone,
      conversationId,
      from: pastCheckout ? "closed" : currentState,
      to: "idle",
      reason: pastCheckout ? "reset_past_checkout" : session ? "reset_by_timeout" : "first_contact",
    });
  }

  // ── 5.5. AUDIT MEMORY DECISION (fire-and-forget) ──
  // Catat alasan kenapa chatbot mempertahankan atau mereset memory ke chat_messages
  // sebagai system message agar admin bisa audit langsung dari log percakapan.
  // Fire-and-forget: jangan blokir pipeline AI; logging gagal tidak menggagalkan respons.
  {
    const idleMin = Math.round(idleMs / 60000);
    let memoryDecision: string;
    let memoryEmoji: string;
    if (!session) {
      memoryDecision = `first_contact | conversation baru dibuat (belum ada session sebelumnya)`;
      memoryEmoji = "🆕";
    } else if (pastCheckout) {
      memoryDecision = `reset_past_checkout | tanggal hari ini sudah melewati check_out booking terakhir — memory di-reset`;
      memoryEmoji = "🧹";
    } else if (!isStaleByTimeout) {
      memoryDecision = `keep_active | masih aktif (idle ${idleMin} mnt ≤ timeout ${sessionTimeoutMinutes} mnt) — memory dipertahankan`;
      memoryEmoji = "✅";
    } else if (preserveMemory) {
      memoryDecision = `preserve_h${memoryRetentionDays}_rule | idle ${idleMin} mnt > timeout ${sessionTimeoutMinutes} mnt, TAPI tamu punya booking aktif/recent (≤ H+${memoryRetentionDays} checkout) — memory dipertahankan`;
      memoryEmoji = "🧠";
    } else {
      memoryDecision = `reset_by_timeout | idle ${idleMin} mnt > timeout ${sessionTimeoutMinutes} mnt, tidak ada booking ≤ H+${memoryRetentionDays} — conversation baru dibuat`;
      memoryEmoji = "🔄";
    }
    void logMessage(supabase, conversationId!, "system", `${memoryEmoji} [MEMORY AUDIT] ${memoryDecision}`).catch(
      (auditErr) => console.warn("[orchestrator] memory audit log failed:", auditErr),
    );
  }

  // ── 5.6. HUMAN HANDOVER REQUEST DETECTION ──
  // Tamu kadang minta diteruskan ke admin asli. Kalau pesan-nya match pattern
  // ini, set takeover + alert super-admin agar follow-up dilakukan manusia.
  // Pattern dijaga eksplisit (di module scope, lihat HUMAN_HANDOVER_PATTERNS)
  // supaya tidak false-positive untuk kata "admin" di konteks lain.
  const isHandoverRequest = HUMAN_HANDOVER_PATTERNS.some((re) => re.test(normalizedMessage));
  if (isHandoverRequest) {
    console.log(`🆘 Human handover requested by ${phone}`);
    await logMessage(supabase, conversationId!, "user", rawMessage);
    await logMessage(
      supabase,
      conversationId!,
      "system",
      `🆘 [HANDOVER] Tamu meminta admin asli — AI dimatikan, super-admin di-notifikasi`,
  // ── EXTENDED HALLUCINATION GUARDS (price / facility / payment-method) ──
  // Pattern reusable: deteksi user-asks topic + AI claim spesifik + tool tidak dipanggil → retry paksa.
  type GuardSpec = {
    name: string;
    userAsks: RegExp;
    aiClaims: RegExp;
    requiredTools: string[];
    forceMessage: string;
  };
  const extendedGuards: GuardSpec[] = [
    {
      name: 'pricing',
      userAsks: /\b(harga|tarif|rate|berapa|brp|biaya|cost|price)\b/i,
      aiClaims: /\brp\s*\d|\d{2,3}\.?\d{3}|\d+\s*ribu|\d+\s*rb|\d+rb\b/i,
      requiredTools: ['get_all_rooms', 'get_room_details', 'get_full_house_price'],
      forceMessage: 'Kamu menyebut angka harga TANPA memanggil tool get_all_rooms / get_room_details / get_full_house_price. INI DILARANG karena bisa salah harga ke tamu. SEKARANG WAJIB panggil tool yang sesuai. Jangan balas text dulu - LANGSUNG panggil tool!',
    },
    {
      name: 'facility',
      userAsks: /\b(fasilitas|wifi|wi-fi|sarapan|breakfast|kolam|pool|parkir|parking|ac|tv|kulkas|water\s*heater|gym|sauna)\b/i,
      aiClaims: /\b(ada|tersedia|disediakan|include|sudah\s+termasuk|gratis|free|tidak\s+ada|belum\s+ada)\b/i,
      requiredTools: ['get_facilities'],
      forceMessage: 'Kamu menjawab tentang fasilitas TANPA memanggil tool get_facilities. INI DILARANG. SEKARANG WAJIB panggil get_facilities lalu jawab berdasarkan hasilnya. LANGSUNG panggil tool!',
    },
    {
      name: 'payment_method',
      userAsks: /\b(rekening|nomor\s+rek|no\s+rek|transfer\s+kemana|bank\s+apa|bayar\s+kemana|cara\s+bayar|metode\s+bayar)\b/i,
      aiClaims: /\b(bca|mandiri|bni|bri|cimb|bsi|gopay|ovo|dana|qris)\b|\b\d{4,}\b/i,
      requiredTools: ['get_payment_methods'],
      forceMessage: 'Kamu menyebut bank/nomor rekening TANPA memanggil tool get_payment_methods. INI DILARANG karena nomor rekening bisa salah. SEKARANG WAJIB panggil get_payment_methods. LANGSUNG panggil tool!',
    },
    {
      // Cancellation guard: tamu bilang "batal/cancel" + AI mengaku sudah/akan
      // dibatalkan, atau mengarang "sistem error / batal manual / kabari nanti"
      // tanpa benar-benar memanggil cancel_booking → paksa retry dengan tool call.
      // CATATAN: jika cancel_booking BERHASIL dipanggil, guard skip otomatis
      // karena toolUsed=true (cek `toolsUsed.includes('cancel_booking')`).
      name: 'cancellation',
      userAsks: /\b(batal(?:kan|in)?|cancel|tidak\s+jadi|ga\s+jadi|gak\s+jadi|nggak\s+jadi|engga\s+jadi|maaf\s+batal)\b/i,
      aiClaims: /(sudah\s+(?:saya\s+)?(?:di)?batal|akan\s+(?:saya\s+)?(?:di)?batal|saya\s+batal(?:kan)?|coba\s+batal|batal(?:kan)?\s+manual|sistem(?:nya)?\s+(?:lagi\s+)?(?:ada\s+)?(?:kendala|error|gangguan)|kabari\s+(?:lagi|nanti)|proses(?:kan)?\s+dulu|nanti\s+saya\s+(?:bantu|cek|kabari))/i,
      requiredTools: ['cancel_booking'],
      forceMessage: 'Tamu meminta pembatalan tapi kamu TIDAK memanggil tool cancel_booking. INI DILARANG. Jangan bilang "sistem ada kendala" / "batalkan manual" / "nanti saya kabari" — itu halusinasi. SEKARANG WAJIB panggil cancel_booking dengan booking_id, guest_phone, guest_email dari KONTEKS BOOKING AKTIF. Jangan balas text — LANGSUNG panggil tool cancel_booking!',
    },
  ];

  for (const guard of extendedGuards) {
    if (isAvailabilityHallucination) break; // already retried above
    const userTriggered = guard.userAsks.test(combinedMessage);
    const aiTriggered = guard.aiClaims.test(aiResponse);
    const toolUsed = guard.requiredTools.some(t => toolsUsed.includes(t));
    if (!userTriggered || !aiTriggered || toolUsed) continue;

    console.log(`⚠️ ${guard.name.toUpperCase()} HALLUCINATION DETECTED - retrying with forced tool call`);
    await logMessage(supabase, conversationId, 'system',
      `[${guard.name} guard triggered: AI said "${aiResponse.substring(0, 80)}..." without calling ${guard.requiredTools.join('/')}. Tools used: ${toolsUsed.join(', ') || 'none'}]`,
    );
    try {
      await updateSession(supabase, phone, conversationId!, true);
    } catch (e) {
      console.warn("[orchestrator] updateSession (handover) failed:", e);
    }
    await transitionState(supabase, {
      phone,
      conversationId,
      from: currentState,
      to: "takeover",
      reason: "human_handover_requested",
    });
    const reassureMsg = "Baik kak, saya teruskan ke admin kami ya. Mohon ditunggu sebentar 🙏";
    await sendWhatsApp(phone, reassureMsg, env.fonnteApiKey);
    await logMessage(supabase, conversationId!, "assistant", reassureMsg);
    await escalateToHumanStaff(
      supabase,
      phone,
      conversationId!,
      "Tamu meminta diteruskan ke admin asli (handover request)",
      managerNumbers,
      env.fonnteApiKey,
    );
    logAgentDecision(supabase, {
      trace_id: trace?.traceId,
      phone_number: phone,
      conversation_id: conversationId,
      from_agent: "orchestrator",
      to_agent: "human_staff",
      reason: "human_handover_requested",
      intent: "handover",
    });
    return new Response(
      JSON.stringify({
        status: "handover_requested",
        conversation_id: conversationId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 5.7. NAME COLLECTION
  try {
    const nameResult = await handleNameCollection(
      supabase,
      session as WhatsAppSession,
      phone,
      conversationId!,
      rawMessage,
      normalizedMessage,
      isNewSession,
      personaName,
      env,
      pushname,
    );
    if (nameResult) {
      logAgentDecision(supabase, {
        trace_id: trace?.traceId,
        phone_number: phone,
        conversation_id: conversationId,
        from_agent: "orchestrator",
        to_agent: "orchestrator",
        reason: "name_collection",
        intent: "greeting",
      });
      return nameResult;
    }
  } catch (nameError) {
    console.error(`❌ NameCollection error for ${phone}:`, nameError);
  }

  // ── 6. AI INTENT CLASSIFICATION (memory-aware hybrid) ──
  // Fast-path: full house / sewa seluruh guesthouse → langsung jawab tarif flat
  if (isFullHouseQuestion(normalizedMessage)) {
    console.log(`🏡 [full-house] match for ${phone}: "${normalizedMessage.slice(0, 80)}"`);
    try {
      return await handleFullHouseQuestion(
        supabase,
        session as WhatsAppSession,
        phone,
        rawMessage,
        conversationId!,
        env,
        trace,
      );
    } catch (fhErr) {
      console.error(`❌ FullHouse error for ${phone}:`, fhErr);
      // fall through to normal routing
    }
  }

  const recentMessages = await getConversationHistory(supabase, conversationId!, historyWindowMessages).catch(() => []);
  const classification = await classifyIntent(normalizedMessage, {
    recentMessages: recentMessages.slice(-6),
    awaitingName: false, // already handled above
  });
  console.log(
    `🧠 Intent: ${classification.intent} (${classification.source}, conf=${classification.confidence.toFixed(2)})`,
  );

  // ── 7. DECISION ENGINE → AGENT ──
  const decision = decide(classification.intent);
  console.log(`🎯 Route: ${classification.intent} → ${decision.agent} (${decision.reason})`);

  logAgentDecision(supabase, {
    trace_id: trace?.traceId,
    phone_number: phone,
    conversation_id: conversationId,
    from_agent: "orchestrator",
    to_agent: decision.agent,
    reason: `${classification.source}:${decision.reason}`,
    intent: classification.intent,
    confidence: classification.confidence,
    metadata: { fallback_used: decision.fallbackUsed },
  });

  // ── 8. DISPATCH ──
  try {
    switch (decision.agent) {
      case "price_list":
        return await handlePriceListQuestion(
          supabase,
          session as WhatsAppSession,
          phone,
          rawMessage,
          conversationId!,
          personaName,
          env,
          trace,
        );

      case "complaint":
        return await handleComplaint(
          supabase,
          session as WhatsAppSession,
          phone,
          normalizedMessage,
          conversationId!,
          personaName,
          managerNumbers,
          env,
          trace,
        );

      case "name_collection":
        return await handleGuestFAQ(
          supabase,
          session as WhatsAppSession,
          phone,
          normalizedMessage,
          conversationId!,
          personaName,
          env,
          trace,
        );

      case "faq": {
        const faqResult = await handleGuestFAQ(
          supabase,
          session as WhatsAppSession,
          phone,
          normalizedMessage,
          conversationId!,
          personaName,
          env,
          trace,
        );
        const faqBody = await faqResult
          .clone()
          .json()
          .catch(() => null);
        if (faqBody?.status === "faq_escalate_to_booking") {
          console.log(`🔀 FAQ → Booking escalation`);
          logAgentDecision(supabase, {
            trace_id: trace?.traceId,
            phone_number: phone,
            conversation_id: conversationId,
            from_agent: "faq",
            to_agent: "booking",
            reason: "faq_needs_tools",
            intent: "booking",
          });
          // Reuse recentMessages + historyWindowMessages yang sudah di-fetch
          // di stage 6 untuk hindari double-fetch saat escalate ke booking.
          return await handleGuestBookingFlow(
            supabase,
            session as WhatsAppSession,
            phone,
            normalizedMessage,
            conversationId!,
            personaName,
            managerNumbers,
            env,
            trace,
            recentMessages,
            historyWindowMessages,
            isNewSession,
          );
        }
        return faqResult;
      }

      case "booking":
      case "payment":
      default:
        return await handleGuestBookingFlow(
          supabase,
          session as WhatsAppSession,
          phone,
          normalizedMessage,
          conversationId!,
          personaName,
          managerNumbers,
          env,
          trace,
          recentMessages,
          historyWindowMessages,
          isNewSession,
        );
    }
  } catch (agentError) {
    const errorMsg = (agentError as Error).message || "Unknown agent error";
    console.error(`❌ Agent error for ${phone}:`, errorMsg);
    await logMessage(supabase, conversationId!, "system", `[Error] Agent ${decision.agent} failed: ${errorMsg}`);
    await escalateToHumanStaff(supabase, phone, conversationId!, errorMsg, managerNumbers, env.fonnteApiKey);
    const apologyMsg = "Maaf, ada kendala dalam memproses pesan Anda. Tim kami akan segera menghubungi Anda. 🙏";
    await sendWhatsApp(phone, apologyMsg, env.fonnteApiKey);
    await logMessage(supabase, conversationId!, "assistant", apologyMsg);
    logAgentDecision(supabase, {
      trace_id: trace?.traceId,
      phone_number: phone,
      conversation_id: conversationId,
      from_agent: decision.agent,
      to_agent: "human_staff",
      reason: "agent_error",
      intent: "error_escalation",
    });
    return new Response(
      JSON.stringify({ status: "error_escalated", conversation_id: conversationId, error: errorMsg }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ────────────────────────────────────────────────────────────────────────────

async function parseRequestBody(req: Request): Promise<Record<string, unknown> | null> {
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) return await req.json();
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      return Object.fromEntries(formData.entries());
    }
    const text = await req.text();
    if (!text || text.trim() === "") return null;
    try {
      return JSON.parse(text);
    } catch {
      return Object.fromEntries(new URLSearchParams(text).entries());
    }
  } catch {
    console.error("Body parse error");
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
  pushname: string = "",
): Promise<Response | null> {
  if (isNewSession) {
    // ── Pushname bypass: jika webhook Fonnte membawa nama profil WA yang valid,
    //    skip prompt "Boleh saya tahu nama Anda?".
    //    `pushname` sudah dinormalisasi oleh extractPushname (trim, NBSP, dst).
    //    Bypass HANYA jika lolos heuristik isLikelyPersonName.
    const trimmedPushname = pushname; // sudah dinormalisasi upstream
    const pushnameValid = trimmedPushname.length > 0 && isLikelyPersonName(trimmedPushname);

    if (!trimmedPushname) {
      console.log(`👤 [pushname-empty] No WA pushname for ${phone} → fallback ke flow nama biasa`);
    } else if (!pushnameValid) {
      console.log(
        `👤 [pushname-invalid] Pushname "${trimmedPushname}" gagal validasi untuk ${phone} → fallback ke flow nama biasa`,
      );
    }

    if (pushnameValid) {
      console.log(`👋 [pushname-bypass] Using WA pushname for ${phone}: "${trimmedPushname}"`);
      await supabase.from("whatsapp_sessions").upsert(
        {
          phone_number: phone,
          conversation_id: conversationId,
          last_message_at: new Date().toISOString(),
          is_active: true,
          session_type: "guest",
          awaiting_name: false,
          guest_name: trimmedPushname,
          conversation_state: "idle",
        },
        { onConflict: "phone_number" },
      );
      if (conversationId) {
        await supabase
          .from("chat_conversations")
          .update({ guest_email: `${trimmedPushname} (WA: ${phone})` })
          .eq("id", conversationId);
      }
      try {
        await supabase.from("session_intent_logs").insert({
          phone,
          conversation_id: conversationId || null,
          first_message: normalizedMessage.slice(0, 500),
          matched_intents: ["pushname_bypass"],
          greeting_bypass: true,
          source: "whatsapp",
        });
      } catch (e) {
        console.error("Failed to persist session_intent_log (pushname)", e);
      }
      // Lanjutkan flow biasa: pesan pertama tetap diproses oleh agent routing.
      return null;
    }

    // Greeting bypass: jika first message sudah membawa intent (tanya/booking/foto/dll), skip prompt nama.
    // Pattern hoisted di module scope (INTENT_PATTERNS) untuk hindari re-compile per request.
    const matchedIntents: string[] = [];
    for (const [name, re] of Object.entries(INTENT_PATTERNS)) {
      if (re.test(normalizedMessage)) matchedIntents.push(name);
    }
    const isQuestion = matchedIntents.length > 0;
    const sessionDebug = {
      phone,
      conversation_id: conversationId,
      first_message: normalizedMessage.slice(0, 200),
      matched_intents: matchedIntents,
      greeting_bypass: isQuestion,
    };
    console.log(`🆕 [session-debug] ${JSON.stringify(sessionDebug)}`);

    // Persist intent log untuk dashboard analytics (best-effort, non-blocking)
    try {
      await supabase.from("session_intent_logs").insert({
        phone,
        conversation_id: conversationId || null,
        first_message: normalizedMessage.slice(0, 500),
        matched_intents: matchedIntents,
        greeting_bypass: isQuestion,
        source: "whatsapp",
      });
    } catch (e) {
      console.error("Failed to persist session_intent_log", e);
    }

    if (isQuestion) {
      console.log(`⏭️ First message matched intents [${matchedIntents.join(",")}] - bypassing name prompt`);
      const genericName = `Tamu WA ${phone.slice(-4)}`;
      await supabase.from("whatsapp_sessions").upsert(
        {
          phone_number: phone,
          conversation_id: conversationId,
          last_message_at: new Date().toISOString(),
          is_active: true,
          session_type: "guest",
          awaiting_name: false,
          guest_name: genericName,
          conversation_state: "idle",
        },
        { onConflict: "phone_number" },
      );
      if (conversationId) {
        await supabase
          .from("chat_conversations")
          .update({ guest_email: `${genericName} (WA: ${phone})` })
          .eq("id", conversationId);
      }
      return null;
    }

    console.log(`📛 No intent matched on first message - asking for name`);

    await supabase.from("whatsapp_sessions").upsert(
      {
        phone_number: phone,
        conversation_id: conversationId,
        last_message_at: new Date().toISOString(),
        is_active: true,
        session_type: "guest",
        awaiting_name: true,
        guest_name: null,
        conversation_state: "awaiting_name",
      },
      { onConflict: "phone_number" },
    );

    await logMessage(supabase, conversationId, "user", normalizedMessage);
    const greetingMsg = `Halo! 👋 Saya ${personaName} dari Pomah Guesthouse. Boleh saya tahu nama Anda?`;
    await logMessage(supabase, conversationId, "assistant", greetingMsg);
    await sendWhatsApp(phone, greetingMsg, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: "awaiting_name", conversation_id: conversationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (session?.awaiting_name) {
    console.log(`📝 Awaiting name for ${phone}: "${rawMessage}"`);
    const guestNameCandidate = rawMessage.trim();

    if (!isLikelyPersonName(guestNameCandidate)) {
      const genericName = `Tamu WA ${phone.slice(-4)}`;
      await supabase
        .from("whatsapp_sessions")
        .update({
          guest_name: genericName,
          awaiting_name: false,
          last_message_at: new Date().toISOString(),
          conversation_state: "idle",
        })
        .eq("phone_number", phone);
      if (conversationId) {
        await supabase
          .from("chat_conversations")
          .update({ guest_email: `${genericName} (WA: ${phone})` })
          .eq("id", conversationId);
      }
      return null;
    }

    await supabase
      .from("whatsapp_sessions")
      .update({
        guest_name: guestNameCandidate,
        awaiting_name: false,
        last_message_at: new Date().toISOString(),
        conversation_state: "idle",
      })
      .eq("phone_number", phone);
    if (conversationId) {
      await supabase
        .from("chat_conversations")
        .update({ guest_email: `${guestNameCandidate} (WA: ${phone})` })
        .eq("id", conversationId);
    }
    await logMessage(supabase, conversationId, "user", guestNameCandidate);
    const confirmMsg = `Terima kasih, Kak ${guestNameCandidate}! 😊 Saya ${personaName} dari Pomah Guesthouse. Ada yang bisa saya bantu hari ini?`;
    await logMessage(supabase, conversationId, "assistant", confirmMsg);
    await sendWhatsApp(phone, confirmMsg, env.fonnteApiKey);
    return new Response(
      JSON.stringify({ status: "name_captured", guest_name: guestNameCandidate, conversation_id: conversationId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return null;
}
