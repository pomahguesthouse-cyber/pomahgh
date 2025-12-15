import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Quick greeting response - bypass AI for simple greetings
function getQuickGreetingResponse(message: string, personaName: string): string | null {
  const lower = message.toLowerCase().trim();
  
  const greetings: Record<string, string[]> = {
    'pagi': ['Selamat pagi! 🌅', 'Pagi! ☀️'],
    'siang': ['Selamat siang! ☀️', 'Siang! 🌞'],
    'sore': ['Selamat sore! 🌆', 'Sore! 🌇'],
    'malam': ['Selamat malam! 🌙', 'Malam! ✨'],
    'halo': ['Halo! 👋'],
    'hai': ['Hai! 👋'],
    'hi': ['Hi! 👋'],
    'hello': ['Hello! 👋'],
    'hallo': ['Hallo! 👋'],
    'p': ['Halo! 👋'],
    'tes': ['Halo! 👋 Ada yang bisa saya bantu?'],
    'test': ['Halo! 👋 Ada yang bisa saya bantu?'],
  };
  
  for (const [key, responses] of Object.entries(greetings)) {
    if (lower === key || lower === `selamat ${key}`) {
      const response = responses[Math.floor(Math.random() * responses.length)];
      return `${response}\n\nSaya ${personaName} dari Pomah Guesthouse. Ada yang bisa saya bantu? Mau cek ketersediaan kamar atau ada pertanyaan lain? 🏨`;
    }
  }
  
  return null;
}

// Parse relative Indonesian date expressions to concrete dates
function parseRelativeDate(expression: string): { check_in: string; check_out: string; description: string } | null {
  // Get current date in WIB (UTC+7)
  const now = new Date();
  const wibOffset = 7 * 60; // UTC+7 in minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (wibOffset * 60000));
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
  
  // Get next specific day of week
  const getNextDayOfWeek = (dayIndex: number) => {
    const result = new Date(wibTime);
    const currentDay = result.getDay();
    const daysUntil = (dayIndex - currentDay + 7) % 7 || 7; // At least 1 day ahead
    result.setDate(result.getDate() + daysUntil);
    return result;
  };
  
  const lower = expression.toLowerCase();
  
  // Today patterns
  if (lower.match(/\b(malam ini|nanti malam|hari ini|sekarang|tonight|today)\b/)) {
    return { check_in: formatDate(wibTime), check_out: formatDate(addDays(wibTime, 1)), description: 'malam ini' };
  }
  
  // Tomorrow patterns
  if (lower.match(/\b(besok|bsk|besuk|tomorrow)\b/)) {
    const besok = addDays(wibTime, 1);
    return { check_in: formatDate(besok), check_out: formatDate(addDays(besok, 1)), description: 'besok' };
  }
  
  // Day after tomorrow
  if (lower.match(/\b(lusa|lsa)\b/)) {
    const lusa = addDays(wibTime, 2);
    return { check_in: formatDate(lusa), check_out: formatDate(addDays(lusa, 1)), description: 'lusa' };
  }
  
  // Next week
  if (lower.match(/\b(minggu depan|pekan depan|next week)\b/)) {
    const nextWeek = addDays(wibTime, 7);
    return { check_in: formatDate(nextWeek), check_out: formatDate(addDays(nextWeek, 1)), description: 'minggu depan' };
  }
  
  // This weekend (Saturday)
  if (lower.match(/\b(weekend ini|akhir pekan ini|weekend|akhir pekan)\b/) && !lower.includes('depan')) {
    const saturday = getNextDayOfWeek(6);
    return { check_in: formatDate(saturday), check_out: formatDate(addDays(saturday, 2)), description: 'weekend ini' };
  }
  
  // Next weekend
  if (lower.match(/\b(weekend depan|akhir pekan depan)\b/)) {
    const thisSaturday = getNextDayOfWeek(6);
    const nextSaturday = addDays(thisSaturday, 7);
    return { check_in: formatDate(nextSaturday), check_out: formatDate(addDays(nextSaturday, 2)), description: 'weekend depan' };
  }
  
  // X days from now: "3 hari lagi", "5 hari kedepan"
  const daysAheadMatch = lower.match(/(\d+)\s*(hari|hr)\s*(lagi|kedepan|ke depan)/);
  if (daysAheadMatch) {
    const days = parseInt(daysAheadMatch[1]);
    const targetDate = addDays(wibTime, days);
    return { check_in: formatDate(targetDate), check_out: formatDate(addDays(targetDate, 1)), description: `${days} hari lagi` };
  }
  
  // Specific day names: "hari jumat", "jumat ini", "sabtu depan"
  const dayNames: Record<string, number> = {
    'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3, 
    'kamis': 4, 'jumat': 5, 'jum\'at': 5, 'sabtu': 6
  };
  
  for (const [dayName, dayIndex] of Object.entries(dayNames)) {
    if (lower.includes(dayName)) {
      const targetDay = getNextDayOfWeek(dayIndex);
      // If "depan" mentioned, add another week
      if (lower.includes('depan')) {
        targetDay.setDate(targetDay.getDate() + 7);
      }
      return { check_in: formatDate(targetDay), check_out: formatDate(addDays(targetDay, 1)), description: `hari ${dayName}` };
    }
  }
  
  return null;
}

