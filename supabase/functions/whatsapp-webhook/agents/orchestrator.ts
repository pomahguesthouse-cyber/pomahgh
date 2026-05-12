// orchestrator.ts (enhanced version)
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
import { logChatbotAlert } from "../services/alerts.ts";
import logger from "../utils/logger.ts"; // Import structured logger

export async function orchestrate(req: Request, env: EnvConfig): Promise<Response> {
  // Create a request-scoped logger with correlation ID
  const requestId = crypto.randomUUID();
  const reqLogger = logger.child({
    requestId,
    component: "orchestrator",
  });

  reqLogger.info({ event: "orchestrate_start" }, "Starting orchestration");

  const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey);
  const body = await parseRequestBody(req);

  if (!body) {
    reqLogger.warn({ event: "invalid_request_body" }, "Invalid request body");
    return new Response(JSON.stringify({ status: "error" }), { status: 400 });
  }

  const { sender, message } = body;
  const phone = normalizePhone(String(sender));
  const rawMessage = String(message ?? "");
  const normalizedMessage = normalizeIndonesianMessage(rawMessage);

  reqLogger.info(
    {
      event: "message_received",
      phone,
      rawMessage,
      normalizedMessage,
    },
    "Processing incoming message",
  );

  const [hotelSettings, { data: sessionRaw }] = await Promise.all([
    getCachedHotelSettings(supabase),
    supabase.from("whatsapp_sessions").select("*").eq("phone_number", phone).limit(1).maybeSingle(),
  ]);

  reqLogger.debug(
    {
      event: "session_lookup",
      sessionFound: !!sessionRaw,
      hotelSettingsAvailable: !!hotelSettings,
    },
    "Session lookup completed",
  );

  const conversationId = await ensureConversation(supabase, sessionRaw, phone);
  const managerNumbers = hotelSettings?.whatsapp_manager_numbers || [];

  // Handle Image & Manager
  const imageUrl = extractImageUrl(body);

  // 📝 CENTRAL INBOUND LOG
  // Pastikan SEMUA pesan masuk tamu tercatat di chat_messages, apa pun cabang
  // agent berikutnya. Pesan gambar dilog oleh paymentProof dengan format khusus.
  if (!imageUrl && rawMessage.trim().length > 0) {
    await logMessage(supabase, conversationId, "user", rawMessage);
    reqLogger.info(
      {
        event: "message_logged",
        conversationId,
        messageType: "user",
      },
      "User message logged to database",
    );
  }

  // 🆘 TAKEOVER SHORT-CIRCUIT
  // Jika admin sudah ambil alih (is_takeover=true), JANGAN balas dengan AI.
  // Cukup log pesan masuk supaya muncul di TakeoverChatDialog admin.
  if (sessionRaw?.is_takeover === true) {
    reqLogger.info(
      {
        event: "takeover_active",
        phone,
        conversationId,
      },
      "Takeover active, skipping AI reply",
    );

    return new Response(JSON.stringify({ status: "takeover_active" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (imageUrl) {
    reqLogger.info(
      {
        event: "image_detected",
        imageUrl,
        phone,
      },
      "Handling image message",
    );

    return await handlePaymentProof(supabase, phone, imageUrl, conversationId, managerNumbers, env, undefined, {
      caption: rawMessage,
    });
  }

  if (managerNumbers.some((m) => m.phone === phone)) {
    reqLogger.info(
      {
        event: "manager_message",
        phone,
      },
      "Handling manager chat",
    );

    return await handleManagerChat(
      supabase,
      sessionRaw,
      phone,
      normalizedMessage,
      managerNumbers.find((m) => m.phone === phone)!,
      env,
    );
  }

  // Intent Classification dengan Guard
  const recentMessages = await getConversationHistory(supabase, conversationId, 10);
  const lastBotReply = recentMessages.filter((m) => m.role === "assistant").pop()?.content || "";

  // Guard: Jika baru saja kasih kode booking, jangan classify sebagai booking ulang (cegah loop)
  const isDuplicateBooking = /PMH-/i.test(lastBotReply) && /\b(jadinya|ubah|malam|rubah)\b/i.test(normalizedMessage);

  // Guard: deteksi konteks B2B/sales outreach dari riwayat percakapan.
  // Jika 6 pesan terakhir mengandung kata kunci kerjasama/proposal/marketing
  // dan tamu BELUM PERNAH menyebut tanggal/booking/kamar, paksa ke FAQ.
  const recentText = recentMessages
    .slice(-10)
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();
  const hasB2BContext =
    /(proposal|kerja\s*sama|kerjasama|kolaborasi|partnership|pemasaran|penawaran|tawaran|ota|agensi|agency|vendor|supplier|reddoorz|oyo|sales\s+(?:executive|manager)|business\s+development|b2b)/i.test(
      recentText,
    );
  const hasBookingContext =
    /(check.?in|check.?out|menginap|nginap|booking|pesan\s+kamar|tanggal|tgl|\b\d+\s+(?:malam|hari|orang|kamar)\b|deluxe|family|superior|standard)/i.test(
      recentText,
    );
  const isB2BConversation = hasB2BContext && !hasBookingContext;

  // Guard: pesan acknowledgment pasif (tamu bilang "oke saya diskusikan dulu",
  // "ditunggu", "nanti saya kabari", dsb.) JANGAN dirouting ke booking flow,
  // karena akan re-ask tanggal walaupun tanggal sudah pernah dibahas.
  // Cukup balas via FAQ agent (AI akan kasih reply sopan sesuai konteks).
  const ACK_DEFER_RE =
    /^(?:oke?|ok|sip|baik|siap|iya|ya|yoi|noted|terima\s*kasih|makasih|thanks?)\b[\s\S]{0,200}?\b(?:diskusi(?:kan)?|tanya|kabari|kasih\s*tau|tunggu|ditunggu|nanti|besok|sebentar|bentar|dulu|rombongan|ketua|teman|keluarga|istri|suami|bos|atasan|pikir)/i;
  const isPassiveAck = ACK_DEFER_RE.test(normalizedMessage);

  let classification;
  if (isDuplicateBooking) {
    classification = { intent: "faq", confidence: 1.0, source: "keyword", reason: "avoid_duplicate_booking" };
  } else if (isB2BConversation) {
    classification = { intent: "faq", confidence: 1.0, source: "keyword", reason: "b2b_conversation_context" };
  } else if (isPassiveAck) {
    classification = { intent: "faq", confidence: 1.0, source: "keyword", reason: "passive_acknowledgment" };
  } else {
    reqLogger.info(
      {
        event: "intent_classification_start",
        normalizedMessage,
      },
      "Starting intent classification",
    );

    classification = await classifyIntent(normalizedMessage, { recentMessages: recentMessages.slice(-6) });

    reqLogger.info(
      {
        event: "intent_classification_result",
        intent: classification.intent,
        confidence: classification.confidence,
        reason: classification.reason,
      },
      "Intent classification completed",
    );
  }

  // 🔔 Alert admin: classifier confidence rendah (≤ 0.5) ATAU intent unknown.
  // Berarti AI tidak yakin merespons → admin perlu pantau & ambil alih kalau perlu.
  if (
    !classification.reason?.startsWith("avoid_") &&
    !classification.reason?.startsWith("b2b_") &&
    !classification.reason?.startsWith("passive_") &&
    (classification.confidence <= 0.5 || classification.intent === "unknown")
  ) {
    reqLogger.warn(
      {
        event: "low_confidence_intent",
        phone_number: phone,
        conversation_id: conversationId,
        last_user_message: rawMessage,
        confidence: classification.confidence,
        intent: classification.intent,
      },
      "Low confidence intent detected, logging alert",
    );

    await logChatbotAlert(supabase, {
      alert_type: "low_confidence",
      phone_number: phone,
      conversation_id: conversationId,
      last_user_message: rawMessage,
      confidence: classification.confidence,
      intent: classification.intent,
      recentMessages: recentMessages as Array<{ role: string; content: string }>,
    });
  }

  try {
    const decision = decide(classification.intent);

    reqLogger.info(
      {
        event: "decision_made",
        agent: decision.agent,
        intent: classification.intent,
      },
      "Decision made based on intent",
    );

    if (isB2BConversation || isPassiveAck) {
      reqLogger.info(
        {
          event: "routing_to_faq",
          reason: isB2BConversation ? "b2b_conversation" : "passive_ack",
        },
        "Routing to FAQ handler",
      );

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

    if (decision.agent === "booking" || decision.agent === "payment" || isDuplicateBooking) {
      reqLogger.info(
        {
          event: "routing_to_booking",
          reason: isDuplicateBooking ? "duplicate_booking" : "booking_intent",
        },
        "Routing to booking handler",
      );

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
      reqLogger.info(
        {
          event: "routing_to_faq",
          reason: "faq_intent",
        },
        "Routing to FAQ handler",
      );

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

    // Safer default: route unmatched/ambiguous intents (greeting, name_collection,
    // complaint, unknown) to FAQ instead of aggressively pushing booking flow.
    reqLogger.info(
      {
        event: "routing_to_faq_default",
        intent: classification.intent,
      },
      "Routing to FAQ handler as default",
    );

    return await handleGuestFAQ(supabase, sessionRaw, phone, normalizedMessage, conversationId, "Rani", env, undefined);
  } catch (err) {
    reqLogger.error(
      {
        event: "orchestrator_fatal_error",
        error:
          err instanceof Error
            ? {
                message: err.message,
                stack: err.stack,
              }
            : String(err),
      },
      "Orchestrator fatal error occurred",
    );

    return new Response(JSON.stringify({ status: "error_handled" }));
  } finally {
    reqLogger.info(
      {
        event: "orchestrate_end",
      },
      "Orchestration completed",
    );
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
