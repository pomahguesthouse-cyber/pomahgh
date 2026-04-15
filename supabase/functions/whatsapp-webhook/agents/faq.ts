import type { SupabaseClient, EnvConfig, WhatsAppSession } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { formatForWhatsApp } from '../utils/format.ts';
import { ensureConversation, updateSession } from '../services/session.ts';
import { logMessage } from '../services/conversation.ts';

/**
 * FAQ Agent: Handles general guest questions (non-booking).
 * Provides greeting, facility info, and fallback responses for guests.
 */
export async function handleGuestFAQ(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  message: string,
  conversationId: string,
  personaName: string,
  env: EnvConfig,
): Promise<Response> {
  console.log(`❓ FAQ AGENT - handling guest FAQ for ${phone}`);

  const convId = conversationId || await ensureConversation(supabase, session, phone);
  await logMessage(supabase, convId, 'user', message);
  await updateSession(supabase, phone, convId, true);

  // Default friendly fallback — in practice, most guest messages go through
  // the Booking Agent which handles AI conversation. This agent serves as
  // a safety net for edge cases.
  const fallbackResponse = formatForWhatsApp(
    `Halo! Saya ${personaName} dari Pomah Guesthouse 😊\n\n` +
    `Untuk pertanyaan umum, silakan langsung tanyakan saja ya! ` +
    `Saya siap membantu seputar kamar, fasilitas, lokasi, dan booking.`
  );

  await logMessage(supabase, convId, 'assistant', fallbackResponse);

  return new Response(JSON.stringify({
    status: "faq_agent",
    conversation_id: convId,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
