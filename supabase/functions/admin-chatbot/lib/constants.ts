// ============= CONSTANTS & STATIC CONFIGURATIONS =============

export const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Trait descriptions for persona
export const TRAIT_DESCRIPTIONS: Record<string, string> = {
  efisien: 'bekerja cepat dan tidak berputar-putar',
  informatif: 'memberikan informasi lengkap dan akurat',
  proaktif: 'menawarkan bantuan lebih sebelum diminta',
  ringkas: 'menyampaikan poin-poin penting saja',
  sigap: 'merespon dengan cepat dan tepat',
  cekatan: 'menyelesaikan tugas dengan tangkas',
  teliti: 'memperhatikan detail dengan cermat',
  responsif: 'langsung merespon kebutuhan pengelola'
};

// Communication style mapping
export const STYLE_MAP: Record<string, string> = {
  'santai-profesional': 'Gunakan bahasa akrab tapi tetap profesional, tidak kaku',
  'formal': 'Gunakan bahasa formal dan profesional',
  'santai': 'Gunakan bahasa santai dan akrab seperti teman'
};

// Formality mapping
export const FORMALITY_MAP: Record<string, string> = {
  'informal': 'kamu/aku (akrab)',
  'semiformal': 'Anda/Saya',
  'formal': 'Bapak/Ibu (hormat)'
};

// Emoji usage mapping
export const EMOJI_MAP: Record<string, string> = {
  'minimal': 'Gunakan emoji hanya sesekali untuk poin penting',
  'sedang': 'Gunakan emoji secukupnya di poin-poin penting',
  'tidak': 'Jangan gunakan emoji sama sekali'
};

// Role-based tool access control
export type ManagerRole = 'super_admin' | 'booking_manager' | 'viewer';

export const ROLE_TOOL_ACCESS: Record<ManagerRole, string[] | 'all'> = {
  super_admin: 'all',
  booking_manager: [
    'get_availability_summary',
    'get_recent_bookings',
    'search_bookings',
    'get_room_inventory',
    'create_admin_booking',
    'get_booking_detail',
    'update_booking_status',
    'update_guest_info',
    'reschedule_booking',
    'change_booking_room',
    'get_room_prices',
    'send_checkin_reminder',
    'get_today_guests',
    // EXCLUDED: get_booking_stats, update_room_price (no revenue/price control)
  ],
  viewer: [
    'get_availability_summary',
    'get_room_inventory',
    'get_room_prices',
    'get_today_guests',
  ]
};

// Day price field mapping
export const DAY_PRICE_FIELDS: Record<number, string> = {
  0: 'sunday_price',
  1: 'monday_price',
  2: 'tuesday_price',
  3: 'wednesday_price',
  4: 'thursday_price',
  5: 'friday_price',
  6: 'saturday_price'
};

// Indonesian day/month names
export const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
