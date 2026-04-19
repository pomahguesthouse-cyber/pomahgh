import type { SupabaseClient, EnvConfig, ToolCall } from '../types.ts';
import { formatForWhatsApp } from '../utils/format.ts';
import { logMessage, getConversationHistory } from '../services/conversation.ts';
import { sendWhatsApp } from '../services/fonnte.ts';
import { extractConversationContext, getLatestBookingContextByPhone } from '../services/context.ts';
import { batchMessages } from '../middleware/messageBatcher.ts';
import { detectAndAlertNegativeSentiment } from '../middleware/sentiment.ts';
import { corsHeaders, type ManagerInfo, type WhatsAppSession } from '../types.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision, logToolExecution } from '../../_shared/agentLogger.ts';

/** Execute tool calls in parallel */
async function executeToolCalls(
  toolCalls: ToolCall[],
  env: EnvConfig,
  label = '',
  supabase?: SupabaseClient,
  traceId?: string,
  conversationId?: string,
): Promise<Array<{ role: string; content: string; tool_call_id: string }>> {
  const prefix = label ? `[${label}] ` : '';
  return Promise.all(
    toolCalls.map(async (toolCall) => {
      console.log(`${prefix}Executing tool: ${toolCall.function.name}`);
      const toolStart = Date.now();
      try {
        const toolResponse = await fetch(`${env.supabaseUrl}/functions/v1/chatbot-tools`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.supabaseServiceKey}`,
            'X-Internal-Secret': env.chatbotToolsInternalSecret,
          },
          body: JSON.stringify({
            tool_name: toolCall.function.name,
            parameters: JSON.parse(toolCall.function.arguments || '{}'),
          }),
        });
        const toolResult = await toolResponse.json();
        console.log(`${prefix}Tool ${toolCall.function.name} result:`, JSON.stringify(toolResult).substring(0, 200));
        if (supabase) {
          logToolExecution(supabase, {
            trace_id: traceId, conversation_id: conversationId,
            tool_name: toolCall.function.name, arguments: JSON.parse(toolCall.function.arguments || '{}'),
            result_status: 'success', result_summary: JSON.stringify(toolResult).substring(0, 200),
            duration_ms: Date.now() - toolStart, agent_name: 'booking',
          });
        }
        return { role: 'tool', content: JSON.stringify(toolResult), tool_call_id: toolCall.id };
      } catch (toolError) {
        console.error(`${prefix}Tool ${toolCall.function.name} error:`, toolError);
        if (supabase) {
          logToolExecution(supabase, {
            trace_id: traceId, conversation_id: conversationId,
            tool_name: toolCall.function.name, result_status: 'failed',
            error_message: (toolError as Error).message, duration_ms: Date.now() - toolStart,
            agent_name: 'booking',
          });
        }
        return { role: 'tool', content: JSON.stringify({ error: 'Tool execution failed' }), tool_call_id: toolCall.id };
      }
    })
  );
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
): Promise<Response> {
  // Update session
  await supabase.from('whatsapp_sessions').upsert({
    phone_number: phone, conversation_id: conversationId,
    last_message_at: new Date().toISOString(), is_active: true, session_type: 'guest',
  }, { onConflict: 'phone_number' });

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

  await logMessage(supabase, conversationId, 'user', combinedMessage);

  // Get history and build messages
  const messages = await getConversationHistory(supabase, conversationId);
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.content !== combinedMessage) {
    messages.push({ role: 'user', content: combinedMessage });
  }

  // Extract context
  const extractedContext = extractConversationContext(messages) || {};
  const bookingContext = await getLatestBookingContextByPhone(supabase, phone);
  const conversationContext = { ...(bookingContext || {}), ...extractedContext };
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
  let aiMessage = chatbotData.choices?.[0]?.message;
  let aiResponse = aiMessage?.content || "";

  // Stuck response detector
  const stuckPatterns = /mohon\s+tunggu|akan\s+(saya\s+)?bantu\s+cek|saya\s+cek(kan)?\s+dulu|sebentar\s+ya/i;
  const hasToolCalls = aiMessage?.tool_calls && aiMessage.tool_calls.length > 0;

  // Availability hallucination guard: user asking about availability/dates and AI claims full/available WITHOUT calling tool
  const userAsksAvailability = /\b(tersedia|available|kosong|ready|ada\s+kamar|cek\s+kamar|booking|pesan\s+kamar|nginap|menginap|check[\s-]?in|checkin|tanggal|besok|lusa|minggu\s+depan|tgl|malam\s+ini)\b/i.test(combinedMessage);
  const aiClaimsAvailability = /\b(full|penuh|habis|tidak\s+tersedia|tidak\s+ada\s+kamar|sold\s*out|fully\s*booked|tersedia|masih\s+ada|kosong|ready)\b/i.test(aiResponse);
  const isAvailabilityHallucination = !hasToolCalls && userAsksAvailability && aiClaimsAvailability;

  if (isAvailabilityHallucination) {
    console.log("⚠️ AVAILABILITY HALLUCINATION DETECTED - AI claimed availability without check_availability tool");
    await logMessage(supabase, conversationId, 'system', `[Availability guard triggered: AI said "${aiResponse.substring(0, 80)}..." without calling check_availability]`);
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
      const guardMessage = guardData.choices?.[0]?.message;
      if (guardMessage?.tool_calls?.length > 0) {
        console.log(`✅ Availability guard triggered ${guardMessage.tool_calls.length} tool call(s)`);
        const guardToolResults = await executeToolCalls(guardMessage.tool_calls, env, 'avail-guard', supabase, trace?.traceId, conversationId);
        const finalGuardResponse = await fetch(`${env.supabaseUrl}/functions/v1/chatbot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.supabaseServiceKey}` },
          body: JSON.stringify({
            messages: [
              ...guardMessages,
              { role: 'assistant', content: guardMessage.content, tool_calls: guardMessage.tool_calls },
              ...guardToolResults,
            ],
            session_id: `wa_${phone}`, channel: 'whatsapp', conversationContext,
          }),
        });
        if (finalGuardResponse.ok) {
          const finalGuardData = await finalGuardResponse.json();
          const guardContent = finalGuardData.choices?.[0]?.message?.content;
          if (guardContent) aiResponse = guardContent;
        }
      } else if (guardMessage?.content) {
        aiResponse = guardMessage.content;
      }
    }
  }

  if (!hasToolCalls && !isAvailabilityHallucination && stuckPatterns.test(aiResponse)) {
    console.log("⚠️ STUCK RESPONSE DETECTED - retrying...");
    // Log retry attempt for audit trail
    await logMessage(supabase, conversationId, 'system', `[Stuck retry triggered: AI said "${aiResponse.substring(0, 80)}..." without calling tools]`);
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
      const retryMessage = retryData.choices?.[0]?.message;

      if (retryMessage?.tool_calls?.length > 0) {
        console.log(`✅ Retry triggered ${retryMessage.tool_calls.length} tool call(s)`);
        const retryToolResults = await executeToolCalls(retryMessage.tool_calls, env, 'retry', supabase, trace?.traceId, conversationId);

        const finalRetryResponse = await fetch(`${env.supabaseUrl}/functions/v1/chatbot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.supabaseServiceKey}` },
          body: JSON.stringify({
            messages: [
              ...retryMessages,
              { role: 'assistant', content: retryMessage.content, tool_calls: retryMessage.tool_calls },
              ...retryToolResults,
            ],
            session_id: `wa_${phone}`, channel: 'whatsapp', conversationContext,
          }),
        });

        if (finalRetryResponse.ok) {
          const finalRetryData = await finalRetryResponse.json();
          const retryContent = finalRetryData.choices?.[0]?.message?.content;
          if (retryContent) aiResponse = retryContent;
        }
      } else if (retryMessage?.content) {
        aiResponse = retryMessage.content;
      }
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
