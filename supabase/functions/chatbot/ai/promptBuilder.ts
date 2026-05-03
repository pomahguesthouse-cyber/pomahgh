import { 
  PRICE_TYPE_LABELS,
  INDONESIAN_MONTHS
} from '../lib/constants.ts';
import { getWIBTime, formatDateIndonesian, formatDateISO, addDays, getNextSaturday, getTimeGreeting } from '../utils/time.ts';
import { selectRelevantExamples, formatTrainingExamples, selectRelevantFAQPatterns, formatFAQPatterns, selectRelevantKnowledge, formatKnowledge } from '../services/exampleSelector.ts';
import type { PromptConfig, ConversationContext, ChatbotSettings, HotelData } from '../lib/types.ts';
import { buildBookingFlowRules } from '../agents/bookingPrompt.ts';
import { buildPaymentRules } from '../agents/paymentPrompt.ts';

/**
 * Admin takeover + topic boundary rules (merged from former intentPrompt.ts).
 */
function buildAdminTakeoverRules(): string {
  return `ADMIN TAKEOVER:
- Jika ada pesan dari admin/pengelola di riwayat, BACA dan PAHAMI apa yang sudah dijawab
- Lanjutkan percakapan secara natural berdasarkan jawaban admin, JANGAN ulangi atau bertentangan
- Anggap admin dan kamu satu tim — transisi harus seamless
- Jika admin sudah jawab pertanyaan tamu, jangan jawab ulang — lanjut ke topik berikutnya

BATASAN: Hanya jawab tentang Pomah Guesthouse (booking, kamar, fasilitas, lokasi, kebijakan, kontak). Tolak sopan topik lain.`;
}

/**
 * Build persona — natural WhatsApp admin style
 */
function buildPersonaSection(settings: ChatbotSettings, hotelName: string): string {
  const customInstructions = settings.custom_instructions 
    ? `\nInstruksi tambahan: ${settings.custom_instructions}` 
    : '';

  return `Kamu ${settings.persona_name}, admin WhatsApp ${hotelName}.
Balas seperti admin hotel sungguhan yang chat di WA — singkat, natural, friendly.

ATURAN WAJIB:
- Selalu 1 pesan saja, max 2-3 kalimat
- Max 1 emoji per pesan (boleh 0)
- Format tanggal output WAJIB format Indonesia (contoh: 15 Januari 2025) — JANGAN pakai "15/01/2025" atau "2025-01-15"
- Ikuti nada user: pendek→pendek, panjang→panjang
- Ingat konteks (nama, tanggal, kamar, jumlah tamu) — JANGAN tanya ulang
- Handle typo natural: dlx→deluxe, kmr→kamar, brp→berapa, bs→bisa, gk/ga→tidak, tgl→tanggal, bsk→besok
- Jawab langsung, follow-up singkat optional
- Gabungkan beberapa pesan pendek user jadi 1 pemahaman
- JANGAN pakai bahasa formal/kaku, JANGAN repetitif
- Sound like real human, bukan scripted bot${customInstructions}`;
}

/**
 * Tool-call enforcement — cegah halusinasi harga & ketersediaan
 */
function buildToolEnforcementRules(): string {
  return `TOOL-CALL WAJIB (NO HALUSINASI):
- Pertanyaan ketersediaan ("ada kamar?", "available?", "ready?", "kosong?", tanggal+kamar) → WAJIB panggil check_availability. JANGAN jawab dari ingatan.
- Pertanyaan harga spesifik per kamar/tanggal → pakai data KAMAR di prompt apa adanya. JANGAN mengarang angka, JANGAN mengubah/membulatkan, JANGAN bandingkan harga antar tipe yang tidak ada di list.
- Permintaan brosur/foto/katalog/preview kamar → WAJIB panggil send_brochure_to_guest. JANGAN bilang "sudah saya kirim" tanpa memanggil tool.
- Konfirmasi booking final → WAJIB panggil create_booking_draft (setelah ringkasan disetujui user).
- Jika data tidak tersedia atau tool gagal → katakan "saya cek dulu ya" SEKALI, lalu coba lagi. JANGAN mengarang.`;
}

/**
 * Build date reference — compact
 */
function buildDateContext(): string {
  const wibTime = getWIBTime();
  const today = formatDateISO(wibTime);
  const tomorrow = formatDateISO(addDays(wibTime, 1));
  const lusa = formatDateISO(addDays(wibTime, 2));
  const nextWeek = formatDateISO(addDays(wibTime, 7));
  const weekend = formatDateISO(getNextSaturday(wibTime));
  const currentYear = wibTime.getFullYear();
  const nextMonth = INDONESIAN_MONTHS[(wibTime.getMonth() + 1) % 12];

  return `TANGGAL (WIB): ${formatDateIndonesian(wibTime)} (${today})
Besok: ${tomorrow} | Lusa: ${lusa} | Weekend: ${weekend} | Minggu depan: ${nextWeek}
- WAJIB panggil check_availability untuk SEMUA tanggal, JANGAN tolak tanpa cek
- Tanggal tanpa bulan & sudah lewat → ${nextMonth} ${currentYear}
- Bulan sudah lewat tahun ini → tahun ${currentYear + 1}
- "malam ini"/"hari ini"→${today} | "besok"/"bsk"→${tomorrow} | "lusa"→${lusa} | "weekend"→${weekend} | "minggu depan"→${nextWeek}`;
}

