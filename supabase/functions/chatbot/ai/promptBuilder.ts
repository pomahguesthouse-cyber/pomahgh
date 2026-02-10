import { 
  TRAIT_DESCRIPTIONS, 
  COMMUNICATION_STYLES, 
  EMOJI_USAGE, 
  FORMALITY_PRONOUNS,
  PRICE_TYPE_LABELS,
  INDONESIAN_MONTHS
} from '../lib/constants.ts';
import { getWIBTime, formatDateIndonesian, formatDateISO, addDays, getNextSaturday, getTimeGreeting } from '../utils/time.ts';
import { selectRelevantExamples, formatTrainingExamples } from '../services/exampleSelector.ts';
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
  const todayDate = wibTime.getDate();
  const currentMonth = INDONESIAN_MONTHS[wibTime.getMonth()];
  const currentYear = wibTime.getFullYear();

  return `📅 REFERENSI TANGGAL (WIB):
- Hari ini: ${formatDateIndonesian(wibTime)} (${today})
- Tanggal SEKARANG: ${todayDate} ${currentMonth} ${currentYear}
- Besok: ${tomorrow}
- Lusa: ${lusa}
- Weekend ini: ${weekend}
- Minggu depan: ${nextWeek}

🚨 ATURAN TANGGAL (KRITIS!):
- ❌ DILARANG bilang "tanggal sudah lewat" TANPA panggil check_availability!
- ✅ WAJIB panggil check_availability untuk SEMUA tanggal yang user sebutkan!
- Jika user sebut tanggal TANPA tahun → pilih tahun yang membuat tanggal di MASA DEPAN

⚠️ KONVERSI OTOMATIS:
- "malam ini"/"hari ini" → check-in ${today}
- "besok"/"bsk" → check-in ${tomorrow}
- "lusa" → check-in ${lusa}
- "weekend"/"akhir pekan" → check-in ${weekend}
- "minggu depan" → check-in ${nextWeek}`;
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

  // Include parsed relative date context
  let parsedDateContext = '';
  if (ctx.parsed_date) {
    parts.push(`Tanggal terdeteksi: ${ctx.parsed_date.description} → ${ctx.parsed_date.check_in}`);
    parsedDateContext = `\n⚠️ USER MENYEBUT "${ctx.parsed_date.description.toUpperCase()}": Gunakan check_in=${ctx.parsed_date.check_in}, check_out=${ctx.parsed_date.check_out}`;
  }

  const contextString = parts.length > 0 
    ? `\n📋 KONTEKS:\n${parts.join(' | ')}${parsedDateContext}`
    : '';

  // Build explicit tool instruction when awaiting guest data
  let explicitToolInstruction = '';
  if (ctx.awaiting_guest_data && ctx.preferred_room && ctx.check_in_date && ctx.check_out_date) {
    explicitToolInstruction = `

🚨🚨🚨 CRITICAL: BOOKING DATA RECEIVED - EXECUTE TOOL NOW! 🚨🚨🚨
STATUS: Menunggu data tamu untuk booking ${ctx.preferred_room}
TANGGAL TERSIMPAN: Check-in ${ctx.check_in_date}, Check-out ${ctx.check_out_date}

⛔ PESAN INI MEMBUTUHKAN TINDAKAN SEGERA!

JIKA USER MEMBERIKAN DATA TAMU (nama/email/HP/jumlah tamu):
1. JANGAN PERNAH balas dengan text seperti:
   - "Terima kasih, akan diproses"
   - "Mohon tunggu sebentar"
   - "Rani akan buatkan draf booking-nya"
   
2. LANGSUNG PANGGIL create_booking_draft dengan parameter:
   {
     "room_name": "${ctx.preferred_room}",
     "check_in": "${ctx.check_in_date}",
     "check_out": "${ctx.check_out_date}",
     "guest_name": "[dari pesan user]",
     "guest_email": "[dari pesan user]",
     "guest_phone": "[dari pesan user]",
     "num_guests": [dari pesan user]
   }

⚠️ JIKA KAMU MERESPONS DENGAN TEXT TANPA MEMANGGIL TOOL = GAGAL!
✅ BENAR: Langsung panggil create_booking_draft
❌ SALAH: Balas dulu baru nanti panggil tool`;
  }

  return { contextString, explicitToolInstruction };
}

/**
 * Build the booking flow rules section
 */
