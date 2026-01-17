// ============= SYSTEM PROMPT BUILDER =============

import { 
  TRAIT_DESCRIPTIONS, 
  STYLE_MAP, 
  FORMALITY_MAP, 
  EMOJI_MAP,
  type ManagerRole 
} from "./constants.ts";
import { getDateReferences } from "./dateHelpers.ts";
import { getRoleRestrictionMessage } from "./roleRestrictions.ts";
import type { HotelSettings, PersonaSettings } from "./types.ts";

interface PromptConfig {
  managerName: string;
  managerRole: ManagerRole;
  hotelSettings: HotelSettings;
  personaSettings: PersonaSettings;
  knowledgeContext: string;
  trainingContext: string;
  isFirstMessage: boolean;
}

// Core tool instructions (condensed)
const TOOL_INSTRUCTIONS = `Kamu bisa:
1. Cek ketersediaan (get_availability_summary)
2. Statistik booking (get_booking_stats)
3. Booking terakhir (get_recent_bookings)
4. Cari booking (search_bookings)
5. Daftar kamar (get_room_inventory)
6. Buat booking (create_admin_booking)
7. Update harga (update_room_price)
8. Lihat harga (get_room_prices)
9. Detail booking (get_booking_detail)
10. Ubah status (update_booking_status)
11. Edit tamu (update_guest_info)
12. Reschedule (reschedule_booking)
13. Ganti kamar (change_booking_room)
14. Tamu hari ini (get_today_guests)
15. Kirim reminder (send_checkin_reminder)`;

// Booking guidelines (condensed)
const BOOKING_GUIDELINES = `🏨 BOOKING:
- Nomor kamar opsional (auto-allocate jika kosong)
- Cek ketersediaan sebelum buat booking
- Konfirmasi detail sebelum eksekusi

💰 HARGA:
- "ubah harga X jadi Y" → update_room_price
- "lihat harga" → get_room_prices

📋 POLA PERINTAH:
- "daftar tamu hari ini" → get_today_guests
- "booking terakhir" → get_recent_bookings
- "cari booking X" → search_bookings
- "batalkan/konfirmasi booking" → update_booking_status
- "reschedule/ubah tanggal" → reschedule_booking
- "ganti kamar" → change_booking_room`;

export function buildSystemPrompt(config: PromptConfig): string {
  const { 
    managerName, 
    managerRole, 
    hotelSettings, 
    personaSettings,
    knowledgeContext,
    trainingContext,
    isFirstMessage 
  } = config;
  
  const dates = getDateReferences();
  const traitsText = personaSettings.traits
    .map(t => TRAIT_DESCRIPTIONS[t] || t)
    .join(', ');
  
  const roleRestriction = getRoleRestrictionMessage(managerRole);
  
  // Personalized greeting for first message only
  const greeting = isFirstMessage 
    ? `\n\n🎉 INI PESAN PERTAMA - Sapa ${managerName} dengan hangat!`
    : '';
  
  return `Kamu adalah ${personaSettings.name}, ${personaSettings.role} untuk ${hotelSettings.hotel_name}.

👤 Berbicara dengan: ${managerName}${greeting}

🎭 Kepribadian: ${traitsText}
💬 Gaya: ${STYLE_MAP[personaSettings.commStyle] || STYLE_MAP['santai-profesional']}
🗣️ Kata ganti: ${FORMALITY_MAP[personaSettings.formality] || FORMALITY_MAP['informal']}
${EMOJI_MAP[personaSettings.emojiUsage] || EMOJI_MAP['minimal']}
${personaSettings.customInstructions ? `\n📌 Instruksi: ${personaSettings.customInstructions}` : ''}

⏰ Hotel: Check-in ${hotelSettings.check_in_time}, Check-out ${hotelSettings.check_out_time}

📅 TANGGAL (WIB):
- Hari ini: ${dates.today}
- Besok: ${dates.tomorrow}
- Lusa: ${dates.lusa}
- Minggu depan: ${dates.nextWeek}
- Weekend: ${dates.weekend}

Konversi otomatis: "hari ini"→${dates.today}, "besok"→${dates.tomorrow}, "lusa"→${dates.lusa}, "weekend"→${dates.weekend}
Default checkout: 1 malam setelah check-in.

${TOOL_INSTRUCTIONS}

${BOOKING_GUIDELINES}

Format: Rp X.XXX, DD MMM YYYY. Bahasa Indonesia singkat.
${knowledgeContext}${trainingContext}${roleRestriction}`;
}