/**
 * Build rooms info — compact
 */
function buildRoomsInfo(hotelData: HotelData): string {
  const { rooms, addons } = hotelData;

  return rooms.map(r => {
    const extraBed = addons.find(a => 
      (a.room_id === r.id || a.room_id === null) && 
      a.name?.toLowerCase().includes('extra bed')
    );

    const maxExtraBeds = extraBed?.max_quantity || 0;
    const extraCapacity = extraBed ? (extraBed.extra_capacity || 1) * maxExtraBeds : 0;
    const maxWithExtraBed = r.max_guests + extraCapacity;

    const extraBedInfo = maxExtraBeds > 0 
      ? ` (+${maxExtraBeds} extra bed → maks ${maxWithExtraBed} tamu)` 
      : '';

    return `- ${r.name}: Rp ${r.price_per_night.toLocaleString()}/malam, ${r.max_guests} tamu${extraBedInfo}${r.size_sqm ? `, ${r.size_sqm}m²` : ''}`;
  }).join('\n');
}

/**
 * Build addons info — compact
 */
function buildAddonsInfo(hotelData: HotelData): string {
  const { rooms, addons } = hotelData;
  if (!addons.length) return 'Tidak ada add-on';

  return addons.map(addon => {
    const priceLabel = PRICE_TYPE_LABELS[addon.price_type] || '';
    const roomName = rooms.find(r => r.id === addon.room_id)?.name;
    const roomNote = roomName ? ` (${roomName})` : addon.room_id === null ? ' (Semua)' : '';
    const maxQty = addon.max_quantity ? `, maks ${addon.max_quantity}` : '';
    const extraCap = addon.extra_capacity ? `, +${addon.extra_capacity} tamu/unit` : '';

    return `- ${addon.name}${roomNote}: Rp ${addon.price?.toLocaleString()}${priceLabel}${maxQty}${extraCap}`;
  }).join('\n');
}

/**
 * Build conversation context — compact
 */
function buildContextString(ctx?: ConversationContext): { contextString: string; explicitToolInstruction: string } {
  if (!ctx) return { contextString: '', explicitToolInstruction: '' };

  const parts: string[] = [];
  
  if (ctx.guest_name) parts.push(`Nama: ${ctx.guest_name}`);
  if (ctx.preferred_room) parts.push(`Kamar: ${ctx.preferred_room}`);
  
  if (ctx.check_in_date && ctx.check_out_date) {
    parts.push(`${ctx.check_in_date} s/d ${ctx.check_out_date}`);
  } else if (ctx.dates_mentioned) {
    parts.push(`Tanggal: ${ctx.dates_mentioned}`);
  }
  
  if (ctx.guest_count) parts.push(`${ctx.guest_count} tamu`);
  if (ctx.sentiment) parts.push(`Mood: ${ctx.sentiment}`);
  if (ctx.awaiting_guest_data) parts.push(`⚠️ MENUNGGU DATA TAMU`);

  if (ctx.last_booking_code) {
    const bp = [`BOOKING: ${ctx.last_booking_code}`];
    if (ctx.last_booking_guest_name) bp.push(ctx.last_booking_guest_name);
    if (ctx.last_booking_guest_email) bp.push(ctx.last_booking_guest_email);
    if (ctx.last_booking_guest_phone) bp.push(ctx.last_booking_guest_phone);
    if (ctx.last_booking_room) bp.push(ctx.last_booking_room);
    parts.push(bp.join(' | '));
  }

  let parsedDateContext = '';
  if (ctx.parsed_date) {
    parts.push(`Tanggal: ${ctx.parsed_date.description} → ${ctx.parsed_date.check_in}`);
    parsedDateContext = `\n⚠️ "${ctx.parsed_date.description.toUpperCase()}": check_in=${ctx.parsed_date.check_in}, check_out=${ctx.parsed_date.check_out}`;
  }

  const contextString = parts.length > 0 
    ? `\nKONTEKS: ${parts.join(' | ')}${parsedDateContext}`
    : '';

  let explicitToolInstruction = '';
  if (ctx.awaiting_guest_data && ctx.preferred_room && ctx.check_in_date && ctx.check_out_date) {
    explicitToolInstruction = `\n⚠️ BOOKING PENDING: ${ctx.preferred_room} (${ctx.check_in_date}–${ctx.check_out_date}). Jika user kasih nama/email/HP/jumlah tamu → TAMPILKAN RINGKASAN DRAFT dulu, minta konfirmasi "Ya". BARU panggil create_booking_draft setelah user konfirmasi.`;
  }

  if (ctx.last_booking_code) {
    explicitToolInstruction += `\nBOOKING AKTIF: ${ctx.last_booking_code}${ctx.last_booking_guest_email ? ` | ${ctx.last_booking_guest_email}` : ''}${ctx.last_booking_guest_phone ? ` | ${ctx.last_booking_guest_phone}` : ''} → pakai data ini, jangan minta ulang.`;
  }

  return { contextString, explicitToolInstruction };
}

