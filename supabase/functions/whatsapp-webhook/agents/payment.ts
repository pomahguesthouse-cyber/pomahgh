import type { SupabaseClient, EnvConfig, ManagerInfo, WhatsAppSession, ToolCall } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { formatForWhatsApp } from '../utils/format.ts';
import { logMessage, getConversationHistory } from '../services/conversation.ts';
import { sendWhatsApp } from '../services/fonnte.ts';
import { extractConversationContext, getLatestBookingContextByPhone } from '../services/context.ts';
import { batchMessages } from '../middleware/messageBatcher.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision, logToolExecution } from '../../_shared/agentLogger.ts';

/** Execute tool calls returned by chatbot */
async function executeToolCalls(
  toolCalls: ToolCall[],
  env: EnvConfig,
  supabase?: SupabaseClient,
  traceId?: string,
  conversationId?: string,
): Promise<Array<{ role: string; content: string; tool_call_id: string }>> {
  return Promise.all(
    toolCalls.map(async (toolCall) => {
      console.log(`[Payment] Executing tool: ${toolCall.function.name}`);
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
        console.log(`[Payment] Tool ${toolCall.function.name} result:`, JSON.stringify(toolResult).substring(0, 200));
        if (supabase) {
          logToolExecution(supabase, {
            trace_id: traceId, conversation_id: conversationId,
            tool_name: toolCall.function.name, arguments: JSON.parse(toolCall.function.arguments || '{}'),
            result_status: 'success', result_summary: JSON.stringify(toolResult).substring(0, 200),
            duration_ms: Date.now() - toolStart, agent_name: 'payment',
          });
        }
        return { role: 'tool', content: JSON.stringify(toolResult), tool_call_id: toolCall.id };
      } catch (toolError) {
        console.error(`[Payment] Tool ${toolCall.function.name} error:`, toolError);
        if (supabase) {
          logToolExecution(supabase, {
            trace_id: traceId, conversation_id: conversationId,
            tool_name: toolCall.function.name, result_status: 'failed',
            error_message: (toolError as Error).message, duration_ms: Date.now() - toolStart,
            agent_name: 'payment',
          });
        }
        return { role: 'tool', content: JSON.stringify({ error: 'Tool execution failed' }), tool_call_id: toolCall.id };
      }
    })
  );
}

/** Keywords that indicate payment-related messages */
const PAYMENT_PATTERNS = /\b(bukti\s+(?:transfer|bayar|pembayaran|tf)|sudah\s+(?:bayar|transfer|tf)|sudah\s+di\s*(?:bayar|transfer)|konfirmasi\s+(?:bayar|pembayaran|transfer)|status\s+(?:bayar|pembayaran)|invoice|tagihan|kwitansi|receipt|nomor\s+rekening|rekening\s+bank|rekening(?:nya)?|no\s*(?:rek|rekening)|cara\s+bayar|metode\s+(?:bayar|pembayaran)|dp|uang\s+muka|lunas|pelunasan|sisa\s+bayar|total\s+bayar|transfer\s+ke\s+mana|bayar\s+(?:kemana|ke\s+mana|gimana|bagaimana)|mau\s+bayar|mau\s+transfer|kirim\s+bukti|upload\s+bukti)\b/i;

export function isPaymentMessage(message: string): boolean {
  return PAYMENT_PATTERNS.test(message);
}

/**
 * Payment Agent: Handle payment-related conversations.
 * Routes through chatbot AI with payment-specific context.
 */
export async function handlePayment(
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
  console.log(`💰 Payment Agent: phone=${phone}`);

  // Update session
  await supabase.from('whatsapp_sessions').upsert({
    phone_number: phone, conversation_id: conversationId,
    last_message_at: new Date().toISOString(), is_active: true, session_type: 'guest',
  }, { onConflict: 'phone_number' });

  // Message batching
  const batchedMessages = await batchMessages(supabase, phone, normalizedMessage);
  if (batchedMessages === null) {
    return new Response(JSON.stringify({ status: 'batched', phone }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const combinedMessage = batchedMessages.join('\n');
  await logMessage(supabase, conversationId, 'user', combinedMessage);

  // Get history and context
  const messages = await getConversationHistory(supabase, conversationId);
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.content !== combinedMessage) {
    messages.push({ role: 'user', content: combinedMessage });
  }

  const extractedContext = extractConversationContext(messages) || {};
  const bookingContext = await getLatestBookingContextByPhone(supabase, phone);
  const conversationContext = {
    ...(bookingContext || {}),
    ...extractedContext,
    payment_focus: true, // Signal to chatbot to prioritize payment tools
  };

  logAgentDecision(supabase, {
    trace_id: trace?.traceId, conversation_id: conversationId, phone_number: phone,
    from_agent: 'payment', to_agent: 'chatbot', reason: 'payment_conversation',
  });

  // Call chatbot with payment context
  try {
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
  let aiResponse = aiMessage?.content || '';

  // Tool execution loop (max 3 rounds)
  let toolRound = 0;
  const MAX_TOOL_ROUNDS = 3;
  let currentMessages = [...messages];

  while (aiMessage?.tool_calls?.length > 0 && toolRound < MAX_TOOL_ROUNDS) {
    toolRound++;
    console.log(`💰 Payment Agent: Tool round ${toolRound}, ${aiMessage.tool_calls.length} tool(s)`);

    const toolResults = await executeToolCalls(
      aiMessage.tool_calls, env, supabase, trace?.traceId, conversationId,
    );

    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: aiMessage.content || '', tool_calls: aiMessage.tool_calls },
      ...toolResults,
    ];

    const followUpResponse = await fetch(`${env.supabaseUrl}/functions/v1/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.supabaseServiceKey}`,
        ...(trace?.headers() || {}),
      },
      body: JSON.stringify({
        messages: currentMessages, session_id: `wa_${phone}`, channel: 'whatsapp', conversationContext,
      }),
    });

    if (!followUpResponse.ok) {
      console.error(`Payment Agent: Follow-up chatbot error ${followUpResponse.status}`);
      break;
    }

    const followUpData = await followUpResponse.json();
    aiMessage = followUpData.choices?.[0]?.message;
    aiResponse = aiMessage?.content || aiResponse;
  }

  if (!aiResponse || aiResponse.trim() === '') {
    aiResponse = 'Mohon maaf, saya belum bisa memproses permintaan pembayaran Anda saat ini. Silakan coba lagi atau hubungi admin kami. 🙏';
  }

  // Log and send
  await logMessage(supabase, conversationId, 'assistant', aiResponse);
  const formattedResponse = formatForWhatsApp(aiResponse);
  const fonnteResult = await sendWhatsApp(phone, formattedResponse, env.fonnteApiKey);

  if (fonnteResult.status === false) {
    console.error(`❌ Payment Agent: Failed to send WhatsApp to ${phone}: ${fonnteResult.detail || 'unknown'}`);
  }

  return new Response(JSON.stringify({
    status: 'payment_handled', conversation_id: conversationId,
    response_length: formattedResponse.length,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  } catch (error) {
    console.error(`❌ Payment Agent error for ${phone}:`, error);
    const fallbackMsg = 'Mohon maaf, terjadi kendala saat memproses pembayaran. Silakan coba lagi atau hubungi admin kami. 🙏';
    await sendWhatsApp(phone, fallbackMsg, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: 'payment_error', error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