// Build date reference context for system prompt
function buildDateReferenceContext(): string {
  const now = new Date();
  const wibOffset = 7 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (wibOffset * 60000));
  
  const formatIndonesian = (d: Date) => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
  
  // Get next Saturday
  const getNextSaturday = () => {
    const result = new Date(wibTime);
    const currentDay = result.getDay();
    const daysUntil = (6 - currentDay + 7) % 7 || 7;
    result.setDate(result.getDate() + daysUntil);
    return result;
  };
  
  const today = wibTime;
  const tomorrow = addDays(today, 1);
  const lusa = addDays(today, 2);
  const nextWeek = addDays(today, 7);
  const weekend = getNextSaturday();
  
  return `📅 REFERENSI TANGGAL (WIB):
- Hari ini: ${formatIndonesian(today)}
- Besok: ${formatIndonesian(tomorrow)}
- Lusa: ${formatIndonesian(lusa)}
- Minggu depan: ${formatIndonesian(nextWeek)}
- Weekend ini: ${formatIndonesian(weekend)}

⚠️ KONVERSI OTOMATIS:
- "malam ini" / "hari ini" → check-in ${today.toISOString().split('T')[0]}
- "besok" / "bsk" → check-in ${tomorrow.toISOString().split('T')[0]}
- "lusa" → check-in ${lusa.toISOString().split('T')[0]}
- "weekend" / "akhir pekan" → check-in ${weekend.toISOString().split('T')[0]}
- "minggu depan" → check-in ${nextWeek.toISOString().split('T')[0]}

PENTING: Jika user bilang tanggal relatif, LANGSUNG konversi ke tanggal ISO dan panggil check_availability!`;
}

