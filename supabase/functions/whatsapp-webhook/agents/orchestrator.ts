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
import { extractConversationContext, getLatestBookingContextByPhone } from "../services/context.ts";
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

async function hasRecentFallbackApology(
  supabase: SupabaseClient,
  conversationId: string,
  withinSeconds: number = 300,
): Promise<boolean> {
  const sinceIso = new Date(Date.now() - withinSeconds * 1000).toISOString();
  const { data } = await supabase
    .from("chat_messages")
    .select("content")
    .eq("conversation_id", conversationId)
    .eq("role", "assistant")
    .gte("created_at", sinceIso)
    .limit(3);
  const fallbackApologyRe = /(maaf|kendala|error|gangguan|sistem|coba lagi)/i;
  return data?.some((m) => typeof m.content === "string" && fallbackApologyRe.test(m.content)) ?? false;
}

async function escalateToHumanStaff(
  supabase: SupabaseClient,
  phone: string,
  conversationId: string,
  error: string,
  managerNumbers: ManagerInfo[],
  fonnteApiKey: string,
): Promise<void> {
  const targets = managerNumbers.filter((m) => m.role === "super_admin" || m.role === "admin");
  const recipients = targets.length > 0 ? targets : managerNumbers;
  const notif = `🔴 *ERROR AGENT*\n📱 ${phone}\n❌ ${error.substring(0, 100)}`;
  await Promise.allSettled(recipients.map((m) => sendWhatsApp(m.phone, notif, fonnteApiKey)));
}

export async function orchestrate(req: Request, env: EnvConfig, trace?: TraceContext): Promise<Response> {
  const supabase = getSupabaseClient(env);
  const body = await parseRequestBody(req);
  if (!body) return new Response(JSON.stringify({ status: "error" }), { status: 400 });

  const { sender, message } = body;
  const phone = normalizePhone(String(sender));
  const rawMessage = String(message ?? "");
  const normalizedMessage = normalizeIndonesianMessage(rawMessage);
  const pushname = extractPushname(body);

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
  const isManager = managerNumbers.some((m) => m.phone === phone);

  // 3. PRE-ROUTING HANDLERS (Simplified)
  const imageUrl = extractImageUrl(body);
  if (imageUrl)
    return await handlePaymentProof(
      supabase,
      phone,
      imageUrl,
      await ensureConversation(supabase, session, phone),
      managerNumbers,
      env,
      trace,
      { caption: rawMessage },
    );

  if (isManager)
    return await handleManagerChat(
      supabase,
      session,
      phone,
      normalizedMessage,
      managerNumbers.find((m) => m.phone === phone)!,
      env,
    );

  // 4. SESSION & HANDOVER
  let conversationId = await ensureConversation(supabase, session, phone);

  // 5. INTENT CLASSIFICATION (With Hard Shortcut)
  // Shortcut: Jika mengandung kata kunci booking, paksa ke booking agent
  const isBookingShortcut = /\b(booking|pesan|jadi|malam|check\s*in)\b/i.test(normalizedMessage);

  let classification;
  if (isBookingShortcut) {
    classification = { intent: "booking", confidence: 1.0, source: "keyword", reason: "booking_shortcut" };
  } else {
    const recentMessages = await getConversationHistory(supabase, conversationId, 20);
    classification = await classifyIntent(normalizedMessage, { recentMessages: recentMessages.slice(-6) });
  }

  // 6. DISPATCH
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
          [],
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
          [],
          20,
          false,
        );
    }
  } catch (err) {
    const msg = (err as Error).message;
    const hasRecent = await hasRecentFallbackApology(supabase, conversationId);
    if (!hasRecent) {
      await sendWhatsApp(
        phone,
        "Mohon maaf kak, saya sedang mengalami kendala teknis. Mohon tunggu sebentar ya, tim kami akan segera membantu 🙏",
        env.fonnteApiKey,
      );
    }
    await escalateToHumanStaff(supabase, phone, conversationId, msg, managerNumbers, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: "agent_failed" }));
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
