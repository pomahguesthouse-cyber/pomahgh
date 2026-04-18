import type { SupabaseClient, EnvConfig, WhatsAppSession } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { formatForWhatsApp } from '../utils/format.ts';
import { ensureConversation, updateSession } from '../services/session.ts';
import { logMessage, getConversationHistory } from '../services/conversation.ts';
import { sendWhatsApp, sendWhatsAppFile } from '../services/fonnte.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';

// Detect requests for room photos / brochure
const ROOM_PHOTO_RE = /\b(foto|gambar|pic(?:ture)?|photo|liat|lihat|tampilan|brosur|brochure|katalog|preview)\b.*\b(kamar|room|deluxe|single|family|grand|standard|superior)\b|\b(kamar|room|deluxe|single|family|grand)\b.*\b(foto|gambar|pic(?:ture)?|photo|brosur|brochure|katalog)\b/i;

/**
 * Try to send the room brochure PDF if guest asks about room photos.
 * Returns true if brochure was sent (so caller can adjust AI response).
 */
async function trySendRoomBrochure(
  supabase: SupabaseClient,
  phone: string,
  message: string,
  env: EnvConfig,
): Promise<boolean> {
  if (!ROOM_PHOTO_RE.test(message)) return false;

  // Lookup brochure file in knowledge base
  const { data: kb } = await supabase
    .from('chatbot_knowledge_base')
    .select('title, source_url, original_filename')
    .ilike('title', '%brosur%kamar%')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!kb?.source_url) {
    console.log('📕 No active room brochure found in knowledge_base');
    return false;
  }

  // Generate signed URL (bucket is private, valid 1 hour)
  const { data: signed, error: signErr } = await supabase
    .storage
    .from('knowledge-base')
    .createSignedUrl(kb.source_url, 3600);

  if (signErr || !signed?.signedUrl) {
    console.error('❌ Failed to sign brochure URL:', signErr);
    return false;
  }

  const filename = kb.original_filename || 'brosur-kamar-pomah-guesthouse.pdf';
  const caption = `📕 Berikut brosur kamar Pomah Guesthouse ya kak, lengkap dengan foto & detail tiap tipe kamar 😊`;
  const result = await sendWhatsAppFile(phone, signed.signedUrl, caption, env.fonnteApiKey, filename);

  if (result.status === false) {
    console.error(`❌ Failed to send brochure to ${phone}: ${result.detail}`);
    return false;
  }
  console.log(`✅ Brochure PDF sent to ${phone}`);
  return true;
}

/**
 * FAQ Agent: Handles general guest questions WITHOUT tools (faster, cheaper).
 * Uses AI with persona + knowledge base but no tool calls.
 * For booking/availability queries, returns null to fallback to Booking Agent.
 */
export async function handleGuestFAQ(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  message: string,
  conversationId: string,
  personaName: string,
  env: EnvConfig,
  trace?: TraceContext,
): Promise<Response> {
  console.log(`❓ FAQ AGENT - handling guest FAQ for ${phone}`);

  const convId = conversationId || await ensureConversation(supabase, session, phone);
  await logMessage(supabase, convId, 'user', message);
  await updateSession(supabase, phone, convId, false);

  // === Send room brochure PDF if user asks about room photos ===
  const brochureSent = await trySendRoomBrochure(supabase, phone, message, env);

  // Get conversation history
  const messages = await getConversationHistory(supabase, convId);
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.content !== message) {
    messages.push({ role: 'user', content: message });
  }

  // If brochure was sent, inject context so AI doesn't redirect to Instagram
  if (brochureSent) {
    messages.push({
      role: 'system',
      content: 'CONTEXT: Brosur PDF kamar baru saja dikirim ke tamu via WhatsApp. JANGAN suruh tamu cek Instagram untuk foto. Cukup konfirmasi singkat bahwa brosur sudah dikirim dan tanyakan apakah ada tipe kamar yang menarik untuk dipesan.',
    });
  }

  try {
    // Call chatbot WITHOUT tools for fast FAQ response
    const chatbotResponse = await fetch(`${env.supabaseUrl}/functions/v1/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.supabaseServiceKey}`,
        ...(trace?.headers() || {}),
      },
      body: JSON.stringify({
        messages,
        session_id: `wa_${phone}`,
        channel: 'whatsapp',
        faq_mode: true, // Signal to chatbot to skip tools
      }),
    });

    if (!chatbotResponse.ok) {
      throw new Error(`Chatbot FAQ error: ${chatbotResponse.status}`);
    }

    const chatbotData = await chatbotResponse.json();
    let aiResponse = chatbotData.choices?.[0]?.message?.content || '';

    // If AI tried to use tools (shouldn't happen in faq_mode but safety check)
    const aiMessage = chatbotData.choices?.[0]?.message;
    if (aiMessage?.tool_calls?.length > 0) {
      console.log('⚠️ FAQ Agent: AI requested tools, escalating to Booking Agent');
      return new Response(JSON.stringify({ status: "faq_escalate_to_booking" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!aiResponse || aiResponse.trim() === '') {
      aiResponse = brochureSent
        ? `Brosur sudah saya kirim ya kak 😊 Ada tipe kamar yang menarik?`
        : `Halo! Saya ${personaName} dari Pomah Guesthouse 😊\n\nSilakan tanyakan apa saja seputar fasilitas, lokasi, atau layanan kami!`;
    }

    await logMessage(supabase, convId, 'assistant', aiResponse);
    const formattedResponse = formatForWhatsApp(aiResponse);
    const fonnteResult = await sendWhatsApp(phone, formattedResponse, env.fonnteApiKey);

    if (fonnteResult.status === false) {
      console.error(`❌ FAQ Agent: Failed to send WhatsApp to ${phone}: ${fonnteResult.detail || 'unknown'}`);
    }

    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone, conversation_id: convId,
      from_agent: 'faq', reason: brochureSent ? 'faq_answered_with_brochure' : 'faq_answered',
    });

    return new Response(JSON.stringify({
      status: "faq_agent",
      conversation_id: convId,
      brochure_sent: brochureSent,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('❌ FAQ Agent error:', error);
    // Fallback response
    const fallback = formatForWhatsApp(
      `Halo! Saya ${personaName} dari Pomah Guesthouse 😊\n\nUntuk pertanyaan umum, silakan langsung tanyakan saja ya! Saya siap membantu seputar kamar, fasilitas, lokasi, dan booking.`
    );
    await logMessage(supabase, convId, 'assistant', fallback);
    const fallbackResult = await sendWhatsApp(phone, fallback, env.fonnteApiKey);

    if (fallbackResult.status === false) {
      console.error(`❌ FAQ fallback: Failed to send WhatsApp to ${phone}: ${fallbackResult.detail || 'unknown'}`);
    }

    return new Response(JSON.stringify({ status: "faq_fallback", conversation_id: convId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