// Build persona prompt from structured settings
const buildPersonaPrompt = (settings: any, hotelName: string): string => {
  const name = settings?.persona_name || 'Rani';
  const role = settings?.persona_role || 'Customer Service';
  const traits = settings?.persona_traits || ['ramah', 'profesional', 'helpful'];
  const commStyle = settings?.communication_style || 'santai-profesional';
  const emojiUsage = settings?.emoji_usage || 'moderate';
  const formality = settings?.language_formality || 'semi-formal';
  const customInstructions = settings?.custom_instructions || '';

  // Map traits to descriptions
  const traitDescriptions: Record<string, string> = {
    'ramah': 'hangat dan bersahabat',
    'profesional': 'kompeten dan terpercaya',
    'helpful': 'selalu siap membantu',
    'ceria': 'penuh semangat positif',
    'empati': 'memahami perasaan tamu',
    'lucu': 'bisa menghibur dengan humor ringan',
    'sabar': 'tidak terburu-buru',
    'informatif': 'memberikan info lengkap',
    'proaktif': 'menawarkan bantuan tanpa diminta',
    'sopan': 'berbahasa santun'
  };

  const traitsText = traits.map((t: string) => traitDescriptions[t] || t).join(', ');

  // Map communication style
  const styleMap: Record<string, string> = {
    'formal': 'gunakan bahasa baku dan resmi, sebut dengan Bapak/Ibu',
    'semi-formal': 'sopan tapi tidak kaku, gunakan Anda/Kak',
    'santai-profesional': 'friendly tapi tetap profesional, campuran formal-informal',
    'casual': 'seperti ngobrol dengan teman, gunakan kamu/aku'
  };

  // Map emoji usage
  const emojiMap: Record<string, string> = {
    'none': 'JANGAN gunakan emoji sama sekali',
    'minimal': 'gunakan 1-2 emoji saja per pesan (di akhir saja)',
    'moderate': 'gunakan 2-3 emoji secukupnya untuk ekspresi',
    'expressive': 'gunakan emoji ekspresif untuk menambah kesan ramah'
  };

  // Map formality
  const formalityMap: Record<string, string> = {
    'formal': 'Saya, Bapak/Ibu, Anda',
    'semi-formal': 'Saya, Kak, Anda',
    'informal': 'Aku, Kamu'
  };

  return `Kamu adalah ${name}, ${role} ${hotelName}.

🎭 KEPRIBADIAN:
${traitsText}

💬 GAYA KOMUNIKASI:
- ${styleMap[commStyle] || styleMap['santai-profesional']}
- ${emojiMap[emojiUsage] || emojiMap['moderate']}
- Kata ganti: ${formalityMap[formality] || formalityMap['semi-formal']}
- Ingat nama tamu dan gunakan dalam percakapan jika sudah tahu
- Respons singkat dan jelas, hindari bertele-tele

${customInstructions ? `📌 INSTRUKSI KHUSUS:\n${customInstructions}` : ''}`;
};

