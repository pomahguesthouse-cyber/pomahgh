/**
 * Hybrid Intent Classifier
 * 
 * Strategy:
 *  1. Fast path: deterministic keyword/regex matches (free, ~1ms)
 *  2. Slow path: LLM fallback (gemini-flash-lite, ~300ms) for ambiguous messages
 *  3. Memory-aware: receives last messages so the LLM can disambiguate
 *     short replies like "ok", "iya", "lanjut" based on prior context.
 * 
 * Returns one of the canonical intents the decision engine knows about.
 */
export type Intent =
  | 'greeting'
  | 'name_capture'
  | 'price_inquiry'        // generic price list
  | 'room_photo'           // brochure/photo request
  | 'booking'              // availability check, room reservation, dates
  | 'payment'              // bayar, transfer, rekening, bukti
  | 'faq'                  // facility, location, policy
  | 'complaint'            // negative sentiment, complaint
  | 'manager_command'      // manager-only commands (handled separately upstream)
  | 'price_approval'       // APPROVE/REJECT (manager)
  | 'payment_approval'     // YA/TIDAK reply (manager)
  | 'unknown';

export interface ClassifyContext {
  /** Last few exchanges to disambiguate short replies. */
  recentMessages?: Array<{ role: string; content: string }>;
  /** Whether the orchestrator is awaiting a guest's name. */
  awaitingName?: boolean;
}

export interface ClassifyResult {
  intent: Intent;
  confidence: number;        // 0..1 — keyword=0.95, llm=parsed value, fallback=0.4
  source: 'keyword' | 'llm' | 'fallback';
  reason?: string;
}

