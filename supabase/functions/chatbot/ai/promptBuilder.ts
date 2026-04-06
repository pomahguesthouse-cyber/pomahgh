import { 
  TRAIT_DESCRIPTIONS, 
  COMMUNICATION_STYLES, 
  EMOJI_USAGE, 
  FORMALITY_PRONOUNS,
  PRICE_TYPE_LABELS,
  INDONESIAN_MONTHS
} from '../lib/constants.ts';
import { getWIBTime, formatDateIndonesian, formatDateISO, addDays, getNextSaturday, getTimeGreeting } from '../utils/time.ts';
import { selectRelevantExamples, formatTrainingExamples, selectRelevantFAQPatterns, formatFAQPatterns, selectRelevantKnowledge, formatKnowledge } from '../services/exampleSelector.ts';
import type { PromptConfig, ConversationContext, ChatbotSettings, HotelData } from '../lib/types.ts';

/**
 * Build persona section of prompt
 */
function buildPersonaSection(settings: ChatbotSettings, hotelName: string): string {
  const traitsText = settings.persona_traits
    .map(t => TRAIT_DESCRIPTIONS[t] || t)
    .join(', ');

  const style = COMMUNICATION_STYLES[settings.communication_style] || COMMUNICATION_STYLES['santai-profesional'];
  const emoji = EMOJI_USAGE[settings.emoji_usage] || EMOJI_USAGE['moderate'];
  const pronouns = FORMALITY_PRONOUNS[settings.language_formality] || FORMALITY_PRONOUNS['semi-formal'];

  return `Kamu adalah ${settings.persona_name}, ${settings.persona_role} ${hotelName}.

🎭 KEPRIBADIAN: ${traitsText}

💬 GAYA KOMUNIKASI:
- ${style}
- ${emoji}
- Kata ganti: ${pronouns}
- Ingat nama tamu dan gunakan dalam percakapan jika sudah tahu
- Respons singkat dan jelas, hindari bertele-tele

🔒 ATURAN KEPRIBADIAN (WAJIB!):
- SEMUA jawaban HARUS mencerminkan kepribadianmu: ${traitsText}
- Jangan pernah menjawab kaku atau seperti robot, sekalipun info dari FAQ atau Knowledge Base
- Sampaikan informasi factual dengan gaya komunikasimu sendiri, JANGAN copy-paste mentah
- Tambahkan sentuhan personal: sapaan, empati, atau ekspresi sesuai konteks
- Jika ada FAQ/KB sebagai referensi, PARAFRASA dengan gayamu sendiri

${settings.custom_instructions ? `📌 INSTRUKSI KHUSUS:\n${settings.custom_instructions}` : ''}`;
}

/**
 * Build date reference context
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

  return `📅 TANGGAL (WIB): ${formatDateIndonesian(wibTime)} (${today}) | Tahun: ${currentYear}
Besok: ${tomorrow} | Lusa: ${lusa} | Weekend: ${weekend} | Minggu depan: ${nextWeek}

ATURAN TANGGAL:
- WAJIB panggil check_availability untuk SEMUA tanggal, JANGAN tolak tanggal tanpa cek!
- Tanggal tanpa bulan & sudah lewat bulan ini → asumsikan ${nextMonth} ${currentYear}
- Bulan belum lewat tahun ini → tahun ${currentYear}. Bulan sudah lewat → tahun ${currentYear + 1}
- "malam ini"/"hari ini"→${today} | "besok"/"bsk"→${tomorrow} | "lusa"→${lusa} | "weekend"→${weekend} | "minggu depan"→${nextWeek}`;
}

/**
 * Build rooms info with extra bed capacity
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
      ? ` (bisa +${maxExtraBeds} extra bed → maks ${maxWithExtraBed} tamu)` 
      : '';

    return `- ${r.name}: Rp ${r.price_per_night.toLocaleString()}/malam. Kapasitas ${r.max_guests} tamu${extraBedInfo}${r.size_sqm ? `, ${r.size_sqm}m²` : ''}`;
  }).join('\n');
}

/**
 * Build addons info
 */
function buildAddonsInfo(hotelData: HotelData): string {
  const { rooms, addons } = hotelData;

  if (!addons.length) return 'Tidak ada add-on aktif';

  return addons.map(addon => {
    const priceLabel = PRICE_TYPE_LABELS[addon.price_type] || '';
    const roomName = rooms.find(r => r.id === addon.room_id)?.name;
    const roomNote = roomName ? ` (${roomName})` : addon.room_id === null ? ' (Semua Kamar)' : '';
    const maxQty = addon.max_quantity ? `, maks ${addon.max_quantity}` : '';
    const extraCap = addon.extra_capacity ? `, +${addon.extra_capacity} tamu/unit` : '';

    return `- ${addon.name}${roomNote}: Rp ${addon.price?.toLocaleString()}${priceLabel}${maxQty}${extraCap}`;
  }).join('\n');
}

