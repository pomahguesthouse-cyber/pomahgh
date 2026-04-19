import type { SupabaseClient, EnvConfig, WhatsAppSession } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { isLikelyPersonName } from '../utils/format.ts';
import { logMessage } from '../services/conversation.ts';
import { sendWhatsApp } from '../services/fonnte.ts';

/**
 * Intent Agent: Handle name collection flow for new/stale sessions.
 * Returns Response if fully handled (name captured or greeting sent), null to continue to AI.
 */
export async function handleNameCollection(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  conversationId: string,
  rawMessage: string,
  normalizedMessage: string,
  isNewSession: boolean,
  personaName: string,
  env: EnvConfig,
): Promise<Response | null> {
  // New session flow
  if (isNewSession) {
    console.log(`🆕 New session for ${phone}`);
    const questionPatterns = /[?？]|berapa|harga|kamar|booking|check.?in|check.?out|tersedia|available|promo|fasilitas|alamat|lokasi|wifi|bayar|transfer|cancel|batal|kapan|bagaimana|gimana|apakah|bisa.{1,20}(kamar|booking|pesan|check)|ada.{1,20}(kamar|promo|diskon)|mau.{1,20}(pesan|booking|menginap|nginap)|ingin|cari|pesan\s+kamar|sewa|tarif|biaya|diskon|info\s+(kamar|harga|booking)|informasi/i;
    const isQuestion = questionPatterns.test(normalizedMessage);

    if (isQuestion) {
      console.log(`⏭️ First message is a question - bypassing name prompt`);
      const genericName = `Tamu WA ${phone.slice(-4)}`;
      await supabase.from('whatsapp_sessions').upsert({
        phone_number: phone, conversation_id: conversationId,
        last_message_at: new Date().toISOString(), is_active: true,
        session_type: 'guest', awaiting_name: false, guest_name: genericName,
      }, { onConflict: 'phone_number' });

      if (conversationId) {
        // NOTE: guest_email field repurposed for guest display name (schema legacy)
        await supabase.from('chat_conversations').update({ guest_email: `${genericName} (WA: ${phone})` }).eq('id', conversationId);
      }
      return null; // Fall through to AI
    }

    // Ask for name
    await supabase.from('whatsapp_sessions').upsert({
      phone_number: phone, conversation_id: conversationId,
      last_message_at: new Date().toISOString(), is_active: true,
      session_type: 'guest', awaiting_name: true, guest_name: null,
    }, { onConflict: 'phone_number' });

    await logMessage(supabase, conversationId, 'user', normalizedMessage);
    const greetingMsg = `Halo! 👋 Saya ${personaName} dari Pomah Guesthouse. Boleh saya tahu nama Anda?`;
    await logMessage(supabase, conversationId, 'assistant', greetingMsg);
    await sendWhatsApp(phone, greetingMsg, env.fonnteApiKey);

    return new Response(JSON.stringify({ status: "awaiting_name", conversation_id: conversationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Awaiting name flow
  if (session?.awaiting_name) {
    console.log(`📝 Awaiting name for ${phone}: "${rawMessage}"`);
    const guestNameCandidate = rawMessage.trim();

    if (!isLikelyPersonName(guestNameCandidate)) {
      console.log(`⏭️ Not a valid name - bypassing`);
      const genericName = `Tamu WA ${phone.slice(-4)}`;
      await supabase.from('whatsapp_sessions').update({
        guest_name: genericName, awaiting_name: false, last_message_at: new Date().toISOString(),
      }).eq('phone_number', phone);

      if (conversationId) {
        // NOTE: guest_email field repurposed for guest display name (schema legacy)
        await supabase.from('chat_conversations').update({ guest_email: `${genericName} (WA: ${phone})` }).eq('id', conversationId);
      }
      return null; // Fall through to AI
    }

    // Valid name
    await supabase.from('whatsapp_sessions').update({
      guest_name: guestNameCandidate, awaiting_name: false, last_message_at: new Date().toISOString(),
    }).eq('phone_number', phone);

    if (conversationId) {
      // NOTE: guest_email field repurposed for guest display name (schema legacy)
      await supabase.from('chat_conversations').update({ guest_email: `${guestNameCandidate} (WA: ${phone})` }).eq('id', conversationId);
    }

    await logMessage(supabase, conversationId, 'user', guestNameCandidate);
    const confirmMsg = `Terima kasih, Kak ${guestNameCandidate}! 😊 Saya ${personaName} dari Pomah Guesthouse. Ada yang bisa saya bantu hari ini?`;
    await logMessage(supabase, conversationId, 'assistant', confirmMsg);
    await sendWhatsApp(phone, confirmMsg, env.fonnteApiKey);

    return new Response(JSON.stringify({ status: "name_captured", guest_name: guestNameCandidate, conversation_id: conversationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return null;
}