/**
 * Combined flow rules — assembled from agent prompt modules
 */
function buildCombinedFlowRules(): string {
  return `${buildBookingFlowRules()}

${buildPaymentRules()}

${buildToolEnforcementRules()}

${buildAdminTakeoverRules()}`;
}

/**
 * Main — build complete system prompt
 */
export function buildSystemPrompt(config: PromptConfig): string {
  const { settings, hotelData, conversationContext, lastUserMessage } = config;
  const { settings: hotel, facilities, knowledgeBase, trainingExamples, faqPatterns, learningInsights, nearbyLocations, bankAccounts } = hotelData;

  const wibTime = getWIBTime();
  const timeGreeting = getTimeGreeting(wibTime.getHours());

  const personaSection = buildPersonaSection(settings, hotel.hotel_name);
  const dateContext = buildDateContext();
  const { contextString, explicitToolInstruction } = buildContextString(conversationContext);
  const roomsInfo = buildRoomsInfo(hotelData);
  const addonsInfo = buildAddonsInfo(hotelData);
  const bookingFlowRules = buildCombinedFlowRules();

  // Bank accounts info (CRITICAL: prevents AI from hallucinating wrong bank details)
  const bankInfo = (bankAccounts || []).length > 0
    ? (bankAccounts || []).map(b => `🏦 ${b.bank_name} | No. Rek: ${b.account_number} | a.n. ${b.account_holder_name}`).join('\n')
    : '';

  // Relevant training examples
  const relevantExamples = lastUserMessage 
    ? selectRelevantExamples(lastUserMessage, trainingExamples)
    : [];
  const trainingExamplesInfo = formatTrainingExamples(relevantExamples);

  // FAQ patterns
  const relevantFAQ = lastUserMessage
    ? selectRelevantFAQPatterns(lastUserMessage, faqPatterns || [])
    : [];
  const faqPatternsInfo = formatFAQPatterns(relevantFAQ);

  // Learning insights
  const improvementsInfo = (learningInsights || []).length > 0
    ? (learningInsights || []).map(imp => `- [${imp.priority?.toUpperCase()}] ${imp.area}: ${imp.suggestion}`).join('\n')
    : '';

  // Knowledge base
  const relevantKB = lastUserMessage
    ? selectRelevantKnowledge(lastUserMessage, knowledgeBase)
    : knowledgeBase.slice(0, 3);
  const knowledgeInfo = formatKnowledge(relevantKB);

  // Nearby locations
  const nearbyInfo = (nearbyLocations || []).length > 0
    ? (nearbyLocations || []).map(loc => 
        `- ${loc.name} (${loc.category}): ${loc.distance_km}km, ~${loc.travel_time_minutes}min`
      ).join('\n')
    : '';

  // Facilities
  const facilitiesInfo = facilities.map(f => f.title).join(', ') || '';

  return `${personaSection}

Sekarang: ${formatDateIndonesian(wibTime)} (${timeGreeting}) | Tahun: ${wibTime.getFullYear()}
${contextString}${explicitToolInstruction}

${dateContext}

${bookingFlowRules}

HOTEL: ${hotel.hotel_name}, ${hotel.address}
Check-in ${hotel.check_in_time} | Check-out ${hotel.check_out_time} | WA ${hotel.whatsapp_number}
${bankInfo ? `\nREKENING PEMBAYARAN (WAJIB pakai data ini, JANGAN mengarang nomor rekening lain!):\n${bankInfo}` : ''}

KAMAR:
${roomsInfo}

ADD-ONS:
${addonsInfo}

FASILITAS: ${facilitiesInfo}
${nearbyInfo ? `\nLOKASI SEKITAR:\n${nearbyInfo}` : ''}
${trainingExamplesInfo ? `\nCONTOH RESPONS (referensi gaya, jangan copy paste):\n${trainingExamplesInfo}` : ''}
${faqPatternsInfo ? `\nFAQ (sampaikan dengan gayamu, jangan copy paste):\n${faqPatternsInfo}` : ''}
${improvementsInfo ? `\nCATATAN:\n${improvementsInfo}` : ''}
${knowledgeInfo ? `\nKNOWLEDGE (acuan jawaban, parafrasa natural):\n${knowledgeInfo}` : ''}

CONTOH PERILAKU:
User: "25 26 27 april\nFamily\nAvailable?"
Kamu: "Family Suite 25–27 April masih available, ada 2 kamar kosong 👍 Mau lanjut booking atau mau tanya dulu?"

User: "bisa surve?"
Kamu: "Boleh kak, resepsionis ada jam 08.00–22.00, langsung aja datang ya 👍"`;
}
