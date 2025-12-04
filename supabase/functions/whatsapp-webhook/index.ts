import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Quick response for common simple messages - bypass AI completely
function getQuickResponse(message: string): string | null {
  const lowerMsg = message.toLowerCase().trim();
  
  // Exact match responses
  const exactResponses: Record<string, string> = {
    'halo': 'Halo! 👋 Selamat datang di Pomah Guesthouse.\n\nAda yang bisa saya bantu? Silakan tanyakan tentang kamar, harga, fasilitas, atau booking! 😊',
    'hai': 'Hai! 👋 Selamat datang di Pomah Guesthouse.\n\nAda yang bisa saya bantu? Silakan tanyakan tentang kamar, harga, fasilitas, atau booking! 😊',
    'hi': 'Hi! 👋 Selamat datang di Pomah Guesthouse.\n\nAda yang bisa saya bantu? Silakan tanyakan tentang kamar, harga, fasilitas, atau booking! 😊',
    'hello': 'Hello! 👋 Selamat datang di Pomah Guesthouse.\n\nAda yang bisa saya bantu? Silakan tanyakan tentang kamar, harga, fasilitas, atau booking! 😊',
    'hallo': 'Hallo! 👋 Selamat datang di Pomah Guesthouse.\n\nAda yang bisa saya bantu? Silakan tanyakan tentang kamar, harga, fasilitas, atau booking! 😊',
    'selamat pagi': 'Selamat pagi! ☀️ Terima kasih menghubungi Pomah Guesthouse.\n\nAda yang bisa saya bantu hari ini?',
    'selamat siang': 'Selamat siang! 🌤️ Terima kasih menghubungi Pomah Guesthouse.\n\nAda yang bisa saya bantu hari ini?',
    'selamat sore': 'Selamat sore! 🌅 Terima kasih menghubungi Pomah Guesthouse.\n\nAda yang bisa saya bantu hari ini?',
    'selamat malam': 'Selamat malam! 🌙 Terima kasih menghubungi Pomah Guesthouse.\n\nAda yang bisa saya bantu malam ini?',
    'pagi': 'Pagi! ☀️ Selamat datang di Pomah Guesthouse.\n\nAda yang bisa saya bantu?',
    'siang': 'Siang! 🌤️ Selamat datang di Pomah Guesthouse.\n\nAda yang bisa saya bantu?',
    'sore': 'Sore! 🌅 Selamat datang di Pomah Guesthouse.\n\nAda yang bisa saya bantu?',
    'malam': 'Malam! 🌙 Selamat datang di Pomah Guesthouse.\n\nAda yang bisa saya bantu?',
    'terima kasih': 'Sama-sama! 🙏 Senang bisa membantu.\n\nJika ada pertanyaan lain, silakan tanya kapan saja.',
    'makasih': 'Sama-sama! 🙏 Senang bisa membantu.\n\nJika ada pertanyaan lain, silakan tanya kapan saja.',
    'thanks': 'You\'re welcome! 🙏 Senang bisa membantu.\n\nJika ada pertanyaan lain, silakan tanya kapan saja.',
    'thank you': 'You\'re welcome! 🙏 Senang bisa membantu.\n\nJika ada pertanyaan lain, silakan tanya kapan saja.',
    'ok': 'Baik! 👍 Ada yang bisa saya bantu lagi?',
    'oke': 'Baik! 👍 Ada yang bisa saya bantu lagi?',
    'okay': 'Baik! 👍 Ada yang bisa saya bantu lagi?',
    'siap': 'Baik! 👍 Ada yang bisa saya bantu lagi?',
  };
  
  // Check exact matches first
  if (exactResponses[lowerMsg]) {
    return exactResponses[lowerMsg];
  }
  
  // Pattern-based responses for common questions
  
  // LOCATION patterns
  if (/^(lokasi|alamat|dimana|where|location|map|maps|google map|address)(\?)?$/i.test(lowerMsg)) {
    return '📍 *Lokasi Pomah Guesthouse*\n\nJl. Dewi Sartika IV No 71\nSemarang, Central Java 50221\n\n📌 Google Maps:\nhttps://maps.google.com/?q=-7.020891,110.388100\n\n🚗 *Akses mudah dari:*\n• Bandara Ahmad Yani: ~15 menit\n• Stasiun Tawang: ~10 menit\n• Simpang Lima: ~5 menit';
  }
  
  // PRICE patterns
  if (/^(harga|tarif|price|biaya|rate|berapa|harga kamar|tarif kamar|price list)(\?)?$/i.test(lowerMsg)) {
    return '💰 *Harga Kamar Pomah Guesthouse*\n\n🛏️ *Single Room* - Rp 200.000/malam\n   • 1 tamu • 20m²\n\n🛏️ *Grand Deluxe* - Rp 450.000/malam\n   • 2 tamu • 30m²\n\n🛏️ *Family Suite* - Rp 700.000/malam\n   • 4 tamu • 60m²\n\n💡 Harga dapat berbeda di akhir pekan.\n\nKetik *"cek ketersediaan [tanggal]"* untuk cek harga real-time.';
  }
  
  // FACILITIES patterns
  if (/^(fasilitas|facility|amenity|amenities|fasility)(\?)?$/i.test(lowerMsg)) {
    return '🏨 *Fasilitas Pomah Guesthouse*\n\n✅ WiFi Gratis\n✅ Parkir Gratis\n✅ Mini Cafe\n✅ Resepsionis (07:00 - 22:00)\n✅ Area Merokok (Balkon & Lobby Lt.2)\n\n🛏️ *Fasilitas Kamar:*\n• AC\n• Kamar Mandi Dalam\n• Air Panas\n• Amenities Lengkap\n• TV\n\nKetik *"kamar"* untuk detail tiap tipe kamar.';
  }
  
  // ROOMS patterns
  if (/^(kamar|room|rooms|tipe kamar|jenis kamar|pilihan kamar)(\?)?$/i.test(lowerMsg)) {
    return '🛏️ *Tipe Kamar Pomah Guesthouse*\n\n1️⃣ *Single Room* - Rp 200.000/malam\n   • 1 tamu • 20m² • AC, WiFi, TV\n\n2️⃣ *Grand Deluxe* - Rp 450.000/malam\n   • 2 tamu • 30m² • AC, WiFi, TV, Balkon\n\n3️⃣ *Family Suite* - Rp 700.000/malam\n   • 4 tamu • 60m² • 2 Kamar, AC, WiFi, TV\n\n📅 Ketik *"cek ketersediaan [tanggal]"* untuk booking.\n\nContoh: "cek ketersediaan 15 januari"';
  }
  
  // BOOKING / HOW TO BOOK patterns
  if (/^(booking|pesan|reservasi|cara booking|cara pesan|how to book|book|reserve)(\?)?$/i.test(lowerMsg)) {
    return '📝 *Cara Booking di Pomah Guesthouse*\n\n1️⃣ Ketik tipe kamar & tanggal\n   Contoh: "booking deluxe 15-17 januari"\n\n2️⃣ Isi data tamu (nama, email, telepon)\n\n3️⃣ Terima kode booking & invoice\n\n4️⃣ Transfer ke rekening yang tertera\n\n5️⃣ Kirim bukti transfer via chat ini\n\n✅ Booking confirmed!\n\n📅 Mau booking sekarang?\nKetik: *"cek ketersediaan [tanggal]"*';
  }
  
  // CHECK BOOKING patterns
  if (/^(cek booking|status booking|lacak|lacak booking|track|tracking|cek pesanan)(\?)?$/i.test(lowerMsg)) {
    return '🔍 *Cek Status Booking*\n\nUntuk cek status booking, saya butuh:\n\n1️⃣ *Kode Booking* (contoh: PMH-ABC123)\n2️⃣ *Nomor HP* yang didaftarkan\n3️⃣ *Email* yang didaftarkan\n\nKetik dengan format:\n"cek PMH-XXXXXX 08123456789 email@email.com"\n\nAtau langsung tanyakan status booking Anda!';
  }
  
  // PAYMENT patterns
  if (/^(bayar|transfer|rekening|payment|bank|pembayaran|cara bayar)(\?)?$/i.test(lowerMsg)) {
    return '💳 *Informasi Pembayaran*\n\n🏦 Transfer ke:\n*Bank BCA*\nNo. Rek: 0095584379\nA/N: Faizal Abdurachman\n\n📝 *Langkah Pembayaran:*\n1. Transfer sesuai total booking\n2. Kirim bukti transfer ke chat ini\n3. Tunggu konfirmasi dari admin\n\n⏰ Batas pembayaran: 1x24 jam setelah booking\n\n❓Ada pertanyaan? Ketik langsung!';
  }
  
  // CHECK-IN/OUT patterns
  if (/^(checkin|checkout|check in|check out|jam checkin|jam checkout|jam masuk|jam keluar|waktu checkin|waktu checkout)(\?)?$/i.test(lowerMsg)) {
    return '🕐 *Jam Check-in & Check-out*\n\n📥 *Check-in:* 14:00 WIB (2 siang)\n📤 *Check-out:* 12:00 WIB (12 siang)\n\n⏰ *Early check-in / Late check-out?*\nHubungi admin untuk cek ketersediaan.\nMungkin dikenakan biaya tambahan.\n\n💡 Check-in di luar jam resepsionis (22:00-07:00) harap konfirmasi terlebih dahulu.';
  }
  
  // CONTACT patterns
  if (/^(kontak|contact|hubungi|telepon|telpon|phone|wa|whatsapp|admin|cs|customer service)(\?)?$/i.test(lowerMsg)) {
    return '📞 *Kontak Pomah Guesthouse*\n\n📱 WhatsApp: +6281227271799\n📧 Email: info@pomahguesthouse.com\n\n🕐 *Jam Operasional Resepsionis:*\n07:00 - 22:00 WIB\n\n📍 *Alamat:*\nJl. Dewi Sartika IV No 71\nSemarang, Central Java\n\nKetik pertanyaan langsung di sini untuk bantuan cepat! 😊';
  }
  
  // PARKING patterns
  if (/^(parkir|parking|tempat parkir|area parkir)(\?)?$/i.test(lowerMsg)) {
    return '🚗 *Informasi Parkir*\n\n✅ *Parkir GRATIS* untuk tamu\n📍 Area parkir tersedia di dalam komplek\n🏍️ Parkir motor & mobil tersedia\n\n💡 Parkir terbatas, first come first served.\nUntuk kendaraan besar, harap konfirmasi terlebih dahulu.';
  }
  
  // WIFI patterns
  if (/^(wifi|wi-fi|internet|password wifi|koneksi)(\?)?$/i.test(lowerMsg)) {
    return '📶 *Informasi WiFi*\n\n✅ *WiFi GRATIS* untuk semua tamu\n📍 Tersedia di seluruh area hotel\n\n🔐 Password WiFi akan diberikan saat check-in.\n\n💡 Kecepatan internet cukup untuk streaming & video call.';
  }
  
  // CANCEL/REFUND patterns
  if (/^(cancel|batal|batalkan|refund|pembatalan|cancelation|cancellation)(\?)?$/i.test(lowerMsg)) {
    return '❌ *Kebijakan Pembatalan*\n\n📋 Pembatalan booking:\n• Gratis pembatalan H-3 sebelum check-in\n• H-1 sampai H: Dikenakan biaya 50%\n• No-show: Tidak ada refund\n\n⚠️ Rate non-refundable tidak dapat dibatalkan.\n\nUntuk pembatalan, hubungi admin dengan menyebutkan kode booking Anda.';
  }
  
  // BREAKFAST patterns
  if (/^(sarapan|breakfast|makan pagi|include breakfast)(\?)?$/i.test(lowerMsg)) {
    return '🍳 *Informasi Sarapan*\n\nSarapan *tidak termasuk* dalam harga kamar.\n\n☕ Mini Cafe tersedia untuk:\n• Kopi & Teh\n• Snack ringan\n\n🍽️ Rekomendasi tempat makan terdekat:\n• Warung Makan Pak Karso (~100m)\n• Soto Bangkong (~500m)\n\nTanya rekomendasi kuliner lainnya! 😊';
  }
  
  // PROMO patterns
  if (/^(promo|diskon|discount|penawaran|special offer|potongan)(\?)?$/i.test(lowerMsg)) {
    return '🎉 *Promo Pomah Guesthouse*\n\nPromo saat ini:\n• 🏷️ Long stay (>7 malam): Diskon 15%\n• 🏷️ Weekend special: Harga khusus\n\n📅 Ketik *"cek ketersediaan [tanggal]"* untuk lihat harga promo real-time.\n\nPromo dapat berubah sewaktu-waktu.';
  }
  
  // AVAILABILITY patterns - "ada kamar", "kamar kosong", etc.
  if (/ada kamar|kamar kosong|kamar tersedia|available room|kamar yang ada/i.test(lowerMsg) && !/tanggal|januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|besok|lusa/i.test(lowerMsg)) {
    return '🛏️ *Tipe Kamar Pomah Guesthouse*\n\n1️⃣ *Single Room* - Rp 200.000/malam\n   • 1 tamu • 20m²\n\n2️⃣ *Grand Deluxe* - Rp 450.000/malam\n   • 2 tamu • 30m²\n\n3️⃣ *Family Suite* - Rp 700.000/malam\n   • 4 tamu • 60m²\n\n📅 *Untuk cek ketersediaan*, sebutkan tanggal:\n\nContoh: "cek kamar 15-17 Januari untuk 2 orang"';
  }
  
  return null;
}

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
      .select('whatsapp_session_timeout_minutes, whatsapp_ai_whitelist, whatsapp_contact_numbers')
      .single();
    
    const sessionTimeoutMinutes = hotelSettings?.whatsapp_session_timeout_minutes || 15;
    const aiWhitelist: string[] = hotelSettings?.whatsapp_ai_whitelist || [];
    
    console.log(`Session timeout: ${sessionTimeoutMinutes} minutes, AI whitelist: ${aiWhitelist.length} numbers`);

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

    // Check for quick response FIRST - bypass AI for simple messages
    const quickResponse = getQuickResponse(message);
    if (quickResponse) {
      console.log(`✅ Quick response for "${message}" - bypassing AI`);
      
      // Log assistant message
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: quickResponse,
        });

      // Send response via Fonnte
      const sendResponse = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": FONNTE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: phone,
          message: quickResponse,
          countryCode: "62",
        }),
      });

      const sendResult = await sendResponse.json();
      console.log("Fonnte quick response result:", sendResult);

      return new Response(JSON.stringify({ 
        status: "success",
        conversation_id: conversationId,
        response_sent: sendResponse.ok,
        quick_response: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Call chatbot edge function
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
    const roomListIntent = detectRoomListIntent(message);
    const intent = detectBookingIntent(message);
    
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
    const followUpIntent = detectFollowUpDateIntent(message);
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

    // Improved fallback with recovery for empty responses
    if (!aiResponse || aiResponse.trim() === '') {
      console.log("⚠️ Empty AI response detected - attempting recovery...");
      
      const recoveryMessages = [
        ...messages,
        { 
          role: 'system' as const, 
          content: `Pesan user terakhir belum dijawab. Berikan respons yang membantu! Jika user menanyakan tanggal, bantu cek ketersediaan dengan panggil check_availability. Jika tidak jelas, tanyakan dengan sopan apa yang bisa dibantu.` 
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
      
      // Final fallback - provide intelligent response based on context
      if (!aiResponse || aiResponse.trim() === '') {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('kamar') || lowerMsg.includes('booking') || lowerMsg.includes('tanggal') || lowerMsg.includes('tersedia')) {
          aiResponse = '🛏️ Untuk cek ketersediaan kamar:\n\nMohon sebutkan tanggal check-in, check-out, dan jumlah tamu.\n\nContoh: "cek kamar 15-17 Desember untuk 2 orang"\n\nAtau ketik:\n• *kamar* - lihat tipe & harga\n• *fasilitas* - info fasilitas\n• *lokasi* - alamat hotel';
        } else if (lowerMsg.includes('harga') || lowerMsg.includes('tarif') || lowerMsg.includes('biaya')) {
          aiResponse = '💰 *Harga Kamar Pomah Guesthouse*\n\n🛏️ Single Room - Rp 200.000/malam\n🛏️ Grand Deluxe - Rp 450.000/malam\n🛏️ Family Suite - Rp 700.000/malam\n\nKetik *"cek ketersediaan [tanggal]"* untuk harga real-time.';
        } else {
          aiResponse = 'Halo! 👋 Ada yang bisa saya bantu?\n\nSilakan tanyakan tentang:\n• *Kamar* - tipe & harga\n• *Fasilitas* - info fasilitas hotel\n• *Booking* - cara reservasi\n• *Lokasi* - alamat & kontak\n\nAtau langsung ketik pertanyaan Anda! 😊';
        }
      }
    }

    // Format response for WhatsApp
    aiResponse = formatForWhatsApp(aiResponse);
    console.log(`AI Response for ${phone}: "${aiResponse.substring(0, 100)}..."`);

    // Log assistant message
    await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse,
      });

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
