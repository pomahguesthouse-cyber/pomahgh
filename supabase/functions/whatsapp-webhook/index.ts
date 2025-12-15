import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Indonesian month names for date formatting
const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Helper function to format date in Indonesian (e.g., "15 Januari 2025")
function formatDateIndonesian(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const month = INDONESIAN_MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

// Rate limiter: track messages per phone number
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // max messages
const RATE_LIMIT_WINDOW = 60 * 1000; // per minute

function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(phone);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(phone, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Detect booking intent with room name
function detectBookingWithRoom(message: string): { isBooking: boolean; roomName?: string } {
  const lowerMsg = message.toLowerCase();
  const bookingPattern = /(booking|pesan|reservasi|mau\s+book|ambil|book)\s+(kamar\s+)?(single|deluxe|grand\s*deluxe|family\s*suite|villa)/i;
  const match = lowerMsg.match(bookingPattern);
  
  if (match) {
    return {
      isBooking: true,
      roomName: match[3].replace(/\s+/g, ' ').trim()
    };
  }
  
  // Check simpler patterns
  const simplePattern = /(booking|pesan|book)\s+(single|deluxe|grand|family|villa)/i;
  const simpleMatch = lowerMsg.match(simplePattern);
  if (simpleMatch) {
    return {
      isBooking: true,
      roomName: simpleMatch[2]
    };
  }
  
  return { isBooking: false };
}

// Format phone number to standard format
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  }
  if (!normalized.startsWith('62')) {
    normalized = '62' + normalized;
  }
  return normalized;
}

// Indonesian slang/typo normalizer for smarter understanding
function normalizeIndonesianMessage(msg: string): string {
  const slangMap: Record<string, string> = {
    // Room types
    'dlx': 'deluxe', 'delux': 'deluxe', 'dluxe': 'deluxe',
    'grnd': 'grand', 'grd': 'grand',
    'fam': 'family', 'fmly': 'family',
    'sgl': 'single', 'sngl': 'single',
    'kmr': 'kamar', 'kmar': 'kamar',
    
    // Common words
    'brp': 'berapa', 'brapa': 'berapa',
    'bs': 'bisa', 'bsa': 'bisa', 'bza': 'bisa',
    'gk': 'tidak', 'ga': 'tidak', 'ngga': 'tidak', 'gak': 'tidak', 'nggak': 'tidak',
    'sy': 'saya', 'aku': 'saya', 'ak': 'saya', 'gw': 'saya', 'gue': 'saya',
    'mlm': 'malam', 'malem': 'malam',
    'org': 'orang', 'orng': 'orang',
    'tgl': 'tanggal', 'tggl': 'tanggal',
    'kpn': 'kapan', 'kapn': 'kapan',
    'bsk': 'besok', 'besuk': 'besok',
    'lsa': 'lusa',
    'gmn': 'bagaimana', 'gimana': 'bagaimana', 'gmna': 'bagaimana',
    'emg': 'memang', 'emang': 'memang',
    'udh': 'sudah', 'udah': 'sudah', 'sdh': 'sudah',
    'blm': 'belum', 'blum': 'belum',
    'yg': 'yang', 'yng': 'yang',
    'dg': 'dengan', 'dgn': 'dengan',
    'utk': 'untuk', 'utuk': 'untuk', 'buat': 'untuk',
    'krn': 'karena', 'krna': 'karena', 'soalnya': 'karena',
    'lg': 'lagi', 'lgi': 'lagi',
    'msh': 'masih', 'msih': 'masih',
    'jg': 'juga', 'jga': 'juga',
    'dlu': 'dulu', 'dl': 'dulu',
    'ntar': 'nanti', 'ntr': 'nanti',
    'bgt': 'banget', 'bngt': 'banget',
    'aja': 'saja', 'aj': 'saja',
    'klo': 'kalau', 'kalu': 'kalau', 'kl': 'kalau', 'klu': 'kalau',
    'trus': 'terus', 'trs': 'terus',
    'abis': 'habis', 'abs': 'habis',
    'tp': 'tapi', 'tpi': 'tapi',
    'sm': 'sama', 'ama': 'sama',
    'pdhl': 'padahal',
    'trims': 'terima kasih', 'tq': 'terima kasih', 'ty': 'terima kasih', 'thx': 'terima kasih', 'makasih': 'terima kasih', 'mksh': 'terima kasih',
    
    // Numbers
    'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4', 'lima': '5',
    'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9', 'sepuluh': '10',
  };
  
  let normalized = msg.toLowerCase();
  
  // Replace slang words (word boundaries)
  for (const [slang, replacement] of Object.entries(slangMap)) {
    const regex = new RegExp(`\\b${slang}\\b`, 'gi');
    normalized = normalized.replace(regex, replacement);
  }
  
  return normalized;
}

// Detect user sentiment/mood
function detectSentiment(message: string): 'positive' | 'neutral' | 'negative' | 'confused' | 'urgent' {
  const lowerMsg = message.toLowerCase();
  
  const negativeWords = ['kecewa', 'mahal', 'lama', 'susah', 'ga jelas', 'bingung', 'ribet', 'jelek', 'buruk', 'lambat', 'kesal', 'marah', 'complaint', 'komplain'];
  const positiveWords = ['bagus', 'mantap', 'oke', 'siap', 'terima kasih', 'keren', 'senang', 'baik', 'good', 'nice', 'perfect', 'sip', 'mantul', 'makasih', 'thx', 'thanks'];
  const confusedWords = ['gimana', 'gmn', 'ga ngerti', 'maksudnya', 'apa sih', 'caranya', 'bingung', 'confused', 'gak paham', 'ga mudeng'];
  const urgentWords = ['urgent', 'segera', 'cepat', 'hari ini', 'sekarang', 'darurat', 'penting', 'asap', 'buru', 'buruan'];
  
  if (urgentWords.some(w => lowerMsg.includes(w))) return 'urgent';
  if (negativeWords.some(w => lowerMsg.includes(w))) return 'negative';
  if (confusedWords.some(w => lowerMsg.includes(w))) return 'confused';
  if (positiveWords.some(w => lowerMsg.includes(w))) return 'positive';
  
  return 'neutral';
}

