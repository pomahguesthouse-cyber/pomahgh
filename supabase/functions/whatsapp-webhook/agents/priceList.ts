import type { SupabaseClient, EnvConfig, WhatsAppSession } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { formatForWhatsApp } from '../utils/format.ts';
import { ensureConversation, updateSession } from '../services/session.ts';
import { logMessage } from '../services/conversation.ts';
import { sendWhatsApp } from '../services/fonnte.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';

/**
 * Detect generic "what's the room rate / price per night" questions
 * that should be answered immediately with a price list — without asking
 * the guest to pick a room type first.
 */
const PRICE_LIST_RE = /\b(?:berapa|brp|brapa)\s+(?:harga|tarif|rate|biaya|per\s*malam|semalam|sehari|harganya|tarifnya|ratenya)\b|\b(?:harga|tarif|rate)\s+(?:kamar|nya|semalam|per\s*malam|per\s*hari|sehari)\b|\b(?:price|rate)\s+(?:list|per\s*night|kamar)\b|\b(?:list|daftar)\s+harga\b/i;

// Exclude if user explicitly mentions a specific room type (let booking agent handle)
const SPECIFIC_ROOM_RE = /\b(deluxe|grand\s*deluxe|family\s*suite|single|standard|superior)\b/i;

export function isGenericPriceQuestion(message: string): boolean {
  if (!PRICE_LIST_RE.test(message)) return false;
  if (SPECIFIC_ROOM_RE.test(message)) return false;
  return true;
}

interface RoomRow {
  name: string;
  price_per_night: number | null;
  base_price: number | null;
  promo_price: number | null;
  max_guests: number | null;
}

function rupiah(n: number): string {
  return 'Rp' + Math.round(n).toLocaleString('id-ID');
}

function pickPrice(r: RoomRow): number | null {
  // Prefer promo_price if set & positive; else price_per_night; else base_price
  const candidates = [r.promo_price, r.price_per_night, r.base_price].filter(
    (v): v is number => typeof v === 'number' && v > 0,
  );
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

/**
 * Send the full room price list immediately when guest asks
 * "berapa harga kamar / rate semalam" without specifying room type.
 */
export async function handlePriceListQuestion(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  message: string,
  conversationId: string,
  personaName: string,
  env: EnvConfig,
  trace?: TraceContext,
): Promise<Response> {
  const convId = conversationId || await ensureConversation(supabase, session, phone);
  await logMessage(supabase, convId, 'user', message);
  await updateSession(supabase, phone, convId, false);

  // Load active rooms — order cheapest first
  const { data: rooms } = await supabase
    .from('rooms')
    .select('name, price_per_night, base_price, promo_price, max_guests')
    .eq('is_active', true)
    .order('price_per_night', { ascending: true, nullsFirst: false });

  const list = (rooms || []) as RoomRow[];

  let response: string;
  if (list.length === 0) {
    response = `Untuk info harga kamar, mohon tunggu sebentar ya kak, saya cek dulu 🙏`;
  } else {
    const lines = list
      .map((r) => {
        const price = pickPrice(r);
        if (price === null) return null;
        const guests = r.max_guests ? ` • ${r.max_guests} tamu` : '';
        return `• *${r.name}* — ${rupiah(price)}/malam${guests}`;
      })
      .filter((s): s is string => !!s);

    if (lines.length === 0) {
      response = `Untuk info harga kamar terbaru, mohon tunggu sebentar ya kak 🙏`;
    } else {
      response =
        `Berikut harga kamar Pomah Guesthouse hari ini ya kak 😊\n\n` +
        lines.join('\n') +
        `\n\nMau saya bantu cek ketersediaan untuk tanggal tertentu? 🏨`;
    }
  }

  await logMessage(supabase, convId, 'assistant', response);
  const formatted = formatForWhatsApp(response);
  const fonnteResult = await sendWhatsApp(phone, formatted, env.fonnteApiKey);
  if (fonnteResult.status === false) {
    console.error(`❌ PriceList: Failed to send WhatsApp to ${phone}: ${fonnteResult.detail}`);
  }

  logAgentDecision(supabase, {
    trace_id: trace?.traceId,
    phone_number: phone,
    conversation_id: convId,
    from_agent: 'orchestrator',
    to_agent: 'price_list',
    reason: 'generic_price_question',
    intent: 'price_inquiry',
  });

  return new Response(JSON.stringify({ status: 'price_list_sent', conversation_id: convId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
