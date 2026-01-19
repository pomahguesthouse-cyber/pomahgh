// ============= INTENT DETECTOR FOR FORCED TOOL CALLS =============
// Detects user intents that require pre-fetching data from tools
// before sending to AI to prevent hallucination

export interface ForcedToolIntent {
  tool: string;
  args: Record<string, unknown>;
  description: string;
}

/**
 * Detect if user message requires forced tool call before AI processing.
 * This helps prevent AI hallucination by ensuring real data is available.
 */
export function detectForcedToolIntent(message: string): ForcedToolIntent | null {
  const lowerMsg = message.toLowerCase().trim();
  
  // Pattern 1: "daftar tamu", "list tamu", "info tamu", "siapa check-in/check-out/menginap"
  if (/(?:daftar|list|info|siapa|ada|berapa)\s*(?:tamu|check-?in|check-?out|menginap|nginap)/i.test(lowerMsg) ||
      /(?:tamu|guest)\s*(?:hari ini|sekarang|saat ini)/i.test(lowerMsg) ||
      /(?:hari ini|sekarang)\s*(?:ada|siapa|berapa)\s*(?:tamu|check-?in)/i.test(lowerMsg)) {
    return {
      tool: 'get_today_guests',
      args: { type: 'all' },
      description: 'Mengambil data tamu hari ini'
    };
  }
  
  // Pattern 2: "statistik booking", "rekap booking", "summary booking"
  if (/(?:statistik|rekap|summary|ringkasan|laporan)\s*(?:booking|pemesanan)/i.test(lowerMsg) ||
      /(?:booking|pemesanan)\s*(?:statistik|rekap|summary)/i.test(lowerMsg)) {
    return {
      tool: 'get_booking_stats',
      args: {},
      description: 'Mengambil statistik booking'
    };
  }
  
  // Pattern 3: "ketersediaan kamar", "availability", "kamar tersedia"
  if (/(?:ketersediaan|availability|tersedia|kosong)\s*(?:kamar|room)/i.test(lowerMsg) ||
      /(?:kamar|room)\s*(?:tersedia|kosong|available)/i.test(lowerMsg) ||
      /(?:cek|check)\s*(?:ketersediaan|availability)/i.test(lowerMsg)) {
    return {
      tool: 'get_availability_summary',
      args: {},
      description: 'Mengambil data ketersediaan kamar'
    };
  }
  
  // Pattern 4: "booking terbaru", "booking terakhir", "recent bookings"
  if (/(?:booking|pemesanan)\s*(?:terbaru|terakhir|recent|baru)/i.test(lowerMsg) ||
      /(?:terbaru|terakhir|recent)\s*(?:booking|pemesanan)/i.test(lowerMsg)) {
    return {
      tool: 'get_recent_bookings',
      args: { limit: 10 },
      description: 'Mengambil booking terbaru'
    };
  }
  
  // Pattern 5: "harga kamar", "daftar harga", "price list"
  if (/(?:harga|price|tarif)\s*(?:kamar|room)/i.test(lowerMsg) ||
      /(?:daftar|list)\s*(?:harga|price|tarif)/i.test(lowerMsg)) {
    return {
      tool: 'get_room_prices',
      args: {},
      description: 'Mengambil daftar harga kamar'
    };
  }
  
  return null;
}

/**
 * Format tool result for injection into conversation context
 */
export function formatToolResultForContext(tool: string, result: unknown): string {
  const jsonResult = JSON.stringify(result, null, 2);
  return `\n\n📊 DATA TERKINI (dari tool ${tool}):\n\`\`\`json\n${jsonResult}\n\`\`\`\n\n⚠️ GUNAKAN DATA DI ATAS untuk menjawab. ABAIKAN informasi dari conversation history sebelumnya.`;
}
