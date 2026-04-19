import type { SupabaseClient, ManagerInfo, EnvConfig, WhatsAppSession } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { formatForWhatsApp } from '../utils/format.ts';
import { ensureConversation, updateSession } from '../services/session.ts';
import { logMessage, getConversationHistory } from '../services/conversation.ts';
import { sendWhatsApp } from '../services/fonnte.ts';

/**
 * Manager Agent: Khusus menangani chat dari pengelola/manager.
 * Routes pesan ke admin-chatbot edge function dengan konteks manager.
 */
export async function handleManagerChat(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  normalizedMessage: string,
  managerInfo: ManagerInfo,
  env: EnvConfig,
): Promise<Response> {
  console.log(`🏢 MANAGER AGENT - handling chat for ${phone} (${managerInfo.name}, role: ${managerInfo.role || 'super_admin'})`);

  const internalSecret = Deno.env.get("WHATSAPP_INTERNAL_SECRET") || Deno.env.get("CHATBOT_TOOLS_INTERNAL_SECRET");
  if (!internalSecret) {
    console.error("Missing internal WhatsApp/admin secret");
    return new Response(JSON.stringify({ status: "error", reason: "internal secret not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Ensure conversation & log message
  const convId = await ensureConversation(supabase, session, phone);
  await logMessage(supabase, convId, 'user', normalizedMessage);
  await updateSession(supabase, phone, convId, false, 'admin');

  // Build conversation history
  const messages = await getConversationHistory(supabase, convId);
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.content !== normalizedMessage) {
    messages.push({ role: 'user', content: normalizedMessage });
  }

  try {
    // Route to admin-chatbot with manager context headers
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

    // Parse response as JSON
    const adminData = await adminResponse.json();
    let aiResponse = '';

    // Handle both streaming text and structured JSON responses
    if (typeof adminData === 'string') {
      aiResponse = adminData;
    } else if (adminData?.choices?.[0]?.message?.content) {
      aiResponse = adminData.choices[0].message.content;
    } else if (adminData?.response) {
      aiResponse = adminData.response;
    } else {
      // Fallback: try to read as text from a clone
      aiResponse = JSON.stringify(adminData);
    }

    aiResponse = aiResponse.trim() || "Maaf, terjadi kesalahan. Silakan coba lagi.";
    const formattedResponse = formatForWhatsApp(aiResponse);

    // Log & send
    await logMessage(supabase, convId, 'assistant', formattedResponse);
    const sendResult = await sendWhatsApp(phone, formattedResponse, env.fonnteApiKey);
    if (sendResult.status === false) {
      console.error(`❌ Manager Agent: Failed to send WhatsApp to ${phone}: ${sendResult.detail || 'unknown'}`);
    }

    return new Response(JSON.stringify({
      status: "manager_agent",
      conversation_id: convId,
      manager_name: managerInfo.name,
      manager_role: managerInfo.role || 'super_admin',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Manager agent error:", error);
    return new Response(JSON.stringify({ status: "error", error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
