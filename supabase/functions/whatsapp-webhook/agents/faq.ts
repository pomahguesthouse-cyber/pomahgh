import type { SupabaseClient, EnvConfig, WhatsAppSession } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { formatForWhatsApp } from '../utils/format.ts';
import { ensureConversation, updateSession } from '../services/session.ts';
import { logMessage, getConversationHistory } from '../services/conversation.ts';
import { sendWhatsApp } from '../services/fonnte.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';

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

  // Get conversation history
  const messages = await getConversationHistory(supabase, convId);
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.content !== message) {
    messages.push({ role: 'user', content: message });
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
      aiResponse = `Halo! Saya ${personaName} dari Pomah Guesthouse 😊\n\nSilakan tanyakan apa saja seputar fasilitas, lokasi, atau layanan kami!`;
    }

    await logMessage(supabase, convId, 'assistant', aiResponse);
    const formattedResponse = formatForWhatsApp(aiResponse);
    const fonnteResult = await sendWhatsApp(phone, formattedResponse, env.fonnteApiKey);

    if (fonnteResult.status === false) {
      console.error(`❌ FAQ Agent: Failed to send WhatsApp to ${phone}: ${fonnteResult.detail || 'unknown'}`);
    }

    logAgentDecision(supabase, {
      trace_id: trace?.traceId, phone_number: phone, conversation_id: convId,
      from_agent: 'faq', reason: 'faq_answered',
    });

    return new Response(JSON.stringify({
      status: "faq_agent",
      conversation_id: convId,
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