// Parse relative Indonesian date expressions to concrete dates
function parseRelativeDate(expression: string): { check_in: string; check_out: string; description: string } | null {
  // Get current date in WIB (UTC+7)
  const now = new Date();
  const wibOffset = 7 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (wibOffset * 60000));
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
  
  const getNextDayOfWeek = (dayIndex: number) => {
    const result = new Date(wibTime);
    const currentDay = result.getDay();
    const daysUntil = (dayIndex - currentDay + 7) % 7 || 7;
    result.setDate(result.getDate() + daysUntil);
    return result;
  };
  
  const lower = expression.toLowerCase();
  
  if (lower.match(/\b(malam ini|nanti malam|hari ini|sekarang|tonight|today)\b/)) {
    return { check_in: formatDate(wibTime), check_out: formatDate(addDays(wibTime, 1)), description: 'malam ini' };
  }
  
  if (lower.match(/\b(besok|bsk|besuk|tomorrow)\b/)) {
    const besok = addDays(wibTime, 1);
    return { check_in: formatDate(besok), check_out: formatDate(addDays(besok, 1)), description: 'besok' };
  }
  
  if (lower.match(/\b(lusa|lsa)\b/)) {
    const lusa = addDays(wibTime, 2);
    return { check_in: formatDate(lusa), check_out: formatDate(addDays(lusa, 1)), description: 'lusa' };
  }
  
  if (lower.match(/\b(minggu depan|pekan depan|next week)\b/)) {
    const nextWeek = addDays(wibTime, 7);
    return { check_in: formatDate(nextWeek), check_out: formatDate(addDays(nextWeek, 1)), description: 'minggu depan' };
  }
  
  if (lower.match(/\b(weekend ini|akhir pekan ini|weekend|akhir pekan)\b/) && !lower.includes('depan')) {
    const saturday = getNextDayOfWeek(6);
    return { check_in: formatDate(saturday), check_out: formatDate(addDays(saturday, 2)), description: 'weekend ini' };
  }
  
  if (lower.match(/\b(weekend depan|akhir pekan depan)\b/)) {
    const thisSaturday = getNextDayOfWeek(6);
    const nextSaturday = addDays(thisSaturday, 7);
    return { check_in: formatDate(nextSaturday), check_out: formatDate(addDays(nextSaturday, 2)), description: 'weekend depan' };
  }
  
  const daysAheadMatch = lower.match(/(\d+)\s*(hari|hr)\s*(lagi|kedepan|ke depan)/);
  if (daysAheadMatch) {
    const days = parseInt(daysAheadMatch[1]);
    const targetDate = addDays(wibTime, days);
    return { check_in: formatDate(targetDate), check_out: formatDate(addDays(targetDate, 1)), description: `${days} hari lagi` };
  }
  
  const dayNames: Record<string, number> = {
    'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3, 
    'kamis': 4, 'jumat': 5, 'jum\'at': 5, 'sabtu': 6
  };
  
  for (const [dayName, dayIndex] of Object.entries(dayNames)) {
    if (lower.includes(dayName)) {
      const targetDay = getNextDayOfWeek(dayIndex);
      if (lower.includes('depan')) {
        targetDay.setDate(targetDay.getDate() + 7);
      }
      return { check_in: formatDate(targetDay), check_out: formatDate(addDays(targetDay, 1)), description: `hari ${dayName}` };
    }
  }
  
  return null;
}

