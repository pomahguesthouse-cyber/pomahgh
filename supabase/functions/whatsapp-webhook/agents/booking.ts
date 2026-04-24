import type { SupabaseClient, EnvConfig } from '../types.ts';
import { formatForWhatsApp } from '../utils/format.ts';
import { logMessage, getConversationHistory } from '../services/conversation.ts';
import { sendWhatsApp, sendWhatsAppFile } from '../services/fonnte.ts';
import { extractConversationContext, getLatestBookingContextByPhone } from '../services/context.ts';
import { batchMessages } from '../middleware/messageBatcher.ts';
import { detectAndAlertNegativeSentiment } from '../middleware/sentiment.ts';
import { corsHeaders, type ManagerInfo, type WhatsAppSession } from '../types.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';
import { isRoomPhotoRequest } from './faq.ts';

/** Helper: ambil brosur kamar dari KB & kirim file via Fonnte. Return true jika sukses. */
async function sendBrochureInline(
  supabase: SupabaseClient,
  phone: string,
  fonnteApiKey: string,
): Promise<boolean> {
  const { data: kb } = await supabase
    .from('chatbot_knowledge_base')
    .select('source_url, original_filename')
    .ilike('title', '%brosur%kamar%')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!kb?.source_url) return false;

  const { data: signed } = await supabase
    .storage.from('knowledge-base')
    .createSignedUrl(kb.source_url, 3600);
  if (!signed?.signedUrl) return false;

  const filename = kb.original_filename || 'brosur-kamar-pomah-guesthouse.pdf';
  const caption = `📕 Berikut brosur kamar Pomah Guesthouse ya kak, lengkap dengan foto & detail tiap tipe kamar 😊`;
  const result = await sendWhatsAppFile(phone, signed.signedUrl, caption, fonnteApiKey, filename);
  if (result.status !== false) {
    console.log(`✅ Booking Agent: Brochure PDF sent to ${phone}`);
    return true;
  }
  return false;
}

/**
 * Booking Agent: Handle the full AI conversation flow for guest messages.
 * Includes batching, context extraction, chatbot call, stuck detection, and reply.
 */