/**
 * Build conversation context string
 */
function buildContextString(ctx?: ConversationContext): { contextString: string; explicitToolInstruction: string } {
  if (!ctx) return { contextString: '', explicitToolInstruction: '' };

  const parts: string[] = [];
  
  if (ctx.guest_name) parts.push(`Nama tamu: ${ctx.guest_name}`);
  if (ctx.preferred_room) parts.push(`Kamar diminati: ${ctx.preferred_room}`);
  
  if (ctx.check_in_date && ctx.check_out_date) {
    parts.push(`Check-in: ${ctx.check_in_date} | Check-out: ${ctx.check_out_date}`);
  } else if (ctx.dates_mentioned) {
    parts.push(`Tanggal (text): ${ctx.dates_mentioned}`);
  }
  
  if (ctx.guest_count) parts.push(`Tamu: ${ctx.guest_count} orang`);
  if (ctx.sentiment) parts.push(`Mood: ${ctx.sentiment}`);
  if (ctx.awaiting_guest_data) parts.push(`⚠️ MENUNGGU DATA TAMU UNTUK BOOKING`);

  // Booking memory - last booking in this conversation
  if (ctx.last_booking_code) {
    const bookingParts = [`🔖 BOOKING TERAKHIR: ${ctx.last_booking_code}`];
    if (ctx.last_booking_guest_name) bookingParts.push(`Nama: ${ctx.last_booking_guest_name}`);
    if (ctx.last_booking_guest_email) bookingParts.push(`Email: ${ctx.last_booking_guest_email}`);
    if (ctx.last_booking_guest_phone) bookingParts.push(`HP: ${ctx.last_booking_guest_phone}`);
    if (ctx.last_booking_room) bookingParts.push(`Kamar: ${ctx.last_booking_room}`);
    parts.push(bookingParts.join(' | '));
  }

  // Include parsed relative date context
  let parsedDateContext = '';
  if (ctx.parsed_date) {
    parts.push(`Tanggal terdeteksi: ${ctx.parsed_date.description} → ${ctx.parsed_date.check_in}`);
    parsedDateContext = `\n⚠️ USER MENYEBUT "${ctx.parsed_date.description.toUpperCase()}": Gunakan check_in=${ctx.parsed_date.check_in}, check_out=${ctx.parsed_date.check_out}`;
  }

  const contextString = parts.length > 0 
    ? `\n📋 KONTEKS:\n${parts.join(' | ')}${parsedDateContext}`
    : '';

  // Build explicit tool instruction when awaiting guest data or existing booking is known
  let explicitToolInstruction = '';
  if (ctx.awaiting_guest_data && ctx.preferred_room && ctx.check_in_date && ctx.check_out_date) {
    explicitToolInstruction = `

⚠️ BOOKING MENUNGGU DATA TAMU: ${ctx.preferred_room} (${ctx.check_in_date} s/d ${ctx.check_out_date})
Jika user memberikan nama/email/HP/jumlah tamu → LANGSUNG panggil create_booking_draft. JANGAN balas text tanpa tool!`;
  }

  if (ctx.last_booking_code) {
    explicitToolInstruction += `\nBOOKING AKTIF: ${ctx.last_booking_code}${ctx.last_booking_guest_email ? ` | ${ctx.last_booking_guest_email}` : ''}${ctx.last_booking_guest_phone ? ` | ${ctx.last_booking_guest_phone}` : ''}
→ Gunakan data ini untuk cek/ubah booking, JANGAN minta ulang.`;
  }

  return { contextString, explicitToolInstruction };
}

/**
 * Build the booking flow rules section
 */
function buildBookingFlowRules(): string {
  return `BOOKING FLOW:
- User konfirmasi setelah check_availability → gunakan kamar+tanggal sebelumnya, minta data tamu (nama, email, HP, jumlah), lalu LANGSUNG panggil create_booking_draft
- Data tamu lengkap → LANGSUNG panggil create_booking_draft (JANGAN balas text tanpa tool!)
- "X malam" setelah check → check_availability baru
- Kenali typo: dlx→deluxe, kmr→kamar, brp→berapa, bs→bisa, gk/ga→tidak, tgl→tanggal, bsk→besok
- JANGAN tanya ulang info yang sudah user berikan

TOOLS:
- "ada kamar apa?" → get_all_rooms
- kamar+tanggal → check_availability
- data tamu lengkap (nama+email+HP+jumlah tamu) → create_booking_draft. ⚠️ JANGAN panggil tanpa guest_phone!
- cek/ubah booking → gunakan data dari KONTEKS jika ada, atau minta PMH-XXXXXX+telepon+email
- "sudah transfer"/"sudah bayar" → notify_payment_proof

LONG STAY: panggil notify_longstay_inquiry HANYA jika tamu minta DISKON/potongan, bukan sekedar tanya harga 3+ malam.

PEMBAYARAN:
- JANGAN berikan link pembayaran (sandbox)
- Setelah booking: informasikan kode + rekening BCA 0095584379 a.n. Faizal Abdurachman + minta bukti transfer
- Bukti transfer masuk → panggil notify_payment_proof, ucapkan "Tim kami sedang mengecek pembayaran"

FORMAT: Kode PMH-XXXXXX | Tanggal "15 Januari 2025" | Harga "Rp 450.000"

BATASAN: Hanya jawab tentang booking, kamar, fasilitas, lokasi, kebijakan, kontak Pomah Guesthouse. Tolak sopan topik di luar itu.`;
}

