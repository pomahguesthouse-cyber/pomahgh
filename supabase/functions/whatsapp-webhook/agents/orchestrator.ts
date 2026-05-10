import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from "../types.ts";
import { corsHeaders } from "../types.ts";
import { normalizePhone, isValidPhone } from "../utils/phone.ts";
import { normalizeIndonesianMessage } from "../utils/slang.ts";
import { getCachedHotelSettings, ensureConversation } from "../services/session.ts";
import { logMessage, getConversationHistory } from "../services/conversation.ts";
import { sendWhatsApp } from "../services/fonnte.ts";
import { handleManagerChat } from "./manager.ts";
import { handleGuestBookingFlow } from "./booking.ts";
import { handleGuestFAQ } from "./faq.ts";
import { handlePaymentProof, extractImageUrl } from "./paymentProof.ts";
import { setAgentConfigs } from "../../_shared/agentConfigCache.ts";
import { classifyIntent } from "./intentClassifier.ts";
import { decide } from "./decisionEngine.ts";

export async function orchestrate(req: Request, env: EnvConfig): Promise<Response> {
  const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey);
  const body = await parseRequestBody(req);
  if (!body) return new Response(JSON.stringify({ status: "error" }), { status: 400 });

  const { sender, message } = body;
  const phone = normalizePhone(String(sender));
  const rawMessage = String(message ?? "");
  const normalizedMessage = normalizeIndonesianMessage(rawMessage);

  const [hotelSettings, { data: sessionRaw }] = await Promise.all([
    getCachedHotelSettings(supabase),
    supabase.from("whatsapp_sessions").select("*").eq("phone_number", phone).limit(1).maybeSingle(),
  ]);

  const conversationId = await ensureConversation(supabase, sessionRaw, phone);
  const managerNumbers = hotelSettings?.whatsapp_manager_numbers || [];

  // 🆘 TAKEOVER SHORT-CIRCUIT
  // Jika admin sudah ambil alih (is_takeover=true), JANGAN balas dengan AI.
  // Cukup log pesan masuk supaya muncul di TakeoverChatDialog admin.
  if (sessionRaw?.is_takeover === true) {
    await logMessage(supabase, conversationId, "user", rawMessage);
    console.info(`[orchestrator] Takeover active for ${phone}, skip AI reply`);
    return new Response(JSON.stringify({ status: "takeover_active" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Handle Image & Manager
  const imageUrl = extractImageUrl(body);
  if (imageUrl)
    return await handlePaymentProof(supabase, phone, imageUrl, conversationId, managerNumbers, env, undefined, {
      caption: rawMessage,
    });
  if (managerNumbers.some((m) => m.phone === phone))
    return await handleManagerChat(
      supabase,
      sessionRaw,
      phone,
      normalizedMessage,
      managerNumbers.find((m) => m.phone === phone)!,
      env,
    );

  // Intent Classification dengan Guard
  const recentMessages = await getConversationHistory(supabase, conversationId, 10);
  const lastBotReply = recentMessages.filter((m) => m.role === "assistant").pop()?.content || "";

  // Guard: Jika baru saja kasih kode booking, jangan classify sebagai booking ulang (cegah loop)
  const isDuplicateBooking = /PMH-/i.test(lastBotReply) && /\b(jadinya|ubah|malam|rubah)\b/i.test(normalizedMessage);

  let classification;
  if (isDuplicateBooking) {
    classification = { intent: "faq", confidence: 1.0, source: "keyword", reason: "avoid_duplicate_booking" };
  } else {
    classification = await classifyIntent(normalizedMessage, { recentMessages: recentMessages.slice(-6) });
  }

  try {
    const decision = decide(classification.intent);

    if (decision.agent === "booking" || decision.agent === "payment" || isDuplicateBooking) {
      return await handleGuestBookingFlow(
        supabase,
        sessionRaw,
        phone,
        normalizedMessage,
        conversationId,
        "Rani",
        managerNumbers,
        env,
        undefined,
        recentMessages,
      );
    } else if (decision.agent === "faq") {
      return await handleGuestFAQ(
        supabase,
        sessionRaw,
        phone,
        normalizedMessage,
        conversationId,
        "Rani",
        env,
        undefined,
      );
    }

    return await handleGuestBookingFlow(
      supabase,
      sessionRaw,
      phone,
      normalizedMessage,
      conversationId,
      "Rani",
      managerNumbers,
      env,
      undefined,
      recentMessages,
    );
  } catch (err) {
    console.error("Orchestrator Fatal:", err);
    return new Response(JSON.stringify({ status: "error_handled" }));
  }
}

async function parseRequestBody(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("json")) return await req.json();
    return Object.fromEntries(await req.formData());
  } catch {
    return null;
  }
}
