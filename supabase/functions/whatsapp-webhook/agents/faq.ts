import type { SupabaseClient, ManagerInfo, EnvConfig } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { formatForWhatsApp } from '../utils/format.ts';
import { ensureConversation, updateSession } from '../services/session.ts';
import { logMessage, getConversationHistory } from '../services/conversation.ts';
import type { WhatsAppSession } from '../types.ts';

/**
 * Handle manager mode: route messages to admin-chatbot.
 */
export async function handleManagerMessage(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  normalizedMessage: string,
  managerInfo: ManagerInfo,
  env: EnvConfig,
): Promise<Response> {
  console.log(`📱 MANAGER MODE - routing to admin-chatbot for ${phone} (${managerInfo.name})`);
  const internalSecret = Deno.env.get("WHATSAPP_INTERNAL_SECRET") || Deno.env.get("CHATBOT_TOOLS_INTERNAL_SECRET");

  if (!internalSecret) {
    console.error("Missing internal WhatsApp/admin secret");
    return new Response(JSON.stringify({ status: "error", reason: "internal secret not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const convId = await ensureConversation(supabase, session, phone);
  await logMessage(supabase, convId, 'user', normalizedMessage);
  await updateSession(supabase, phone, convId, false, 'admin');

  const messages = await getConversationHistory(supabase, convId);
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.content !== normalizedMessage) {
    messages.push({ role: 'user', content: normalizedMessage });
  }

  try {
    const adminResponse = await fetch(`${env.supabaseUrl}/functions/v1/admin-chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.supabaseServiceKey}`,
        'X-WhatsApp-Source': 'true',
        'X-WhatsApp-Phone': phone,
        'X-Manager-Name': managerInfo.name || 'Manager',
        'X-Manager-Role': managerInfo.role || 'super_admin',
        'X-Internal-Secret': internalSecret,
      },
      body: JSON.stringify({ messages }),
    });

    if (!adminResponse.ok) {
      throw new Error(`Admin chatbot error: ${adminResponse.status}`);
    }

    const reader = adminResponse.body?.getReader();
    const decoder = new TextDecoder();
    let aiResponse = '';
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiResponse += decoder.decode(value, { stream: true });
      }
    }
    aiResponse = aiResponse.trim() || "Maaf, terjadi kesalahan. Silakan coba lagi.";
    const formattedResponse = formatForWhatsApp(aiResponse);

    await logMessage(supabase, convId, 'assistant', formattedResponse);

    const sendResponse = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': env.fonnteApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: phone, message: formattedResponse }),
    });
    const sendResult = await sendResponse.json();
    console.log("Fonnte send result:", JSON.stringify(sendResult));

    return new Response(JSON.stringify({ status: "manager_mode", conversation_id: convId, manager_name: managerInfo.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Manager mode error:", error);
    return new Response(JSON.stringify({ status: "error", error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