// Extract context from conversation
function extractContext(messages: Array<{role: string, content: string}>): Record<string, any> {
  const context: Record<string, any> = {};
  const allText = messages.map(m => m.content).join(' ').toLowerCase();
  
  // Extract guest name (look for "nama saya X" or "saya X" patterns)
  const namePatterns = [
    /nama\s+saya\s+([a-zA-Z\s]+?)(?:\s*,|\s+dan|\s+email|\s+hp|\s+wa|\.|$)/i,
    /saya\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/,
    /(?:atas\s+nama|a\.?n\.?)\s+([a-zA-Z\s]+?)(?:\s*,|\s+dan|\s+email|\.|$)/i,
  ];
  for (const pattern of namePatterns) {
    const match = allText.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      context.guest_name = match[1].trim();
      break;
    }
  }
  
  // Extract room preference
  const roomTypes = ['deluxe', 'grand deluxe', 'family', 'single', 'villa', 'suite', 'standard', 'superior'];
  for (const room of roomTypes) {
    if (allText.includes(room)) {
      context.preferred_room = room.charAt(0).toUpperCase() + room.slice(1);
      break;
    }
  }
  
  // Extract parsed relative date from last user message
  const lastUserMsgRaw = messages.filter(m => m.role === 'user').pop()?.content || '';
  const parsedDate = parseRelativeDate(lastUserMsgRaw);
  if (parsedDate) {
    context.parsed_date = parsedDate;
  }
  
  // Extract guest count
  const guestMatch = allText.match(/(\d+)\s*(orang|tamu|org|guest)/i);
  if (guestMatch) {
    context.guest_count = parseInt(guestMatch[1]);
  }
  
  // Extract date hints
  const datePatterns = [
    /(\d{1,2})\s*(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/gi,
    /(besok|lusa|hari ini|minggu depan|weekend)/i,
  ];
  for (const pattern of datePatterns) {
    const match = allText.match(pattern);
    if (match) {
      context.dates = match[0];
      break;
    }
  }
  
  // Detect room from booking message and update preferred_room
  const bookingIntent = detectBookingWithRoom(lastUserMsgRaw);
  if (bookingIntent.isBooking && bookingIntent.roomName) {
    context.preferred_room = bookingIntent.roomName;
    context.last_topic = 'booking';
  }
  
  // Detect last topic (only if not already set by booking intent)
  const lastUserMsg = lastUserMsgRaw.toLowerCase();
  if (!context.last_topic) {
    if (lastUserMsg.includes('kamar') || lastUserMsg.includes('room') || lastUserMsg.includes('tipe')) {
      context.last_topic = 'rooms';
    } else if (lastUserMsg.includes('booking') || lastUserMsg.includes('pesan') || lastUserMsg.includes('reservasi')) {
      context.last_topic = 'booking';
    } else if (lastUserMsg.includes('harga') || lastUserMsg.includes('tarif') || lastUserMsg.includes('price')) {
      context.last_topic = 'pricing';
    } else if (lastUserMsg.includes('fasilitas') || lastUserMsg.includes('facility')) {
      context.last_topic = 'facilities';
    } else if (lastUserMsg.includes('bayar') || lastUserMsg.includes('transfer') || lastUserMsg.includes('payment')) {
      context.last_topic = 'payment';
    } else if (lastUserMsg.includes('lokasi') || lastUserMsg.includes('alamat') || lastUserMsg.includes('dimana')) {
      context.last_topic = 'location';
    } else if (lastUserMsg.match(/tanggal|besok|lusa|\d+\s*(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i)) {
      context.last_topic = 'availability';
    }
  }
  
  // Detect sentiment from last message
  context.sentiment = detectSentiment(lastUserMsg);
  
  return context;
}

// Format AI response for WhatsApp compatibility
function formatForWhatsApp(text: string): string {
  // Remove markdown tables
  text = text.replace(/\|[^\n]+\|/g, '');
  text = text.replace(/\|-+\|/g, '');
  
  // Convert markdown bold to WhatsApp bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '*$1*');
  
  // Convert markdown headers to bold
  text = text.replace(/^###?\s*(.+)$/gm, '*$1*');
  
  // Remove excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Limit to WhatsApp max (4096 chars)
  if (text.length > 4000) {
    text = text.substring(0, 3997) + '...';
  }
  
  return text.trim();
}

// Remove consecutive duplicate assistant messages to prevent stuck loops
function deduplicateHistory(messages: Array<{role: string, content: string}>) {
  const cleaned: typeof messages = [];
  let lastAssistantContent = '';
  
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      // Skip if same as previous assistant message
      if (msg.content === lastAssistantContent) {
        console.log("⚠️ Skipping duplicate assistant message");
        continue;
      }
      lastAssistantContent = msg.content;
    }
    cleaned.push(msg);
  }
  return cleaned;
}

// Detect if AI is stuck repeating itself
function detectStuckLoop(messages: Array<{role: string, content: string}>): boolean {
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  if (assistantMessages.length < 3) return false;
  
  const lastThree = assistantMessages.slice(-3);
  // If last 3 assistant responses are identical or very similar, AI is stuck
  const firstContent = lastThree[0].content.substring(0, 200);
  return lastThree.every(m => m.content.substring(0, 200) === firstContent);
}

// Detect if user is asking about room list (no dates needed)
function detectRoomListIntent(message: string): boolean {
  const lowerMsg = message.toLowerCase();
  const listPatterns = /(ada kamar apa|tipe kamar|list kamar|daftar kamar|harga kamar|pilihan kamar|kamar apa saja|kamar yang tersedia|jenis kamar|macam kamar)/i;
  return listPatterns.test(lowerMsg);
}

// Detect follow-up date question (user asking about different date without room type)
function detectFollowUpDateIntent(message: string): { isFollowUp: boolean; dateHint?: string } {
  const lowerMsg = message.toLowerCase();
  // Patterns like "kalau tanggal 6?", "gimana tanggal 15 januari?", "kalau 6 desember?"
  const followUpPatterns = /(kalau|kalua|gimana|bagaimana|kalo|gimana kalau|bagaimana kalau|kl|klu).*(tanggal|tgl|\d+\s*(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)|desember|januari|februari)/i;
  const dateOnlyPattern = /^(kalau|kalua|gimana|bagaimana|kalo|kl|klu)\s+(tanggal\s*)?\d+(\s*(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember))?\s*\??$/i;
  
  const isFollowUp = followUpPatterns.test(lowerMsg) || dateOnlyPattern.test(lowerMsg);
  
  // Extract date hint
  const dateMatch = lowerMsg.match(/(\d+\s*(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)|tanggal\s*\d+)/i);
  
  return {
    isFollowUp,
    dateHint: dateMatch?.[0]
  };
}

// (Quick response system removed - all messages now go through AI)