// Select relevant training examples based on user message
const selectRelevantExamples = (userMessage: string, examples: any[]): any[] => {
  if (!examples || examples.length === 0) return [];
  
  const message = userMessage.toLowerCase();
  
  // Detect category from message
  let detectedCategory = 'general';
  
  if (message.includes('book') || message.includes('pesan') || message.includes('reserv')) {
    detectedCategory = 'booking';
  } else if (message.includes('harga') || message.includes('tarif') || message.includes('biaya')) {
    detectedCategory = 'availability';
  } else if (message.includes('fasilitas') || message.includes('ada apa') || message.includes('tersedia')) {
    detectedCategory = 'facilities';
  } else if (message.includes('promo') || message.includes('diskon') || message.includes('potongan')) {
    detectedCategory = 'promo';
  } else if (message.includes('bayar') || message.includes('transfer') || message.includes('payment')) {
    detectedCategory = 'payment';
  } else if (message.includes('lokasi') || message.includes('alamat') || message.includes('dimana')) {
    detectedCategory = 'location';
  } else if (message.includes('keluhan') || message.includes('komplain') || message.includes('kecewa')) {
    detectedCategory = 'complaint';
  } else if (message.includes('ubah') || message.includes('reschedule') || message.includes('ganti')) {
    detectedCategory = 'reschedule';
  } else if (message.includes('batal') || message.includes('cancel')) {
    detectedCategory = 'cancel';
  } else if (message.includes('halo') || message.includes('hai') || message.includes('selamat')) {
    detectedCategory = 'greeting';
  } else if (message.includes('extra') || message.includes('tambahan') || message.includes('add-on') || message.includes('addon') || message.includes('sarapan') || message.includes('breakfast')) {
    detectedCategory = 'addon';
  }
  
  // Filter by detected category, then add some general examples
  const categoryExamples = examples.filter(ex => ex.category === detectedCategory);
  const generalExamples = examples.filter(ex => ex.category === 'general');
  
  // Return max 4 relevant examples
  return [...categoryExamples.slice(0, 3), ...generalExamples.slice(0, 1)].slice(0, 4);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, chatbotSettings: providedSettings, conversationContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch chatbot settings from database
    let chatbotSettings = providedSettings;
    if (!chatbotSettings || !chatbotSettings.persona_name) {
      console.log("Fetching chatbot settings from database...");
      const { data: dbSettings, error: settingsError } = await supabase
        .from("chatbot_settings")
        .select("*")
        .single();
      
      if (settingsError) {
        console.log("Error fetching chatbot settings:", settingsError.message);
      }
      
      chatbotSettings = dbSettings || {
        persona_name: 'Rani',
        persona_role: 'Customer Service',
        persona_traits: ['ramah', 'profesional', 'helpful'],
        communication_style: 'santai-profesional',
        emoji_usage: 'moderate',
        language_formality: 'semi-formal',
        greeting_message: "Halo! 👋 Ada yang bisa saya bantu?"
      };
    }

    // Fetch hotel settings and data
    const { data: hotelSettings } = await supabase
      .from("hotel_settings")
      .select("*")
      .single();

    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, name, description, price_per_night, max_guests, features, size_sqm")
      .eq("available", true)
      .order("price_per_night");

    // Fetch ALL room add-ons for complete info (pricing, capacity, etc.)
    const { data: roomAddons } = await supabase
      .from("room_addons")
      .select("id, name, description, price, price_type, category, room_id, max_quantity, extra_capacity")
      .eq("is_active", true)
      .order("display_order");

    const { data: facilities } = await supabase
      .from("facilities")
      .select("title, description")
      .eq("is_active", true);

    const { data: nearbyLocations } = await supabase
      .from("nearby_locations")
      .select("name, category, distance_km, travel_time_minutes")
      .eq("is_active", true)
      .order("distance_km")
      .limit(10);

    const { data: knowledgeBase } = await supabase
      .from("chatbot_knowledge_base")
      .select("title, content, category")
      .eq("is_active", true)
      .order("category");

    const { data: trainingExamples } = await supabase
      .from("chatbot_training_examples")
      .select("question, ideal_answer, category")
      .eq("is_active", true)
      .order("display_order");

    // Build context strings with extra bed capacity info
    const roomsInfo = rooms?.map(r => {
      // Find extra bed addon (room-specific or global with null room_id)
      const extraBed = (roomAddons || []).find(a => 
        (a.room_id === r.id || a.room_id === null) && a.name?.toLowerCase().includes('extra bed')
      );
      
      const maxExtraBeds = extraBed?.max_quantity || 0;
      const extraCapacity = extraBed ? (extraBed.extra_capacity || 1) * maxExtraBeds : 0;
      const maxWithExtraBed = r.max_guests + extraCapacity;
      
      const extraBedInfo = maxExtraBeds > 0 
        ? ` (bisa +${maxExtraBeds} extra bed → maks ${maxWithExtraBed} tamu)` 
        : '';
        
      return `- ${r.name}: Rp ${r.price_per_night.toLocaleString()}/malam. Kapasitas ${r.max_guests} tamu${extraBedInfo}${r.size_sqm ? `, ${r.size_sqm}m²` : ''}`;
    }).join('\n') || '';

    // Build add-ons info for chatbot knowledge
    const priceTypeLabels: Record<string, string> = {
      'per_night': '/malam',
      'per_person_per_night': '/orang/malam',
      'per_person': '/orang',
      'once': ' (sekali bayar)'
    };
    
    const addonsInfo = (roomAddons || []).map(addon => {
      const priceLabel = priceTypeLabels[addon.price_type] || '';
      const roomName = rooms?.find(r => r.id === addon.room_id)?.name;
      const roomNote = roomName ? ` (${roomName})` : addon.room_id === null ? ' (Semua Kamar)' : '';
      const maxQty = addon.max_quantity ? `, maks ${addon.max_quantity}` : '';
      const extraCap = addon.extra_capacity ? `, +${addon.extra_capacity} tamu/unit` : '';
      
      return `- ${addon.name}${roomNote}: Rp ${addon.price?.toLocaleString()}${priceLabel}${maxQty}${extraCap}`;
    }).join('\n') || '';

    const facilitiesInfo = facilities?.map(f => `- ${f.title}`).join(', ') || '';

    const nearbyInfo = nearbyLocations?.map(loc => 
      `- ${loc.name}: ${loc.distance_km}km, ~${loc.travel_time_minutes} menit`
    ).join('\n') || '';

    // Get last user message for relevant example selection
    const lastUserMessage = messages?.filter((m: any) => m.role === 'user').pop()?.content || '';
    
    // Quick response for simple greetings - bypass AI model
    const quickGreeting = getQuickGreetingResponse(lastUserMessage, chatbotSettings?.persona_name || 'Rani');
    if (quickGreeting) {
      console.log("Quick greeting response triggered for:", lastUserMessage);
      return new Response(JSON.stringify({
        choices: [{
          message: { role: 'assistant', content: quickGreeting }
        }]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const relevantExamples = selectRelevantExamples(lastUserMessage, trainingExamples || []);

    const trainingExamplesInfo = relevantExamples.map(ex => 
      `User: "${ex.question}"\nBot: "${ex.ideal_answer}"`
    ).join('\n\n') || '';

    // Knowledge base (truncated)
    const knowledgeInfo = knowledgeBase?.slice(0, 3).map(kb => 
      `[${kb.category?.toUpperCase() || 'INFO'}] ${kb.title}: ${kb.content.substring(0, 300)}...`
    ).join('\n\n') || '';

    // Current date/time
    const now = new Date();
    const currentDateIndonesian = now.toLocaleDateString('id-ID', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const currentDateISO = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const timeGreeting = currentHour < 11 ? 'pagi' : currentHour < 15 ? 'siang' : currentHour < 18 ? 'sore' : 'malam';

    // Build conversation context string
    let contextString = '';
    let parsedDateContext = '';
    if (conversationContext) {
      const ctx = conversationContext;
      const parts = [];
      if (ctx.guest_name) parts.push(`Nama tamu: ${ctx.guest_name}`);
      if (ctx.preferred_room) parts.push(`Kamar diminati: ${ctx.preferred_room}`);
      if (ctx.dates) parts.push(`Tanggal: ${ctx.dates}`);
      if (ctx.guest_count) parts.push(`Tamu: ${ctx.guest_count} orang`);
      if (ctx.sentiment) parts.push(`Mood: ${ctx.sentiment}`);
      
      // Include parsed relative date context
      if (ctx.parsed_date) {
        parts.push(`Tanggal terdeteksi: ${ctx.parsed_date.description} → ${ctx.parsed_date.check_in}`);
        parsedDateContext = `\n⚠️ USER MENYEBUT "${ctx.parsed_date.description.toUpperCase()}": Gunakan check_in=${ctx.parsed_date.check_in}, check_out=${ctx.parsed_date.check_out}`;
      }
      
      if (parts.length > 0) {
        contextString = `\n📋 KONTEKS:\n${parts.join(' | ')}`;
      }
    }

    // Build date reference context
    const dateReferenceContext = buildDateReferenceContext();

    // Build main persona prompt from structured settings
    const hotelName = hotelSettings?.hotel_name || 'Pomah Guesthouse';
    const personaPrompt = buildPersonaPrompt(chatbotSettings, hotelName);

    // Build final system prompt
    const systemPrompt = `${personaPrompt}

📅 TANGGAL: ${currentDateIndonesian} (${currentDateISO}) | Sekarang ${timeGreeting} | TAHUN: ${now.getFullYear()}
${contextString}${parsedDateContext}

${dateReferenceContext}

🧠 INTELLIGENCE:
- Kenali typo: dlx→deluxe, kmr→kamar, brp→berapa, bs→bisa, gk/ga→tidak, tgl→tanggal, bsk→besok
- Ingat preferensi dari percakapan sebelumnya
- JANGAN tanya ulang info yang sudah diberikan user

🔄 BOOKING CONTINUATION (SANGAT PENTING!):
- Jika user bilang "ya", "oke", "booking", "pesan", "lanjut", "deal", "siap", "jadi" SETELAH check_availability:
  → GUNAKAN kamar dan tanggal dari check_availability sebelumnya (JANGAN tanya ulang!)
  → LANGSUNG minta data tamu yang BELUM ADA: nama lengkap, email, nomor HP, jumlah tamu
  → Setelah data lengkap → panggil create_booking_draft dengan info yang sudah dikumpulkan

- CONTOH ALUR BENAR:
  User: "Deluxe besok?"
  Bot: check_availability → "Deluxe tersedia untuk besok! Rp 450.000/malam"
  User: "Oke booking"
  Bot: "Siap Kak! Untuk booking Deluxe besok, mohon info: nama lengkap, email, nomor HP, dan jumlah tamu"
  User: "Faizal, faizal@email.com, 082226749990, 2 orang"
  Bot: create_booking_draft → "Booking berhasil! Kode: PMH-ABC123"

- CONTOH SALAH (JANGAN LAKUKAN!):
  User: "Oke booking"
  Bot: "Mau pesan kamar apa dan tanggal berapa?" ❌ INI SALAH!

🔢 DURASI PATTERN (SANGAT PENTING!):
- Jika user bilang "2 malam", "3 malam", "seminggu" dll SETELAH check_availability:
  → PAHAMI sebagai PERUBAHAN DURASI dari diskusi sebelumnya
  → Lakukan check_availability BARU dengan durasi yang diminta
  → Check-in tetap dari tanggal terakhir yang dibahas
  → JANGAN tanya ulang tanggal!

- CONTOH BENAR:
  User: "hari ini" → Bot: check_availability 16-17 Des (1 malam)
  User: "2 malam" → Bot: check_availability 16-18 Des (2 malam) ✅ BENAR!

- CONTOH SALAH:
  User: "2 malam" → Bot: "tanggal berapa check-in?" ❌ SALAH!

🛏️ PEMILIHAN KAMAR (SANGAT PENTING!):
- Jika user sebut NAMA KAMAR SPESIFIK setelah check_availability:
  → PAHAMI sebagai PEMILIHAN kamar untuk booking
  → LANGSUNG tanya data tamu (nama, email, HP, jumlah tamu)
  → JANGAN panggil get_room_details!

- CONTOH BENAR:
  Bot: "Tersedia Single, Deluxe, Family Suite..."
  User: "family suite"
  Bot: "Siap Kak! Untuk booking Family Suite, mohon info: nama lengkap, email, nomor HP, dan jumlah tamu" ✅

- CONTOH SALAH:
  User: "family suite"
  Bot: get_room_details → "Family Suite adalah kamar luas..." ❌ SALAH!

🚨 TOOLS (WAJIB):
- "ada kamar apa?" → get_all_rooms
- kamar + tanggal (termasuk "besok", "lusa", "malam ini") → check_availability
- "X malam" setelah check_availability → check_availability BARU dengan durasi updated
- User sebut nama kamar setelah check_availability → LANGSUNG minta data tamu (JANGAN get_room_details!)
- User konfirmasi ("ya/oke/booking/pesan/lanjut") setelah check_availability → LANGSUNG minta data tamu
- Data tamu lengkap → create_booking_draft
- cek/ubah booking → minta kode PMH-XXXXXX + telepon + email

📍 INFO HOTEL:
- ${hotelName}: ${hotelSettings?.address || 'Jl. Dewi Sartika IV No 71, Semarang'}
- Check-in: ${hotelSettings?.check_in_time || '14:00'} | Check-out: ${hotelSettings?.check_out_time || '12:00'}
- WA: ${hotelSettings?.whatsapp_number || '+6281227271799'}

🛏️ KAMAR:
${roomsInfo}

🎁 ADD-ONS TERSEDIA:
${addonsInfo || 'Tidak ada add-on aktif'}

✨ FASILITAS: ${facilitiesInfo}

⚠️ FORMAT:
- Kode booking: PMH-XXXXXX
- Tanggal: "15 Januari 2025"
- Harga: "Rp 450.000"

${trainingExamplesInfo ? `🎯 CONTOH RESPONS:\n${trainingExamplesInfo}` : ''}
${knowledgeInfo ? `\n📚 INFO TAMBAHAN:\n${knowledgeInfo}` : ''}`;

    // Define tools
    const tools = [
      {
        type: "function",
        function: {
          name: "get_all_rooms",
          description: "Tampilkan semua tipe kamar dengan harga. Gunakan saat user tanya 'ada kamar apa?', 'tipe kamar?', 'harga kamar?'",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Cek ketersediaan kamar untuk tanggal tertentu. Bisa untuk tahun ini atau tahun depan.",
          parameters: {
            type: "object",
            properties: {
              check_in: { type: "string", description: "Tanggal check-in format YYYY-MM-DD" },
              check_out: { type: "string", description: "Tanggal check-out format YYYY-MM-DD" },
              num_guests: { type: "number", description: "Jumlah tamu" }
            },
            required: ["check_in", "check_out"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_room_details",
          description: "Detail lengkap kamar tertentu",
          parameters: {
            type: "object",
            properties: {
              room_name: { type: "string", description: "Nama kamar (Deluxe, Villa, dll)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_facilities",
          description: "Daftar fasilitas hotel"
        }
      },
      {
        type: "function",
        function: {
          name: "create_booking_draft",
          description: "Buat booking. Nomor telepon WAJIB!",
          parameters: {
            type: "object",
            properties: {
              guest_name: { type: "string", description: "Nama lengkap" },
              guest_email: { type: "string", description: "Email" },
              guest_phone: { type: "string", description: "No HP (WAJIB!)" },
              check_in: { type: "string", description: "Check-in YYYY-MM-DD" },
              check_out: { type: "string", description: "Check-out YYYY-MM-DD" },
              num_guests: { type: "number", description: "Jumlah tamu" },
              room_name: { type: "string", description: "Nama kamar" },
              room_selections: { 
                type: "array", 
                description: "Multi-room: [{room_name, quantity}]",
                items: {
                  type: "object",
                  properties: {
                    room_name: { type: "string" },
                    quantity: { type: "number" }
                  },
                  required: ["room_name"]
                }
              }
            },
            required: ["guest_name", "guest_email", "guest_phone", "check_in", "check_out", "num_guests"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_booking_details",
          description: "Cari detail booking. WAJIB: kode, telepon, email untuk verifikasi",
          parameters: {
            type: "object",
            properties: {
              booking_id: { type: "string", description: "Kode PMH-XXXXXX" },
              guest_phone: { type: "string", description: "Telepon" },
              guest_email: { type: "string", description: "Email" }
            },
            required: ["booking_id", "guest_phone", "guest_email"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_booking",
          description: "Ubah booking. WAJIB verifikasi dulu",
          parameters: {
            type: "object",
            properties: {
              booking_id: { type: "string", description: "Kode PMH-XXXXXX" },
              guest_phone: { type: "string", description: "Telepon" },
              guest_email: { type: "string", description: "Email" },
              new_check_in: { type: "string", description: "Check-in baru" },
              new_check_out: { type: "string", description: "Check-out baru" },
              new_num_guests: { type: "number", description: "Tamu baru" },
              new_special_requests: { type: "string", description: "Request baru" }
            },
            required: ["booking_id", "guest_phone", "guest_email"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "check_payment_status",
          description: "Cek status pembayaran. WAJIB verifikasi",
          parameters: {
            type: "object",
            properties: {
              booking_id: { type: "string", description: "Kode PMH-XXXXXX" },
              guest_phone: { type: "string", description: "Telepon" },
              guest_email: { type: "string", description: "Email" }
            },
            required: ["booking_id", "guest_phone", "guest_email"]
          }
        }
      }
    ];


    // Call AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        tools,
        tool_choice: "auto",
        temperature: 0.4,
        max_tokens: chatbotSettings.response_speed === 'fast' ? 500 : 
                    chatbotSettings.response_speed === 'detailed' ? 900 : 700,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});