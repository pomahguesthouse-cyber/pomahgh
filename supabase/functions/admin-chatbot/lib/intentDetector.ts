// ============= INTENT DETECTOR =============
// Detects user intent from message to guide tool selection

export type DetectedIntent = 
  | 'guest_list'
  | 'availability_check'
  | 'booking_search'
  | 'booking_stats'
  | 'room_status_update'
  | 'late_checkout'
  | 'extend_stay'
  | 'create_booking'
  | 'booking_detail'
  | 'room_inventory'
  | 'room_prices'
  | 'send_reminder'
  | 'calendar_link'
  | 'reschedule'
  | 'change_room'
  | 'update_guest'
  | 'general';

interface IntentMatch {
  intent: DetectedIntent;
  confidence: 'high' | 'medium' | 'low';
  suggestedTool?: string;
  extractedParams?: Record<string, string>;
}

// Pattern definitions for intent detection
const INTENT_PATTERNS: { intent: DetectedIntent; patterns: RegExp[]; tool: string }[] = [
  {
    intent: 'guest_list',
    patterns: [
      /daftar\s*tamu/i,
      /list\s*tamu/i,
      /siapa\s*(saja\s*)?(tamu|yang)/i,
      /tamu\s*(hari\s*ini|apa)/i,
      /who\s*is\s*(staying|checked)/i,
      /check\s*-?\s*in\s*hari\s*ini/i,
      /check\s*-?\s*out\s*hari\s*ini/i,
      /tamu\s*menginap/i,
      /berapa\s*tamu/i,
      /ada\s*tamu\s*apa/i,
    ],
    tool: 'get_today_guests'
  },
  {
    intent: 'availability_check',
    patterns: [
      /ketersediaan/i,
      /available/i,
      /kamar\s*kosong/i,
      /kamar\s*tersedia/i,
      /tersedia\s*(berapa|tidak)/i,
      /cek\s*kamar/i,
      /check\s*room/i,
      /ada\s*kamar/i,
      /availability/i,
    ],
    tool: 'get_availability_summary'
  },
  {
    intent: 'booking_stats',
    patterns: [
      /statistik/i,
      /stat(s)?/i,
      /revenue/i,
      /pendapatan/i,
      /omset/i,
      /laporan/i,
      /report/i,
      /ringkasan/i,
      /summary/i,
      /berapa\s*booking/i,
      /total\s*booking/i,
    ],
    tool: 'get_booking_stats'
  },
  {
    intent: 'room_status_update',
    patterns: [
      /(\d{3})\s*(sudah|udah|done)?\s*(check\s*-?\s*in|checkin|datang|masuk)/i,
      /(\d{3})\s*(sudah|udah|done)?\s*(check\s*-?\s*out|checkout|keluar|pergi)/i,
      /kamar\s*(\d{3})\s*(sudah|udah)/i,
      /tamu\s*(di\s*)?kamar\s*(\d{3})/i,
      /(check\s*-?\s*in|checkin)\s*(kamar\s*)?(\d{3})/i,
      /(check\s*-?\s*out|checkout)\s*(kamar\s*)?(\d{3})/i,
      // Checkout reminder quick response: "207 1" means checkout
      /^(\d{3})\s+1\s*$/i,
    ],
    tool: 'update_room_status'
  },
  {
    intent: 'late_checkout',
    patterns: [
      // "207 2 jam 17.00" or "207 LCO 17:00" or "207 late checkout jam 15"
      /(\d{3})\s+2\s+(jam\s*)?(\d{1,2})[:\.]?(\d{2})?/i,
      /(\d{3})\s*(late\s*check\s*-?\s*out|lco)\s*(jam\s*)?(\d{1,2})[:\.]?(\d{2})?/i,
      /late\s*check\s*-?\s*out\s*(kamar\s*)?(\d{3})\s*(jam\s*)?(\d{1,2})/i,
      /lco\s*(kamar\s*)?(\d{3})\s*(jam\s*)?(\d{1,2})/i,
    ],
    tool: 'set_late_checkout'
  },
  {
    intent: 'extend_stay',
    patterns: [
      /(\d{3})\s*(mau\s*)?(extend|perpanjang)/i,
      /(extend|perpanjang)\s*(kamar\s*)?(\d{3})/i,
      /tambah\s*\d+\s*malam/i,
      /perpanjang\s*\d+\s*malam/i,
      /extend\s*\d+\s*(night|malam)/i,
      // Checkout reminder quick response: "207 3 2 malam" means extend
      /^(\d{3})\s+3\s+(\d+)\s*(malam|night)?/i,
      /^(\d{3})\s+3\s+(tambah\s*)?(\d+)/i,
    ],
    tool: 'extend_stay'
  },
  {
    intent: 'create_booking',
    patterns: [
      /buat\s*booking/i,
      /create\s*booking/i,
      /booking\s*baru/i,
      /new\s*booking/i,
      /reservasi\s*baru/i,
      /pesan\s*kamar/i,
      /book\s*room/i,
    ],
    tool: 'create_admin_booking'
  },
  {
    intent: 'booking_search',
    patterns: [
      /cari\s*booking/i,
      /search\s*booking/i,
      /booking\s*(dari|milik|atas\s*nama)/i,
      /booking\s*[A-Z]{2,}/i,
      /kode\s*[A-Z]{2,}/i,
    ],
    tool: 'search_bookings'
  },
  {
    intent: 'booking_detail',
    patterns: [
      /detail\s*booking/i,
      /info\s*booking/i,
      /lihat\s*booking/i,
      /booking\s*detail/i,
    ],
    tool: 'get_booking_detail'
  },
  {
    intent: 'room_inventory',
    patterns: [
      /daftar\s*kamar/i,
      /list\s*kamar/i,
      /tipe\s*kamar/i,
      /room\s*types?/i,
      /kamar\s*apa\s*saja/i,
      /inventory/i,
    ],
    tool: 'get_room_inventory'
  },
  {
    intent: 'room_prices',
    patterns: [
      /harga\s*kamar/i,
      /room\s*prices?/i,
      /tarif/i,
      /rate/i,
      /berapa\s*harga/i,
    ],
    tool: 'get_room_prices'
  },
  {
    intent: 'send_reminder',
    patterns: [
      /kirim\s*reminder/i,
      /send\s*reminder/i,
      /notif\s*check\s*-?\s*in/i,
      /ingatkan\s*tamu/i,
      /reminder\s*check\s*-?\s*in/i,
    ],
    tool: 'send_checkin_reminder'
  },
  {
    intent: 'calendar_link',
    patterns: [
      /kalender/i,
      /calendar/i,
      /jadwal/i,
      /schedule/i,
      /lihat\s*booking/i,
    ],
    tool: 'send_calendar_link'
  },
  {
    intent: 'reschedule',
    patterns: [
      /reschedule/i,
      /ganti\s*tanggal/i,
      /ubah\s*tanggal/i,
      /pindah\s*tanggal/i,
      /change\s*date/i,
    ],
    tool: 'reschedule_booking'
  },
  {
    intent: 'change_room',
    patterns: [
      /ganti\s*kamar/i,
      /pindah\s*kamar/i,
      /change\s*room/i,
      /move\s*room/i,
    ],
    tool: 'change_booking_room'
  },
  {
    intent: 'update_guest',
    patterns: [
      /ubah\s*(nama|hp|email)/i,
      /ganti\s*(nama|hp|email)/i,
      /update\s*(nama|hp|email|guest)/i,
      /edit\s*(tamu|guest)/i,
    ],
    tool: 'update_guest_info'
  },
];