// Detect booking intent in user message (room type + date)
function detectBookingIntent(message: string): {
  hasRoomType: boolean;
  hasDate: boolean;
  roomType?: string;
  dateHint?: string;
} {
  const lowerMsg = message.toLowerCase();
  
  // Room type patterns
  const roomPatterns = /(deluxe|superior|villa|standard|family|suite|twin|double|single)/i;
  const roomMatch = lowerMsg.match(roomPatterns);
  
  // Date patterns (Indonesian)
  const datePatterns = /(besok|lusa|hari ini|tanggal \d+|minggu depan|weekend|akhir pekan|\d+ (januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)|januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i;
  const dateMatch = lowerMsg.match(datePatterns);
  
  return {
    hasRoomType: !!roomMatch,
    hasDate: !!dateMatch,
    roomType: roomMatch?.[0],
    dateHint: dateMatch?.[0]
  };
}
// Format availability response from tool result
function formatAvailabilityResponse(data: any, parsedDate: any): string {
  const dateDesc = parsedDate?.description || 'tanggal yang dipilih';
  const checkIn = parsedDate?.check_in ? formatDateIndonesian(parsedDate.check_in) : '';
  const checkOut = parsedDate?.check_out ? formatDateIndonesian(parsedDate.check_out) : '';
  
  // Handle tool error
  if (data.error) {
    return `❌ Maaf, terjadi kesalahan saat cek ketersediaan: ${data.error}\n\nSilakan coba lagi atau hubungi admin 😊`;
  }
  
  // Handle available_rooms format
  if (data.available_rooms && data.available_rooms.length > 0) {
    let response = `✅ *Ketersediaan ${dateDesc}*\n📅 ${checkIn}${checkOut ? ` - ${checkOut}` : ''}\n\n`;
    
  for (const room of data.available_rooms) {
    const availableCount = room.available_count ?? room.available ?? 0;
    const pricePerNight = room.price_per_night ?? room.price ?? 0;
    const formattedPrice = typeof pricePerNight === 'number' ? pricePerNight.toLocaleString('id-ID') : pricePerNight;
    response += `🛏️ *${room.name}*\n`;
    response += `   ${availableCount} unit tersedia\n`;
    response += `   Rp ${formattedPrice}/malam\n\n`;
  }
    
    response += `Mau booking yang mana? 😊\nKetik: "booking [nama kamar]"`;
    return response;
  }
  
  // Handle rooms format (alternative structure)
  if (data.rooms && data.rooms.length > 0) {
    let response = `✅ *Ketersediaan ${dateDesc}*\n📅 ${checkIn}${checkOut ? ` - ${checkOut}` : ''}\n\n`;
    
    for (const room of data.rooms) {
      if (room.available_count > 0) {
        const price = typeof room.price_per_night === 'number' ? room.price_per_night.toLocaleString('id-ID') : room.price_per_night;
        response += `🛏️ *${room.name}*\n`;
        response += `   ${room.available_count} unit tersedia\n`;
        response += `   Rp ${price}/malam\n\n`;
      }
    }
    
    response += `Mau booking yang mana? 😊\nKetik: "booking [nama kamar]"`;
    return response;
  }
  
  // No rooms available
  return `❌ Maaf, tidak ada kamar tersedia untuk *${dateDesc}* (${checkIn}).\n\nMau cek tanggal lain? 😊`;
}

// Smart fallback based on context and sentiment
function getSmartFallback(message: string, context: Record<string, any>): string {
  const lowerMsg = message.toLowerCase();
  const sentiment = context.sentiment || 'neutral';
  
  // Sentiment-aware opening
  let opener = '';
  if (sentiment === 'negative') {
    opener = 'Mohon maaf atas ketidaknyamanannya 🙏\n\n';
  } else if (sentiment === 'confused') {
    opener = 'Tidak apa-apa, saya bantu jelaskan ya! 😊\n\n';
  } else if (sentiment === 'urgent') {
    opener = 'Baik, saya bantu segera! 🏃\n\n';
  }
  
  // If parsed_date exists, this means user mentioned relative date - signal that we detected it
  if (context.parsed_date) {
    const dateDesc = context.parsed_date.description || 'tanggal tersebut';
    return opener + `📅 Saya mendeteksi Anda ingin cek kamar untuk *${dateDesc}*.\n\nMohon tunggu, saya cek ketersediaannya... 🔍`;
  }
  
  // Context-aware response with relative date detection
  if (context.last_topic === 'availability' || 
      lowerMsg.includes('tanggal') || 
      lowerMsg.includes('kapan') ||
      lowerMsg.includes('malam ini') ||
      lowerMsg.includes('hari ini') ||
      lowerMsg.includes('besok') ||
      lowerMsg.includes('lusa')) {
    return opener + '📅 Untuk cek ketersediaan, mohon sebutkan:\n\n1️⃣ Tanggal check-in (contoh: 15 Januari)\n2️⃣ Tanggal check-out (contoh: 17 Januari)\n3️⃣ Jumlah tamu\n\nContoh: "cek kamar 15-17 Januari untuk 2 orang"';
  }
  
  if (context.last_topic === 'booking') {
    const missing = [];
    if (!context.guest_name) missing.push('nama lengkap');
    if (!context.dates) missing.push('tanggal check-in & check-out');
    if (!context.preferred_room) missing.push('tipe kamar');
    
    if (missing.length > 0) {
      return opener + `📝 Untuk melanjutkan booking, saya butuh informasi berikut:\n\n${missing.map((m, i) => `${i+1}️⃣ ${m.charAt(0).toUpperCase() + m.slice(1)}`).join('\n')}\n\nSilakan lengkapi ya! 😊`;
    }
  }
  
  if (context.last_topic === 'payment') {
    return opener + '💳 Untuk informasi pembayaran:\n\n🏦 *Bank BCA*\nNo. Rek: 0095584379\nA/N: Faizal Abdurachman\n\nSetelah transfer, kirim bukti bayar ke chat ini ya! 😊';
  }
  
  // Default helpful response
  return opener + 'Halo! 👋 Saya Rani dari Pomah Guesthouse.\n\nSilakan tanyakan tentang:\n• *Kamar* - tipe & harga\n• *Fasilitas* - info fasilitas hotel\n• *Booking* - cara reservasi\n• *Lokasi* - alamat & kontak\n\nAtau langsung ketik pertanyaan Anda! 😊';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET request for Fonnte webhook verification
  if (req.method === 'GET') {
    console.log("Webhook verification GET request received");
    return new Response(JSON.stringify({ 
      status: "ok", 
      message: "WhatsApp webhook is active",
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FONNTE_API_KEY = Deno.env.get("FONNTE_API_KEY");

    if (!FONNTE_API_KEY) {
      throw new Error("FONNTE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse incoming webhook - handle JSON, form-urlencoded, or raw text
    let body: any;
    const contentType = req.headers.get('content-type') || '';
    console.log("Request content-type:", contentType);
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);

    try {
      if (contentType.includes('application/json')) {
        body = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        body = Object.fromEntries(formData.entries());
      } else {
        // Try raw text and parse as either JSON or form-urlencoded
        const text = await req.text();
        console.log("Raw request body:", text.substring(0, 500));
        
        if (!text || text.trim() === '') {
          console.log("Empty body, skipping");
          return new Response(JSON.stringify({ status: "skipped", reason: "empty body" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        try {
          body = JSON.parse(text);
        } catch {
          // Try form-urlencoded parsing
          const params = new URLSearchParams(text);
          body = Object.fromEntries(params.entries());
        }
      }
    } catch (parseError) {
      console.error("Body parse error:", parseError);
      return new Response(JSON.stringify({ status: "error", reason: "invalid body format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Parsed webhook body:", JSON.stringify(body));

    const { sender, message, device, url: mediaUrl } = body;

    if (!sender || !message) {
      console.log("Missing sender or message, skipping");
      return new Response(JSON.stringify({ status: "skipped", reason: "no sender or message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = normalizePhone(sender);
    console.log(`Processing message from ${phone}: "${message}"`);
    
    // Normalize message for better understanding
    const normalizedMessage = normalizeIndonesianMessage(message);
    console.log(`Normalized message: "${normalizedMessage}"`);

    // Check rate limit
    if (!checkRateLimit(phone)) {
      console.log(`Rate limited: ${phone}`);
      return new Response(JSON.stringify({ status: "rate_limited" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get hotel settings for WhatsApp configuration
    const { data: hotelSettings } = await supabase
      .from('hotel_settings')
      .select('whatsapp_session_timeout_minutes, whatsapp_ai_whitelist, whatsapp_contact_numbers, whatsapp_response_mode')
      .single();
    
    const sessionTimeoutMinutes = hotelSettings?.whatsapp_session_timeout_minutes || 15;
    const aiWhitelist: string[] = hotelSettings?.whatsapp_ai_whitelist || [];
    const responseMode = hotelSettings?.whatsapp_response_mode || 'ai';
    
    console.log(`Session timeout: ${sessionTimeoutMinutes} minutes, AI whitelist: ${aiWhitelist.length} numbers, Response mode: ${responseMode}`);

    // Check if phone is blocked
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone_number', phone)
      .single();

    if (session?.is_blocked) {
      console.log(`Blocked phone: ${phone}`);
      return new Response(JSON.stringify({ status: "blocked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if MANUAL response mode is enabled (all messages go to admin)
    if (responseMode === 'manual') {
      console.log(`📱 MANUAL MODE - skipping AI for ${phone}`);
      
      // Get or create conversation for logging
      let manualConversationId = session?.conversation_id;
      if (!manualConversationId) {
        const { data: newConv } = await supabase
          .from('chat_conversations')
          .insert({ session_id: `wa_${phone}_${Date.now()}`, message_count: 0 })
          .select()
          .single();
        manualConversationId = newConv?.id;
      }
      
      // Log user message without AI processing
      if (manualConversationId) {
        await supabase.from('chat_messages').insert({
          conversation_id: manualConversationId,
          role: 'user',
          content: message,
        });
        
        const { data: convData } = await supabase
          .from('chat_conversations')
          .select('message_count')
          .eq('id', manualConversationId)
          .single();
        
        await supabase
          .from('chat_conversations')
          .update({ message_count: (convData?.message_count || 0) + 1 })
          .eq('id', manualConversationId);
      }
      
      // Auto-set session to takeover mode for admin
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          phone_number: phone,
          conversation_id: manualConversationId,
          last_message_at: new Date().toISOString(),
          is_active: true,
          is_takeover: true,
          takeover_at: new Date().toISOString(),
        }, { onConflict: 'phone_number' });
      
      return new Response(JSON.stringify({ 
        status: "manual_mode", 
        message: "Message logged for admin response",
        conversation_id: manualConversationId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if phone is in AI whitelist (should NOT be served by AI)
    if (aiWhitelist.includes(phone)) {
      console.log(`Phone ${phone} is in AI whitelist - auto takeover mode`);
      
      // Get or create conversation for logging
      let whitelistConversationId = session?.conversation_id;
      if (!whitelistConversationId) {
        const { data: newConv } = await supabase
          .from('chat_conversations')
          .insert({ session_id: `wa_${phone}_${Date.now()}`, message_count: 0 })
          .select()
          .single();
        whitelistConversationId = newConv?.id;
      }
      
      // Log user message without AI processing
      if (whitelistConversationId) {
        await supabase.from('chat_messages').insert({
          conversation_id: whitelistConversationId,
          role: 'user',
          content: message,
        });
        
        const { data: convData } = await supabase
          .from('chat_conversations')
          .select('message_count')
          .eq('id', whitelistConversationId)
          .single();
        
        await supabase
          .from('chat_conversations')
          .update({ message_count: (convData?.message_count || 0) + 1 })
          .eq('id', whitelistConversationId);
      }
      
      // Update or create session with takeover mode
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          phone_number: phone,
          conversation_id: whitelistConversationId,
          last_message_at: new Date().toISOString(),
          is_active: true,
          is_takeover: true,
          takeover_at: new Date().toISOString(),
        }, { onConflict: 'phone_number' });
      
      return new Response(JSON.stringify({ 
        status: "whitelist_takeover", 
        message: "Phone in AI whitelist - message logged for admin",
        conversation_id: whitelistConversationId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if session is in takeover mode (admin handling manually)
    if (session?.is_takeover) {
      console.log(`Session ${phone} is in takeover mode - skipping AI, logging message only`);
      
      // Get or create conversation for logging
      let takeoverConversationId = session.conversation_id;
      if (!takeoverConversationId) {
        const { data: newConv } = await supabase
          .from('chat_conversations')
          .insert({ session_id: `wa_${phone}_${Date.now()}`, message_count: 0 })
          .select()
          .single();
        takeoverConversationId = newConv?.id;
      }
      
      // Log user message without AI processing
      if (takeoverConversationId) {
        await supabase.from('chat_messages').insert({
          conversation_id: takeoverConversationId,
          role: 'user',
          content: message,
        });
        
        // Get current count and increment
        const { data: convData } = await supabase
          .from('chat_conversations')
          .select('message_count')
          .eq('id', takeoverConversationId)
          .single();
        
        await supabase
          .from('chat_conversations')
          .update({ message_count: (convData?.message_count || 0) + 1 })
          .eq('id', takeoverConversationId);
      }
      
      // Update last_message_at so admin sees new message notification
      await supabase
        .from('whatsapp_sessions')
        .update({ 
          last_message_at: new Date().toISOString(),
          conversation_id: takeoverConversationId,
        })
        .eq('phone_number', phone);
      
      return new Response(JSON.stringify({ 
        status: "takeover_mode", 
        message: "Message logged, awaiting admin response",
        conversation_id: takeoverConversationId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create conversation
    let conversationId = session?.conversation_id;
    
    // Check if session is stale (configurable timeout)
    const SESSION_TIMEOUT = sessionTimeoutMinutes * 60 * 1000;
    const lastMessageAt = session?.last_message_at ? new Date(session.last_message_at).getTime() : 0;
    const isStale = Date.now() - lastMessageAt > SESSION_TIMEOUT;

    if (!conversationId || isStale) {
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          session_id: `wa_${phone}_${Date.now()}`,
          message_count: 0,
        })
        .select()
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
        throw convError;
      }

      conversationId = newConv.id;
      console.log(`Created new conversation: ${conversationId}`);
    }

    // Update or create WhatsApp session
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone_number: phone,
        conversation_id: conversationId,
        last_message_at: new Date().toISOString(),
        is_active: true,
        context: session?.context || {},
      }, { onConflict: 'phone_number' });

    // Log user message
    await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
      });

    // Update message count
    await supabase
      .from('chat_conversations')
      .update({ message_count: (session?.context?.message_count || 0) + 1 })
      .eq('id', conversationId);


    // All messages now go through AI (quick response system removed)

    // Build conversation history for AI (reduced from 20 to 12 for better context)
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(12);

    // Apply deduplication to remove consecutive duplicate assistant messages
    const rawMessages = history?.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })) || [{ role: 'user' as const, content: message }];

    // Deduplicate and check for stuck loop
    let messages = deduplicateHistory(rawMessages);
    
    // If AI is stuck in a loop, reset context to only last 2 messages
    if (detectStuckLoop(messages)) {
      console.log("⚠️ Detected stuck AI loop - resetting context to last 2 messages");
      messages = messages.slice(-2);
    }

    // Extract conversation context for smarter AI responses
    const conversationContext = extractContext(messages);
    console.log("📋 Extracted context:", JSON.stringify(conversationContext));

    // Call chatbot edge function with conversation context
    console.log("Calling chatbot function...");
    const chatbotResponse = await fetch(`${supabaseUrl}/functions/v1/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        messages,
        session_id: `wa_${phone}`,
        channel: 'whatsapp',
        conversationContext, // Pass context to AI
      }),
    });

    if (!chatbotResponse.ok) {
      const errorText = await chatbotResponse.text();
      console.error("Chatbot error:", errorText);
      throw new Error(`Chatbot error: ${chatbotResponse.status}`);
    }

    let chatbotData = await chatbotResponse.json();
    console.log("Chatbot response:", JSON.stringify(chatbotData).substring(0, 500));

    // Parse OpenAI format response: { choices: [{ message: { content: "...", tool_calls: [...] }}] }
    let aiMessage = chatbotData.choices?.[0]?.message;
    let aiResponse = aiMessage?.content || "";

    // Detect room list intent (user asking "ada kamar apa saja" without dates)
    const roomListIntent = detectRoomListIntent(normalizedMessage);
    const intent = detectBookingIntent(normalizedMessage);
    
    // Force get_all_rooms if user asks about room list but AI didn't call tools
    if (roomListIntent && !intent.hasDate && !aiMessage?.tool_calls) {
      console.log(`⚠️ AI didn't use get_all_rooms for room list intent - forcing retry`);
      
      const retryMessages = [
        ...messages,
        { 
          role: 'system' as const, 
          content: `PERINTAH SISTEM: User menanyakan daftar kamar/tipe kamar. WAJIB PANGGIL get_all_rooms SEKARANG untuk menampilkan semua tipe kamar dengan harga! JANGAN TANYA TANGGAL!` 
        }
      ];
      
      const retryResponse = await fetch(`${supabaseUrl}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          messages: retryMessages,
          session_id: `wa_${phone}`,
          channel: 'whatsapp',
          conversationContext,
        }),
      });
      
      if (retryResponse.ok) {
        chatbotData = await retryResponse.json();
        aiMessage = chatbotData.choices?.[0]?.message;
        aiResponse = aiMessage?.content || aiResponse;
        console.log("Room list retry response:", JSON.stringify(chatbotData).substring(0, 500));
      }
    }
    // Force check_availability if user provides room type + date but AI didn't call tools
    else if (intent.hasRoomType && intent.hasDate && !aiMessage?.tool_calls) {
      console.log(`⚠️ AI didn't use tools for booking intent (room: ${intent.roomType}, date: ${intent.dateHint}) - forcing retry`);
      
      // Add forcing hint and retry
      const retryMessages = [
        ...messages,
        { 
          role: 'system' as const, 
          content: `PERINTAH SISTEM: User sudah menyebut kamar "${intent.roomType}" dan tanggal "${intent.dateHint}". WAJIB PANGGIL check_availability SEKARANG! JANGAN BERTANYA LAGI!` 
        }
      ];
      
      const retryResponse = await fetch(`${supabaseUrl}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          messages: retryMessages,
          session_id: `wa_${phone}`,
          channel: 'whatsapp',
          conversationContext,
        }),
      });
      
      if (retryResponse.ok) {
        chatbotData = await retryResponse.json();
        aiMessage = chatbotData.choices?.[0]?.message;
        aiResponse = aiMessage?.content || aiResponse;
        console.log("Booking intent retry response:", JSON.stringify(chatbotData).substring(0, 500));
      }
    }
    
    // Handle follow-up date questions (user asks "kalau tanggal X?" without room type)
    const followUpIntent = detectFollowUpDateIntent(normalizedMessage);
    if (followUpIntent.isFollowUp && !aiMessage?.tool_calls && (!aiResponse || aiResponse.trim() === '')) {
      console.log(`⚠️ Follow-up date question detected: "${followUpIntent.dateHint}" - forcing check_availability for ALL rooms`);
      
      const retryMessages = [
        ...messages,
        { 
          role: 'system' as const, 
          content: `PERINTAH SISTEM: User menanyakan ketersediaan untuk tanggal ALTERNATIF "${followUpIntent.dateHint}". Ini adalah pertanyaan FOLLOW-UP dari percakapan sebelumnya. WAJIB PANGGIL check_availability untuk tanggal yang disebutkan dan tampilkan ketersediaan SEMUA tipe kamar! JANGAN return empty response!` 
        }
      ];
      
      const retryResponse = await fetch(`${supabaseUrl}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          messages: retryMessages,
          session_id: `wa_${phone}`,
          channel: 'whatsapp',
          conversationContext,
        }),
      });
      
      if (retryResponse.ok) {
        chatbotData = await retryResponse.json();
        aiMessage = chatbotData.choices?.[0]?.message;
        aiResponse = aiMessage?.content || aiResponse;
        console.log("Follow-up date retry response:", JSON.stringify(chatbotData).substring(0, 500));
      }
    }

    // Handle tool calls if present
    if (aiMessage?.tool_calls && aiMessage.tool_calls.length > 0) {
      console.log("Tool calls detected:", aiMessage.tool_calls.length);
      
      // Process each tool call
      const toolResults: any[] = [];
      for (const toolCall of aiMessage.tool_calls) {
        console.log(`Executing tool: ${toolCall.function.name}`);
        
        try {
          const toolResponse = await fetch(`${supabaseUrl}/functions/v1/chatbot-tools`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              tool_name: toolCall.function.name,
              parameters: JSON.parse(toolCall.function.arguments || '{}'),
            }),
          });

          const toolResult = await toolResponse.json();
          console.log(`Tool ${toolCall.function.name} result:`, JSON.stringify(toolResult).substring(0, 200));

          toolResults.push({
            role: 'tool',
            content: JSON.stringify(toolResult),
            tool_call_id: toolCall.id,
          });
        } catch (toolError) {
          console.error(`Tool ${toolCall.function.name} error:`, toolError);
          toolResults.push({
            role: 'tool',
            content: JSON.stringify({ error: "Tool execution failed" }),
            tool_call_id: toolCall.id,
          });
        }
      }

      // Send tool results back to AI for final response
      console.log("Sending tool results back to chatbot...");
      const finalResponse = await fetch(`${supabaseUrl}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: 'assistant', content: aiMessage.content, tool_calls: aiMessage.tool_calls },
            ...toolResults,
          ],
          session_id: `wa_${phone}`,
          channel: 'whatsapp',
          conversationContext,
        }),
      });

      if (finalResponse.ok) {
        const finalData = await finalResponse.json();
        console.log("Final response:", JSON.stringify(finalData).substring(0, 500));
        aiResponse = finalData.choices?.[0]?.message?.content || aiResponse;
      } else {
        console.error("Final response error:", await finalResponse.text());
      }
    }

    // Improved fallback with smart context-aware recovery for empty responses
    if (!aiResponse || aiResponse.trim() === '') {
      console.log("⚠️ Empty AI response detected - attempting smart recovery...");
      
      const recoveryMessages = [
        ...messages,
        { 
          role: 'system' as const, 
          content: `Pesan user terakhir belum dijawab. Berikan respons yang membantu dan ramah! Jika user menanyakan tanggal, panggil check_availability. Jika tidak jelas, tanyakan dengan sopan apa yang bisa dibantu. Respons dalam Bahasa Indonesia yang natural.` 
        }
      ];
      
      const recoveryResponse = await fetch(`${supabaseUrl}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          messages: recoveryMessages,
          session_id: `wa_${phone}`,
          channel: 'whatsapp',
          conversationContext,
        }),
      });
      
      if (recoveryResponse.ok) {
        const recoveryData = await recoveryResponse.json();
        const recoveryContent = recoveryData.choices?.[0]?.message?.content;
        if (recoveryContent && recoveryContent.trim() !== '') {
          aiResponse = recoveryContent;
          console.log("Recovery successful:", aiResponse.substring(0, 100));
        }
      }
      
      // DIRECT TOOL CALL FALLBACK with INTENT AWARENESS
      if ((!aiResponse || aiResponse.trim() === '') && conversationContext.parsed_date) {
        const bookingIntent = detectBookingWithRoom(message);
        
        // PRIORITAS 1: Booking intent - prompt for guest info instead of availability check
        if (bookingIntent.isBooking || conversationContext.last_topic === 'booking') {
          console.log("⚠️ Booking intent detected - prompting for guest info");
          
          const roomName = bookingIntent.roomName || conversationContext.preferred_room || 'kamar yang dipilih';
          const capitalizedRoom = roomName.charAt(0).toUpperCase() + roomName.slice(1);
          const checkInFormatted = formatDateIndonesian(conversationContext.parsed_date.check_in);
          const checkOutFormatted = formatDateIndonesian(conversationContext.parsed_date.check_out);
          
          aiResponse = `📝 *Siap memproses booking ${capitalizedRoom}!*\n\n` +
            `📅 Check-in: ${checkInFormatted}\n` +
            `📅 Check-out: ${checkOutFormatted}\n\n` +
            `Untuk melanjutkan, mohon kirimkan:\n` +
            `1️⃣ Nama lengkap\n` +
            `2️⃣ Nomor HP/WhatsApp\n` +
            `3️⃣ Email\n` +
            `4️⃣ Jumlah tamu\n\n` +
            `Contoh: "Nama: Budi Santoso, HP: 081234567890, Email: budi@email.com, 2 tamu"`;
        } 
        // PRIORITAS 2: Availability check untuk pertanyaan ketersediaan
        else {
          console.log("⚠️ AI failed with parsed_date - directly calling check_availability tool");
          
          try {
            const directToolResponse = await fetch(`${supabaseUrl}/functions/v1/chatbot-tools`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                tool_name: 'check_availability',
                parameters: {
                  check_in: conversationContext.parsed_date.check_in,
                  check_out: conversationContext.parsed_date.check_out,
                  num_guests: conversationContext.guest_count || 2,
                },
              }),
            });
            
            if (directToolResponse.ok) {
              const directToolResult = await directToolResponse.json();
              console.log("Direct tool result:", JSON.stringify(directToolResult).substring(0, 300));
              
              // Format the tool result directly as the response
              aiResponse = formatAvailabilityResponse(directToolResult, conversationContext.parsed_date);
              console.log("✅ Direct availability check successful:", aiResponse.substring(0, 100));
            } else {
              console.error("❌ Direct tool call failed:", await directToolResponse.text());
            }
          } catch (directToolError) {
            console.error("❌ Direct tool call error:", directToolError);
          }
        }
      }
      
      // Final smart fallback based on context
      if (!aiResponse || aiResponse.trim() === '') {
        aiResponse = getSmartFallback(message, conversationContext);
        console.log("Using smart fallback:", aiResponse.substring(0, 100));
      }
    }

    // Format response for WhatsApp
    aiResponse = formatForWhatsApp(aiResponse);
    console.log(`AI Response for ${phone}: "${aiResponse.substring(0, 100)}..."`);

    // Log assistant message with error handling
    const { error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse,
      });
    
    if (aiMsgError) {
      console.error('❌ Failed to log AI assistant message:', aiMsgError);
    } else {
      console.log('✅ AI assistant message logged to DB');
    }

    // Update session context for future messages
    await supabase
      .from('whatsapp_sessions')
      .update({ 
        context: conversationContext,
        last_message_at: new Date().toISOString(),
      })
      .eq('phone_number', phone);

    // Send response via Fonnte
    console.log("📤 Sending WhatsApp to:", phone);
    console.log("📝 Message length:", aiResponse.length);
    console.log("🔑 API Key exists:", !!FONNTE_API_KEY);
    
    const fonntPayload = {
      target: phone,
      message: aiResponse,
      countryCode: "62",
    };
    console.log("📦 Fonnte payload:", JSON.stringify(fonntPayload));
    
    const sendResponse = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": FONNTE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fonntPayload),
    });

    const sendResultText = await sendResponse.text();
    console.log("📨 Fonnte raw response:", sendResultText);
    console.log("📊 Fonnte status:", sendResponse.status);
    
    let sendResult;
    try {
      sendResult = JSON.parse(sendResultText);
      console.log("✅ Fonnte parsed result:", JSON.stringify(sendResult));
    } catch (e) {
      console.error("❌ Failed to parse Fonnte response:", sendResultText);
      sendResult = { error: sendResultText };
    }

    if (!sendResponse.ok || sendResult.status === false) {
      console.error("❌ Failed to send WhatsApp:", sendResult);
    } else {
      console.log("✅ WhatsApp sent successfully");
    }

    return new Response(JSON.stringify({ 
      status: "success",
      conversation_id: conversationId,
      response_sent: sendResponse.ok,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