function buildBookingFlowRules(): string {
  return `🔄 BOOKING FLOW (SANGAT PENTING!):
- User konfirmasi ("ya/oke/booking/pesan/lanjut") setelah check_availability:
  → GUNAKAN kamar dan tanggal dari check_availability sebelumnya (JANGAN tanya ulang!)
  → LANGSUNG minta data tamu yang BELUM ADA: nama lengkap, email, nomor HP, jumlah tamu
  → Setelah data lengkap → LANGSUNG panggil create_booking_draft

- "X malam" setelah check → lakukan check_availability BARU dengan durasi updated
- User sebut nama kamar setelah check → LANGSUNG minta data tamu (JANGAN get_room_details!)

⚠️ CRITICAL - DATA TAMU:
Jika user memberikan data tamu (nama + email + HP + jumlah):
→ LANGSUNG panggil create_booking_draft dalam respons YANG SAMA
→ JANGAN bilang "akan dibuatkan" atau "mohon tunggu" tanpa panggil tool!
→ JANGAN balas text dulu baru panggil tool nanti - itu GAGAL!

🧠 INTELLIGENCE:
- Kenali typo: dlx→deluxe, kmr→kamar, brp→berapa, bs→bisa, gk/ga→tidak, tgl→tanggal, bsk→besok
- Ingat preferensi dari percakapan sebelumnya
- JANGAN tanya ulang info yang sudah diberikan user

🚨 TOOLS:
- "ada kamar apa?" → get_all_rooms
- kamar + tanggal → check_availability
- data tamu lengkap → create_booking_draft (PANGGIL LANGSUNG!)
- cek/ubah booking → minta kode PMH-XXXXXX + telepon + email
- "cara bayar?"/"metode pembayaran?" → get_payment_methods (perlu kode booking + telepon + email)

🏷️ HARGA KHUSUS LONG STAY (3+ MALAM):
- Jika tamu menanyakan DISKON/HARGA KHUSUS untuk menginap 3 malam atau LEBIH:
  1. LANGSUNG panggil notify_longstay_inquiry dengan info yang sudah diketahui
  2. Setelah tool berhasil, beritahu tamu: "Terima kasih atas minatnya! Untuk menginap 3 malam atau lebih, kami memiliki penawaran harga khusus. Tim kami akan segera menghubungi Anda melalui WhatsApp untuk memberikan penawaran terbaik. Mohon ditunggu sebentar ya! 🙏"
  3. JANGAN berikan harga sendiri untuk long stay - SELALU eskalasi ke admin
- Tanda tamu minta long stay: "diskon", "harga khusus", "long stay", "menginap lama", "X malam" (X≥3) + bertanya soal potongan harga

💳 PEMBAYARAN:
- Setelah create_booking_draft berhasil, SELALU informasikan link pembayaran yang ada di response
- Jika tamu bertanya cara bayar → panggil get_payment_methods dengan kode booking + data verifikasi
- Metode tersedia: Virtual Account (BCA, BNI, Mandiri, dll), QRIS, E-Wallet (OVO, Dana, ShopeePay)
- Tamu juga bisa transfer manual

⚠️ FORMAT:
- Kode booking: PMH-XXXXXX
- Tanggal: "15 Januari 2025"
- Harga: "Rp 450.000"

🚫 BATASAN TOPIK (WAJIB DIPATUHI!):
Kamu HANYA boleh menjawab pertanyaan tentang:
1. ✅ Booking kamar di Pomah Guesthouse (cek ketersediaan, buat booking, ubah booking)
2. ✅ Informasi kamar (tipe, harga, fasilitas kamar)
3. ✅ Fasilitas hotel (WiFi, parkir, sarapan, dll)
4. ✅ Lokasi dan akses ke Pomah Guesthouse
5. ✅ Kebijakan hotel (check-in/out, pembatalan, pembayaran)
6. ✅ Informasi kontak hotel

TOLAK dengan sopan pertanyaan tentang:
❌ Topik umum tidak terkait Pomah Guesthouse
❌ Berita, politik, olahraga, hiburan
❌ Rekomendasi tempat makan/wisata di luar konteks hotel
❌ Cuaca, ramalan, horoskop
❌ Matematika, coding, tugas sekolah
❌ Gosip, opini kontroversial
❌ Pertanyaan pribadi tentang AI/sistem

Jika user bertanya di luar topik:
→ "Maaf, saya hanya bisa membantu terkait booking dan informasi Pomah Guesthouse. 🏨 Ada yang bisa saya bantu tentang reservasi kamar?"`;
}

/**
 * Main function to build the complete system prompt
 */
export function buildSystemPrompt(config: PromptConfig): string {
  const { settings, hotelData, conversationContext, lastUserMessage } = config;
  const { settings: hotel, facilities, knowledgeBase, trainingExamples } = hotelData;

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

  // Knowledge base (truncated)
  const knowledgeInfo = knowledgeBase.slice(0, 3).map(kb => 
    `[${kb.category?.toUpperCase() || 'INFO'}] ${kb.title}: ${kb.content.substring(0, 300)}...`
  ).join('\n\n');

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

${trainingExamplesInfo ? `🎯 CONTOH RESPONS:\n${trainingExamplesInfo}` : ''}
${knowledgeInfo ? `\n📚 INFO TAMBAHAN:\n${knowledgeInfo}` : ''}`;
}