export async function handleGuestBookingFlow(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  normalizedMessage: string,
  conversationId: string,
  personaName: string,
  managerNumbers: ManagerInfo[],
  env: EnvConfig,
  trace?: TraceContext,
  /** Optional: history sudah di-fetch oleh orchestrator untuk intent classifier.
   *  Kalau diisi, kita skip fetch ulang untuk mengurangi 1 round-trip DB (~150-300ms). */
  preFetchedHistory?: Array<{ role: string; content: string }>,
  /** Optional: ukuran window history (dari hotel_settings). */
  historyWindow?: number,
): Promise<Response> {
  // Fire-and-forget session update — tidak perlu memblok pipeline AI.
  // Jika gagal, di-log tapi tidak menggagalkan respons ke tamu.
  void supabase
    .from('whatsapp_sessions')
    .upsert({
      phone_number: phone, conversation_id: conversationId,
      last_message_at: new Date().toISOString(), is_active: true, session_type: 'guest',
    }, { onConflict: 'phone_number' })
    .then(({ error }) => {
      if (error) console.warn('[booking] session upsert failed:', error.message);
    });

  // Message batching
  const batchedMessages = await batchMessages(supabase, phone, normalizedMessage);
  if (batchedMessages === null) {
    console.log(`📦 This invocation yielded to batch processor for ${phone}`);
    return new Response(JSON.stringify({ status: "batched", phone }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const combinedMessage = batchedMessages.join('\n');
  console.log(`📦 Processing combined message for ${phone}: "${combinedMessage}"`);

  // ── PARALLELIZE I/O ──
  // Log pesan user, fetch history (jika belum ada), fetch context booking — semua paralel.
  const wantsBrochure = isRoomPhotoRequest(combinedMessage);

  const historyPromise = preFetchedHistory
    ? Promise.resolve(preFetchedHistory)
    : getConversationHistory(supabase, conversationId, historyWindow);

  const brochurePromise: Promise<boolean> = wantsBrochure
    ? sendBrochureInline(supabase, phone, env.fonnteApiKey).catch((e) => {
        console.warn('Booking Agent: brochure send failed:', (e as Error).message);
        return false;
      })
    : Promise.resolve(false);

  // Logging pesan user fire-and-forget — tidak ditunggu.
  void logMessage(supabase, conversationId, 'user', combinedMessage);

  const [messages, brochureSentInline, bookingContext] = await Promise.all([
    historyPromise,
    brochurePromise,
    getLatestBookingContextByPhone(supabase, phone).catch(() => null),
  ]);

  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.content !== combinedMessage) {
    messages.push({ role: 'user', content: combinedMessage });
  }

  // If brochure was sent, instruct AI to acknowledge briefly instead of redirecting elsewhere.
  if (brochureSentInline) {
    messages.push({
      role: 'system',
      content: 'CONTEXT: Brosur PDF kamar baru saja dikirim ke tamu via WhatsApp. JANGAN suruh tamu cek Instagram/website untuk foto. Cukup konfirmasi singkat bahwa brosur sudah dikirim, lalu tanyakan tipe kamar mana yang menarik atau tanggal menginapnya.',
    });
  }

  // Extract context (sync, in-memory)
  const extractedContext = extractConversationContext(messages) || {};
  // Booking dari DB adalah source of truth: jika tamu baru saja membuat booking
  // (lewat web/WA), data tersebut HARUS menang atas konteks lama dari history.
  // Field history hanya dipakai untuk slot yang tidak terisi dari booking.
  const conversationContext = { ...extractedContext, ...(bookingContext || {}) };

  // Jika ada booking recent (≤ 24 jam), inject hint agar AI tidak bertanya ulang
  // tanggal/kamar/harga yang baru saja disepakati.
  if (bookingContext?.last_booking_is_recent && bookingContext?.last_booking_code) {
    const room = bookingContext.last_booking_room || '-';
    const checkIn = bookingContext.last_booking_check_in || '-';
    const checkOut = bookingContext.last_booking_check_out || '-';
    const nights = bookingContext.last_booking_total_nights || '-';
    const price = bookingContext.last_booking_total_price
      ? `Rp${Number(bookingContext.last_booking_total_price).toLocaleString('id-ID')}`
      : '-';
    const status = bookingContext.last_booking_status || '-';
    const payStatus = bookingContext.last_booking_payment_status || '-';
    messages.push({
      role: 'system',
      content: `KONTEKS BOOKING TERBARU (baru dibuat <24 jam, JANGAN tanya ulang tanggal/kamar):\n` +
        `• Kode: ${bookingContext.last_booking_code}\n` +
        `• Kamar: ${room}\n` +
        `• Check-in: ${checkIn} → Check-out: ${checkOut} (${nights} malam)\n` +
        `• Total: ${price}\n` +
        `• Status: ${status} | Pembayaran: ${payStatus}\n` +
        `Lanjutkan percakapan berdasarkan booking ini. Jangan ulang menawarkan kamar lain kecuali tamu memintanya.`,
    });
  }

  trace?.info('Calling chatbot', { conversationId, contextKeys: Object.keys(conversationContext) });
  logAgentDecision(supabase, {
    trace_id: trace?.traceId, conversation_id: conversationId, phone_number: phone,
    from_agent: 'booking', to_agent: 'chatbot', reason: 'ai_conversation',
  });

  // Call chatbot
  const chatbotResponse = await fetch(`${env.supabaseUrl}/functions/v1/chatbot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.supabaseServiceKey}`,
      ...(trace?.headers() || {}),
    },
    body: JSON.stringify({
      messages, session_id: `wa_${phone}`, channel: 'whatsapp', conversationContext,
    }),
  });

  if (!chatbotResponse.ok) {
    throw new Error(`Chatbot error: ${chatbotResponse.status}`);
  }

  const chatbotData = await chatbotResponse.json();
  const aiMessage = chatbotData.choices?.[0]?.message;
  let aiResponse = aiMessage?.content || "";

  // Check if chatbot used tools internally (chatbot resolves tools and returns meta.tool_calls_used)
  const toolsUsed: string[] = chatbotData.meta?.tool_calls_used || [];
  const hasToolCalls = toolsUsed.length > 0;

  // Stuck response detector
  const stuckPatterns = /mohon\s+tunggu|akan\s+(saya\s+)?bantu\s+cek|saya\s+cek(kan)?\s+dulu|sebentar\s+ya/i;

  // Availability hallucination guard: user asking about availability/dates and AI claims full/available WITHOUT calling tool
  const userAsksAvailability = /\b(tersedia|available|kosong|ready|ada\s+kamar|cek\s+kamar|booking|pesan\s+kamar|nginap|menginap|check[\s-]?in|checkin|tanggal|besok|lusa|minggu\s+depan|tgl|malam\s+ini)\b/i.test(combinedMessage);
  const aiClaimsAvailability = /\b(full|penuh|habis|tidak\s+tersedia|tidak\s+ada\s+kamar|sold\s*out|fully\s*booked|tersedia|masih\s+ada|kosong|ready)\b/i.test(aiResponse);
  const usedAvailabilityTool = toolsUsed.includes('check_availability');
  const isAvailabilityHallucination = !usedAvailabilityTool && userAsksAvailability && aiClaimsAvailability;

  if (isAvailabilityHallucination) {
    console.log("⚠️ AVAILABILITY HALLUCINATION DETECTED - AI claimed availability without check_availability tool");
    await logMessage(supabase, conversationId, 'system', `[Availability guard triggered: AI said "${aiResponse.substring(0, 80)}..." without calling check_availability. Tools used: ${toolsUsed.join(', ') || 'none'}]`);
    try {
      const guardMessages = [
        ...messages,
        { role: 'assistant', content: aiResponse },
        { role: 'system', content: `Kamu menjawab tentang ketersediaan kamar TANPA memanggil tool check_availability. INI DILARANG KERAS karena bisa salah info ke tamu. SEKARANG WAJIB panggil tool check_availability dengan tanggal yang user sebutkan. Jangan balas text - LANGSUNG panggil tool check_availability!` }
      ];
      const guardResponse = await fetch(`${env.supabaseUrl}/functions/v1/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.supabaseServiceKey}` },
        body: JSON.stringify({ messages: guardMessages, session_id: `wa_${phone}`, channel: 'whatsapp', conversationContext }),
      });
      if (guardResponse.ok) {
        const guardData = await guardResponse.json();
        const guardContent = guardData.choices?.[0]?.message?.content;
        if (guardContent) aiResponse = guardContent;
      }
    } catch (guardError) {
      console.error('⚠️ Hallucination guard retry failed:', guardError);
    }
  }

  if (!hasToolCalls && !isAvailabilityHallucination && stuckPatterns.test(aiResponse)) {
    console.log("⚠️ STUCK RESPONSE DETECTED - retrying...");
    await logMessage(supabase, conversationId, 'system', `[Stuck retry triggered: AI said "${aiResponse.substring(0, 80)}..." without calling tools]`);
    try {
      const retryMessages = [
        ...messages,
        { role: 'assistant', content: aiResponse },
        { role: 'system', content: `Kamu baru saja bilang "${aiResponse.substring(0, 80)}..." tapi TIDAK memanggil tool check_availability. INI GAGAL. SEKARANG PANGGIL check_availability DENGAN TANGGAL YANG DISEBUTKAN USER. Jika user bilang "sehari" berarti 1 malam. Jangan balas text - LANGSUNG panggil tool!` }
      ];

      const retryResponse = await fetch(`${env.supabaseUrl}/functions/v1/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.supabaseServiceKey}` },
        body: JSON.stringify({ messages: retryMessages, session_id: `wa_${phone}`, channel: 'whatsapp', conversationContext }),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryContent = retryData.choices?.[0]?.message?.content;
        if (retryContent) aiResponse = retryContent;
      }
    } catch (retryError) {
      console.error('⚠️ Stuck retry failed:', retryError);
    }
  }

  // Smart fallback
  if (!aiResponse || aiResponse.trim() === '') {
    const greetingPattern = /^(p|pagi|siang|sore|malam|halo|hai|hi|hello|hallo|selamat|tes|test)/i;
    if (greetingPattern.test(normalizedMessage)) {
      aiResponse = `Halo! 👋 Saya ${personaName} dari Pomah Guesthouse. Ada yang bisa saya bantu?\n\nMau cek ketersediaan kamar atau ada pertanyaan lain? 🏨`;
    } else {
      aiResponse = "Maaf, saya tidak bisa memproses permintaan Anda saat ini. Silakan coba lagi atau hubungi admin. 🙏";
    }
  }

  // Sentiment detection (fire-and-forget)
  detectAndAlertNegativeSentiment(combinedMessage, phone, session?.guest_name, managerNumbers, env.fonnteApiKey, conversationId);

  // Log and send
  await logMessage(supabase, conversationId, 'assistant', aiResponse);
  const formattedResponse = formatForWhatsApp(aiResponse);
  console.log(`📤 Sending WhatsApp to: ${phone}`);

  const fonnteResult = await sendWhatsApp(phone, formattedResponse, env.fonnteApiKey);
  console.log("Fonnte result:", JSON.stringify(fonnteResult));

  if (fonnteResult.status === false) {
    console.error(`❌ Booking Agent: Failed to send WhatsApp to ${phone}: ${fonnteResult.detail || 'unknown'}`);
  }

  return new Response(JSON.stringify({
    status: "success", conversation_id: conversationId, response_length: formattedResponse.length,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
