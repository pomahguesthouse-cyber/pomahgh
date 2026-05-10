import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from "../types.ts";
import { corsHeaders } from "../types.ts";
import { normalizePhone, isValidPhone } from "../utils/phone.ts";
import { normalizeIndonesianMessage } from "../utils/slang.ts";
import { extractPushname } from "../utils/format.ts";
import type { TraceContext } from "../../_shared/traceContext.ts";
import { logAgentDecision } from "../../_shared/agentLogger.ts";
import { checkRateLimit } from "../middleware/rateLimiter.ts";
import { checkDuplicate, extractMessageId } from "../middleware/dedup.ts";
import { getCachedHotelSettings, ensureConversation, updateSession } from "../services/session.ts";
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

let cachedSupabase: SupabaseClient | null = null;
let cachedSupabaseUrl: string | null = null;

function getSupabaseClient(env: EnvConfig): SupabaseClient {
  if (cachedSupabase && cachedSupabaseUrl === env.supabaseUrl) return cachedSupabase;
  cachedSupabase = createClient(env.supabaseUrl, env.supabaseServiceKey) as SupabaseClient;
  cachedSupabaseUrl = env.supabaseUrl;
  return cachedSupabase;
}

async function hasRecentFallbackApology(supabase: SupabaseClient, conversationId: string): Promise<boolean> {
  const sinceIso = new Date(Date.now() - 300 * 1000).toISOString();
  const { data } = await supabase
    .from("chat_messages")
    .select("content")
    .eq("conversation_id", conversationId)
    .eq("role", "assistant")
    .gte("created_at", sinceIso)
    .limit(3);
  return data?.some((m) => /(maaf|kendala|error|gangguan|sistem)/i.test(m.content as string)) ?? false;
}

export async function orchestrate(req: Request, env: EnvConfig, trace?: TraceContext): Promise<Response> {
  const supabase = getSupabaseClient(env);
  const body = await parseRequestBody(req);
  if (!body) return new Response(JSON.stringify({ status: "error" }), { status: 400 });

  const { sender, message } = body;
  const phone = normalizePhone(String(sender));
  const rawMessage = String(message ?? "");
  const normalizedMessage = normalizeIndonesianMessage(rawMessage);

  // 1. DEDUP & RATE LIMIT
  if (!(await checkRateLimit(supabase, phone))) return new Response(JSON.stringify({ status: "rate_limited" }));

  // 2. CONTEXT LOADING
  const [hotelSettings, { data: sessionRaw }, { data: configs }, { data: rules }] = await Promise.all([
    getCachedHotelSettings(supabase),
    supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", phone)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("agent_configs").select("*"),
    supabase.from("escalation_rules").select("*").eq("is_active", true),
  ]);

  setAgentConfigs((configs || []) as AgentConfigRecord[], (rules || []) as EscalationRule[]);
  const session = sessionRaw as unknown as WhatsAppSession | null;
  const managerNumbers = hotelSettings?.whatsapp_manager_numbers || [];
  const conversationId = await ensureConversation(supabase, session, phone);

  // 3. IMAGE & MANAGER HANDLERS
  const imageUrl = extractImageUrl(body);
  if (imageUrl)
    return await handlePaymentProof(supabase, phone, imageUrl, conversationId, managerNumbers, env, trace, {
      caption: rawMessage,
    });
  if (managerNumbers.some((m) => m.phone === phone))
    return await handleManagerChat(
      supabase,
      session,
      phone,
      normalizedMessage,
      managerNumbers.find((m) => m.phone === phone)!,
      env,
    );

  // 4. INTENT CLASSIFICATION WITH DUPLICATE GUARD
  const recentMessages = await getConversationHistory(supabase, conversationId, 10);
  const lastBotReply = recentMessages.filter((m) => m.role === "assistant").pop()?.content || "";

  // Guard: Jika pesan terakhir bot ada kode booking, abaikan intent booking ulang agar tidak error loop
  const isDuplicateBooking = /PMH-/i.test(lastBotReply) && /\b(booking|pesan|jadi|malam)\b/i.test(normalizedMessage);

  let classification;
  if (isDuplicateBooking) {
    console.log("🛡️ Guard: Mencegah duplicate booking intent.");
    classification = { intent: "faq", confidence: 1.0, source: "keyword", reason: "avoid_duplicate_booking" };
  } else if (/\b(booking|pesan|jadi|malam|check\s*in)\b/i.test(normalizedMessage)) {
    classification = { intent: "booking", confidence: 1.0, source: "keyword", reason: "booking_shortcut" };
  } else {
    classification = await classifyIntent(normalizedMessage, { recentMessages: recentMessages.slice(-6) });
  }

  // 5. DISPATCH
  try {
    const decision = decide(classification.intent);
    switch (decision.agent) {
      case "booking":
      case "payment":
        return await handleGuestBookingFlow(
          supabase,
          session as WhatsAppSession,
          phone,
          normalizedMessage,
          conversationId,
          "Rani",
          managerNumbers,
          env,
          trace,
          recentMessages,
          20,
          false,
        );
      case "faq":
        return await handleGuestFAQ(
          supabase,
          session as WhatsAppSession,
          phone,
          normalizedMessage,
          conversationId,
          "Rani",
          env,
          trace,
        );
      default:
        return await handleGuestBookingFlow(
          supabase,
          session as WhatsAppSession,
          phone,
          normalizedMessage,
          conversationId,
          "Rani",
          managerNumbers,
          env,
          trace,
          recentMessages,
          20,
          false,
        );
    }
  } catch (err) {
    console.error("Orchestrator Error:", err);
    if (!(await hasRecentFallbackApology(supabase, conversationId))) {
      await sendWhatsApp(
        phone,
        "Mohon maaf kak, saya sedang mengalami kendala teknis. Mohon tunggu sebentar ya, tim kami akan segera membantu 🙏",
        env.fonnteApiKey,
      );
    }
    return new Response(JSON.stringify({ status: "error_handled" }));
  }
}

async function parseRequestBody(req: Request): Promise<Record<string, any> | null> {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return await req.json();
    const formData = await req.formData();
    return Object.fromEntries(formData.entries());
  } catch {
    return null;
  }
}