// Extract room number from message
function extractRoomNumber(message: string): string | undefined {
  const match = message.match(/\b(\d{3})\b/);
  return match?.[1];
}

// Extract date from message
function extractDate(message: string): string | undefined {
  // Match YYYY-MM-DD
  const isoMatch = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];
  
  // Match DD/MM or DD-MM
  const shortMatch = message.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
  if (shortMatch) {
    const day = shortMatch[1].padStart(2, '0');
    const month = shortMatch[2].padStart(2, '0');
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }
  
  return undefined;
}

// Detect check-in vs check-out intent
function detectCheckInOut(message: string): 'checked_in' | 'checked_out' | undefined {
  const lowerMsg = message.toLowerCase();
  
  // Check-out patterns (check first - more specific)
  if (/check\s*-?\s*out|checkout|keluar|pergi|done\s*out/i.test(lowerMsg)) {
    return 'checked_out';
  }
  
  // Check-in patterns
  if (/check\s*-?\s*in|checkin|datang|masuk|arrive|tiba/i.test(lowerMsg)) {
    return 'checked_in';
  }
  
  return undefined;
}

// Detect extend amount
function extractExtendInfo(message: string): { extra_nights?: number; new_check_out?: string } {
  const result: { extra_nights?: number; new_check_out?: string } = {};
  
  // Extract nights count
  const nightsMatch = message.match(/(\d+)\s*(malam|night|hari)/i);
  if (nightsMatch) {
    result.extra_nights = parseInt(nightsMatch[1]);
  }
  
  // Extract date
  const dateMatch = extractDate(message);
  if (dateMatch) {
    result.new_check_out = dateMatch;
  }
  
  return result;
}

