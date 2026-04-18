import type { SupabaseClient, EnvConfig, WhatsAppSession } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { ensureConversation, updateSession } from '../services/session.ts';
import { logMessage } from '../services/conversation.ts';
import { sendWhatsApp, sendWhatsAppFile } from '../services/fonnte.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';

/**
 * Detect requests for room photos / brochure / pictures.
 * Matches messages like:
 *   - "ada foto kamar?"
 *   - "bisa lihat foto kamar?"
 *   - "ada gambar kamarnya?"
 *   - "ada brosur?"
 *   - "boleh minta fotonya?"
 *   - "fotonya ada?"
 *   - "ada contoh gambarnya?"
 */
const PHOTO_WORDS = /(foto|fotonya|gambar|gambarnya|pic(?:ture)?|photo|brosur|brochure|katalog|preview)/i;
const ROOM_WORDS = /(kamar|kamarnya|room|rooms|deluxe|single|family|grand|standard|superior)/i;

export function isRoomPhotoRequest(message: string): boolean {
  const m = message.toLowerCase();
  if (!PHOTO_WORDS.test(m)) return false;
  // If they ask for "brosur" / "katalog" / "brochure", it's enough on its own.
  if (/(brosur|brochure|katalog)/i.test(m)) return true;
  // Otherwise require a room-context word OR a generic short ask
  // ("ada fotonya?", "boleh minta fotonya?", "ada contoh gambarnya?").
  if (ROOM_WORDS.test(m)) return true;
  if (/(ada\s+(?:foto|gambar|fotonya|gambarnya|contoh\s+(?:foto|gambar)))/i.test(m)) return true;
  if (/(minta|liat|lihat|kirim|share|tunjuk)\s+(?:foto|gambar|fotonya|gambarnya)/i.test(m)) return true;
  return false;
}

/**
 * Fetch room brochure from knowledge base and send it via WhatsApp.
 * Returns true on success.
 */
export async function sendRoomBrochure(
  supabase: SupabaseClient,
  phone: string,
  env: EnvConfig,
): Promise<boolean> {
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
 * Fast-path handler: send brochure PDF + a short follow-up text,
 * bypassing intent detection and AI calls entirely.
 */
export async function handleRoomPhotoRequest(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  message: string,
  conversationId: string,
  _personaName: string,
  env: EnvConfig,
  trace?: TraceContext,
): Promise<Response> {
  const convId = conversationId || await ensureConversation(supabase, session, phone);
  await logMessage(supabase, convId, 'user', message);
  await updateSession(supabase, phone, convId, false);

  const brochureSent = await sendRoomBrochure(supabase, phone, env);

  let followUp: string;
  if (brochureSent) {
    followUp = `Brosur sudah saya kirim ya kak 😊 Ada tipe kamar yang menarik untuk dipesan?`;
  } else {
    // Fallback if brochure not available
    followUp = `Mohon maaf kak, brosur belum bisa saya kirim saat ini. Untuk foto kamar bisa cek Instagram kami @pomahguesthouse ya 😊`;
  }

  await logMessage(supabase, convId, 'assistant', followUp);
  const fonnteResult = await sendWhatsApp(phone, followUp, env.fonnteApiKey);
  if (fonnteResult.status === false) {
    console.error(`❌ RoomBrochure follow-up failed for ${phone}: ${fonnteResult.detail}`);
  }

  logAgentDecision(supabase, {
    trace_id: trace?.traceId,
    phone_number: phone,
    conversation_id: convId,
    from_agent: 'orchestrator',
    to_agent: 'room_brochure',
    reason: brochureSent ? 'brochure_sent' : 'brochure_unavailable',
    intent: 'room_photo_request',
  });

  return new Response(JSON.stringify({
    status: 'room_brochure_sent',
    conversation_id: convId,
    brochure_sent: brochureSent,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