// ============= KEYWORD PATTERNS =============
const PRICE_GENERIC_RE = /\b(?:(?:berapa|brp)\s+(?:harga|tarif|biaya|rate|per\s*malam|semalam)|harga\s+(?:kamar|nya)?|tarif\s+kamar|daftar\s+harga|price\s*list|rate\s*list)\b/i;
const ROOM_PHOTO_RE = /\b(foto\s+kamar|gambar\s+kamar|brosur|brochure|katalog|liat\s+kamar|lihat\s+kamar)\b/i;
const BOOKING_RE = /\b(book|booking|pesan\s+kamar|reservas|cek\s+ketersediaan|ketersediaan|tersedia|available|ada\s+kamar|masih\s+ada|check.?in|check.?out|extend|perpanjang|tambah\s+(?:malam|hari)|cancel|batal|refund|promo|diskon|mau\s+(?:menginap|pesan|booking|nginap)|kamar\s+(?:kosong|tersedia|available)|hari\s+ini|malam\s+ini|besok|untuk\s+\d+\s+orang|\d+\s+(?:orang|kamar|malam))\b/i;
const PAYMENT_RE = /\b(bayar|pembayaran|payment|transfer|rekening|va\s+number|virtual\s+account|bukti\s+(?:transfer|bayar)|sudah\s+(?:bayar|transfer)|cara\s+(?:bayar|pembayaran)|metode\s+pembayaran)\b/i;
const FAQ_RE = /\b(fasilitas|facility|wifi|parkir|parking|sarapan|breakfast|kolam|pool|ac|handuk|towel|alamat|lokasi|location|arah|direction|dekat|nearby|jam\s+(?:buka|operasional|kerja)|buka\s+(?:jam|sampai)|tutup\s+(?:jam|pukul)|aturan|rule|policy|kebijakan|smoking|merokok|hewan|pet|anak|child|extra\s+bed|laundry|restoran|restaurant|mushola|masjid|transportasi|airport|bandara|stasiun|terminal)\b/i;
const COMPLAINT_RE = /\b(komplain|complain|kecewa|marah|jelek|buruk|kotor|rusak|tidak\s+(?:puas|sesuai|bagus)|gak\s+puas|ga\s+puas|nggak\s+puas|parah|payah|brengsek|bangsat|sialan|bodoh|tolol|menjijikkan|mengecewakan|refund\s+(?:sekarang|donk|dong)|protes|laporan|laporkan)\b/i;
const GREETING_RE = /^(?:halo|hai|hello|hi|hey|p|pagi|siang|sore|malam|assalamu'?alaikum|salam)[\s.!?]*$/i;
const SHORT_AFFIRMATIVE_RE = /^(?:ok|oke|okay|sip|baik|iya|ya|yoi|lanjut|next|ada\??|gimana\??|bagaimana\??)[\s.!?]*$/i;

// ============= FAST PATH =============
function keywordClassify(message: string): ClassifyResult | null {
  const trimmed = message.trim();

  if (GREETING_RE.test(trimmed)) {
    return { intent: 'greeting', confidence: 0.9, source: 'keyword', reason: 'greeting_pattern' };
  }
  if (COMPLAINT_RE.test(message)) {
    return { intent: 'complaint', confidence: 0.95, source: 'keyword', reason: 'complaint_keyword' };
  }
  if (ROOM_PHOTO_RE.test(message)) {
    return { intent: 'room_photo', confidence: 0.95, source: 'keyword', reason: 'photo_keyword' };
  }
  if (PRICE_GENERIC_RE.test(message) && !BOOKING_RE.test(message)) {
    return { intent: 'price_inquiry', confidence: 0.9, source: 'keyword', reason: 'price_list_keyword' };
  }
  if (PAYMENT_RE.test(message)) {
    return { intent: 'payment', confidence: 0.9, source: 'keyword', reason: 'payment_keyword' };
  }
  if (BOOKING_RE.test(message)) {
    return { intent: 'booking', confidence: 0.9, source: 'keyword', reason: 'booking_keyword' };
  }
  if (FAQ_RE.test(message)) {
    return { intent: 'faq', confidence: 0.85, source: 'keyword', reason: 'faq_keyword' };
  }

  // Short ambiguous replies → defer to LLM with context
  if (SHORT_AFFIRMATIVE_RE.test(trimmed) || trimmed.length <= 4) {
    return null;
  }

  return null;
}

// ============= SLOW PATH (LLM) =============
const LLM_SYSTEM_PROMPT = `You are an intent classifier for a hotel WhatsApp chatbot.
Classify the user's latest message into ONE of these intents:
- greeting: salam pembuka tanpa pertanyaan
- price_inquiry: tanya daftar harga umum
- room_photo: minta foto/brosur kamar
- booking: cek ketersediaan, pesan kamar, tanggal, tipe kamar
- payment: bayar, transfer, rekening, metode pembayaran, bukti
- faq: fasilitas, lokasi, kebijakan, info umum
- complaint: keluhan, kecewa, sentimen negatif
- unknown: tidak jelas / chit-chat ringan

Use the conversation history to interpret short replies (e.g. "iya", "ok", "lanjut").
Respond ONLY with this exact JSON: {"intent":"<value>","confidence":<0..1>}`;

async function llmClassify(
  message: string,
  recentMessages: Array<{ role: string; content: string }> = [],
): Promise<ClassifyResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    return { intent: 'unknown', confidence: 0.3, source: 'fallback', reason: 'no_api_key' };
  }

  // Trim history to last 6 turns to keep latency low
  const history = recentMessages
    .slice(-6)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.slice(0, 300),
    }));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: LLM_SYSTEM_PROMPT },
          ...history,
          { role: 'user', content: `Pesan tamu: "${message}"\n\nKlasifikasikan.` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`[intentClassifier] LLM ${resp.status}`);
      return { intent: 'unknown', confidence: 0.3, source: 'fallback', reason: `llm_${resp.status}` };
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    const intent = (parsed.intent as Intent) || 'unknown';
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
    return { intent, confidence, source: 'llm', reason: 'llm_classified' };
  } catch (err) {
    console.warn('[intentClassifier] LLM error:', (err as Error).message);
    return { intent: 'unknown', confidence: 0.3, source: 'fallback', reason: 'llm_exception' };
  }
}

// ============= PUBLIC API =============
/**
 * Classify a guest message into an Intent.
 * Tries keyword first; falls back to LLM only when keyword is inconclusive.
 */
export async function classifyIntent(
  message: string,
  ctx: ClassifyContext = {},
): Promise<ClassifyResult> {
  // Special pre-check: if orchestrator is awaiting a name, this is name_capture.
  if (ctx.awaitingName) {
    return { intent: 'name_capture', confidence: 1.0, source: 'keyword', reason: 'awaiting_name_state' };
  }

  // Fast path
  const fast = keywordClassify(message);
  if (fast) return fast;

  // Slow path (LLM with memory)
  return await llmClassify(message, ctx.recentMessages || []);
}