/**
 * Main function to build the complete system prompt
 */
export function buildSystemPrompt(config: PromptConfig): string {
  const { settings, hotelData, conversationContext, lastUserMessage } = config;
  const { settings: hotel, facilities, knowledgeBase, trainingExamples, faqPatterns, learningInsights, nearbyLocations } = hotelData;

  const wibTime = getWIBTime();
  const timeGreeting = getTimeGreeting(wibTime.getHours());

  // Build sections
  const personaSection = buildPersonaSection(settings, hotel.hotel_name);
  const dateContext = buildDateContext();
  const { contextString, explicitToolInstruction } = buildContextString(conversationContext);
  const roomsInfo = buildRoomsInfo(hotelData);
  const addonsInfo = buildAddonsInfo(hotelData);
  const bookingFlowRules = buildBookingFlowRules();

  // Training examples
  const relevantExamples = lastUserMessage 
    ? selectRelevantExamples(lastUserMessage, trainingExamples)
    : [];
  const trainingExamplesInfo = formatTrainingExamples(relevantExamples);

  // FAQ patterns from WhatsApp learning
  const relevantFAQ = lastUserMessage
    ? selectRelevantFAQPatterns(lastUserMessage, faqPatterns || [])
    : [];
  const faqPatternsInfo = formatFAQPatterns(relevantFAQ);

  // Learning improvement suggestions
  const improvementsInfo = (learningInsights || []).length > 0
    ? (learningInsights || []).map(imp => `- [${imp.priority?.toUpperCase()}] ${imp.area}: ${imp.suggestion}`).join('\n')
    : '';

  // Knowledge base (relevance-based selection)
  const relevantKB = lastUserMessage
    ? selectRelevantKnowledge(lastUserMessage, knowledgeBase)
    : knowledgeBase.slice(0, 3);
  const knowledgeInfo = formatKnowledge(relevantKB);

  // Nearby locations
  const nearbyInfo = (nearbyLocations || []).length > 0
    ? (nearbyLocations || []).map(loc => 
        `- ${loc.name} (${loc.category}): ${loc.distance_km} km, ~${loc.travel_time_minutes} menit`
      ).join('\n')
    : '';

  // Facilities
  const facilitiesInfo = facilities.map(f => f.title).join(', ') || '';

  return `${personaSection}

📅 TANGGAL: ${formatDateIndonesian(wibTime)} | Sekarang ${timeGreeting} | TAHUN: ${wibTime.getFullYear()}
${contextString}${explicitToolInstruction}

${dateContext}

${bookingFlowRules}

📍 INFO HOTEL:
- ${hotel.hotel_name}: ${hotel.address}
- Check-in: ${hotel.check_in_time} | Check-out: ${hotel.check_out_time}
- WA: ${hotel.whatsapp_number}

🛏️ KAMAR:
${roomsInfo}

🎁 ADD-ONS TERSEDIA:
${addonsInfo}

✨ FASILITAS: ${facilitiesInfo}
${nearbyInfo ? `\n🗺️ LOKASI SEKITAR (gunakan untuk menjawab pertanyaan jarak/lokasi/akses):\n${nearbyInfo}` : ''}

${trainingExamplesInfo ? `🎯 CONTOH RESPONS:\n${trainingExamplesInfo}` : ''}
${faqPatternsInfo ? `\n❓ FAQ TAMU (referensi dari percakapan WhatsApp nyata — JANGAN copy-paste, sampaikan dengan gayamu sendiri):\n${faqPatternsInfo}` : ''}
${improvementsInfo ? `\n⚡ CATATAN PERBAIKAN (dari analisis percakapan sebelumnya, terapkan saran ini):\n${improvementsInfo}` : ''}
${knowledgeInfo ? `\n📚 KNOWLEDGE BASE (acuan utama jawaban — parafrasa dengan kepribadianmu, JANGAN jawab kaku):\n${knowledgeInfo}` : ''}`;
}