// Extract late checkout info
function extractLateCheckoutInfo(message: string): { checkout_time?: string; fee?: number } {
  const result: { checkout_time?: string; fee?: number } = {};
  
  // Extract time - patterns like "17.00", "17:00", "jam 17", "15:30"
  const timePatterns = [
    /jam\s*(\d{1,2})[:\.](\d{2})/i,
    /jam\s*(\d{1,2})\b/i,
    /(\d{1,2})[:\.](\d{2})/,
    /\b(\d{1,2})\s*(wib)?$/i,
  ];
  
  for (const pattern of timePatterns) {
    const match = message.match(pattern);
    if (match) {
      const hour = match[1];
      const minute = match[2] || '00';
      result.checkout_time = `${hour.padStart(2, '0')}:${minute}`;
      break;
    }
  }
  
  // Extract fee - patterns like "biaya 100000", "fee 150000", "100rb", "100k"
  const feePatterns = [
    /biaya\s*(\d+)/i,
    /fee\s*(\d+)/i,
    /(\d+)\s*rb/i,
    /(\d+)\s*k\b/i,
    /rp\s*(\d+)/i,
  ];
  
  for (const pattern of feePatterns) {
    const match = message.match(pattern);
    if (match) {
      let fee = parseInt(match[1]);
      // Handle shorthand like "100rb" or "100k"
      if (/rb/i.test(message) || /k\b/i.test(message)) {
        fee *= 1000;
      }
      result.fee = fee;
      break;
    }
  }
  
  return result;
}

export function detectIntent(message: string): IntentMatch {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check each pattern
  for (const { intent, patterns, tool } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        const extractedParams: Record<string, string> = {};
        
        // Extract relevant parameters based on intent
        if (intent === 'room_status_update') {
          const roomNum = extractRoomNumber(message);
          if (roomNum) extractedParams.room_number = roomNum;
          
          // Check for quick response pattern "207 1"
          if (/^\d{3}\s+1\s*$/.test(message.trim())) {
            extractedParams.new_status = 'checked_out';
          } else {
            const status = detectCheckInOut(message);
            if (status) extractedParams.new_status = status;
          }
        } else if (intent === 'late_checkout') {
          const roomNum = extractRoomNumber(message);
          if (roomNum) extractedParams.room_number = roomNum;
          
          // Extract time and fee
          const lcoInfo = extractLateCheckoutInfo(message);
          if (lcoInfo.checkout_time) extractedParams.checkout_time = lcoInfo.checkout_time;
          if (lcoInfo.fee) extractedParams.fee = String(lcoInfo.fee);
        } else if (intent === 'extend_stay') {
          const roomNum = extractRoomNumber(message);
          if (roomNum) extractedParams.room_number = roomNum;
          
          const extendInfo = extractExtendInfo(message);
          if (extendInfo.extra_nights) extractedParams.extra_nights = String(extendInfo.extra_nights);
          if (extendInfo.new_check_out) extractedParams.new_check_out = extendInfo.new_check_out;
        }
        
        return {
          intent,
          confidence: 'high',
          suggestedTool: tool,
          extractedParams: Object.keys(extractedParams).length > 0 ? extractedParams : undefined
        };
      }
    }
  }
  
  // Default to general intent
  return { intent: 'general', confidence: 'low' };
}

// Generate tool guidance hint for system prompt
export function getToolGuidanceHint(intentMatch: IntentMatch): string {
  if (!intentMatch.suggestedTool || intentMatch.confidence === 'low') {
    return '';
  }
  
  let hint = `\n\n🎯 INTENT DETECTED: "${intentMatch.intent}" → Gunakan tool "${intentMatch.suggestedTool}"`;
  
  if (intentMatch.extractedParams) {
    const params = Object.entries(intentMatch.extractedParams)
      .map(([k, v]) => `${k}="${v}"`)
      .join(', ');
    hint += ` dengan parameter: ${params}`;
  }
  
  return hint;
}
