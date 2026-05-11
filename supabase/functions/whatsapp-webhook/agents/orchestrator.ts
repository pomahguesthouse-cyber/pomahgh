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

  // Handle Image & Manager
  const imageUrl = extractImageUrl(body);

  // 📝 CENTRAL INBOUND LOG
  // Pastikan SEMUA pesan masuk tamu tercatat di chat_messages, apa pun cabang
  // agent berikutnya. Pesan gambar dilog oleh paymentProof dengan format khusus.
  if (!imageUrl && rawMessage.trim().length > 0) {
    await logMessage(supabase, conversationId, "user", rawMessage);
  }

  // 🆘 TAKEOVER SHORT-CIRCUIT
  // Jika admin sudah ambil alih (is_takeover=true), JANGAN balas dengan AI.
  // Cukup log pesan masuk supaya muncul di TakeoverChatDialog admin.
  if (sessionRaw?.is_takeover === true) {
    console.info(`[orchestrator] Takeover active for ${phone}, skip AI reply`);
    return new Response(JSON.stringify({ status: "takeover_active" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

  // Guard: deteksi konteks B2B/sales outreach dari riwayat percakapan.
  // Jika 6 pesan terakhir mengandung kata kunci kerjasama/proposal/marketing
  // dan tamu BELUM PERNAH menyebut tanggal/booking/kamar, paksa ke FAQ.
  const recentText = recentMessages
    .slice(-10)
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();
  const hasB2BContext = /(proposal|kerja\s*sama|kerjasama|kolaborasi|partnership|pemasaran|penawaran|tawaran|ota|agensi|agency|vendor|supplier|reddoorz|oyo|sales\s+(?:executive|manager)|business\s+development|b2b)/i.test(
    recentText,
  );
  const hasBookingContext = /(check.?in|check.?out|menginap|nginap|booking|pesan\s+kamar|tanggal|tgl|\b\d+\s+(?:malam|hari|orang|kamar)\b|deluxe|family|superior|standard)/i.test(
    recentText,
  );
  const isB2BConversation = hasB2BContext && !hasBookingContext;

  let classification;
  if (isDuplicateBooking) {
    classification = { intent: "faq", confidence: 1.0, source: "keyword", reason: "avoid_duplicate_booking" };
  } else if (isB2BConversation) {
    classification = { intent: "faq", confidence: 1.0, source: "keyword", reason: "b2b_conversation_context" };
  } else {
    classification = await classifyIntent(normalizedMessage, { recentMessages: recentMessages.slice(-6) });
  }

  try {
    const decision = decide(classification.intent);

    if (isB2BConversation) {
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

    if ((decision.agent === "booking" || decision.agent === "payment" || isDuplicateBooking)) {
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

    // Safer default: route unmatched/ambiguous intents (greeting, name_collection,
    // complaint, unknown) to FAQ instead of aggressively pushing booking flow.
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
