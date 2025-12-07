import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Initialize Supabase client to fetch real data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Default persona fallback
    const defaultPersona = "Anda adalah asisten hotel yang ramah dan membantu tamu dengan informasi kamar, booking, fasilitas, dan pertanyaan umum seputar hotel. Jawab dengan bahasa Indonesia yang natural dan profesional.";
    
    // Fetch chatbot settings from database if not provided
    let chatbotSettings = providedSettings;
    if (!chatbotSettings || !chatbotSettings.persona) {
      console.log("Fetching chatbot settings from database...");
      const { data: dbSettings, error: settingsError } = await supabase
        .from("chatbot_settings")
        .select("*")
        .single();
      
      if (settingsError) {
        console.log("Error fetching chatbot settings:", settingsError.message);
      }
      
      chatbotSettings = dbSettings || {
        persona: defaultPersona,
        greeting_message: "Halo! 👋 Ada yang bisa saya bantu?",
        bot_name: "Rani"
      };
      console.log("Chatbot settings loaded:", chatbotSettings?.persona ? "OK" : "Using fallback");
    }

    // Fetch hotel settings and data
    const { data: hotelSettings } = await supabase
      .from("hotel_settings")
      .select("*")
      .single();

    const { data: rooms } = await supabase
      .from("rooms")
      .select("name, description, price_per_night, max_guests, features, size_sqm")
      .eq("available", true)
      .order("price_per_night");

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

    // Fetch knowledge base content
    const { data: knowledgeBase } = await supabase
      .from("chatbot_knowledge_base")
      .select("title, content, category")
      .eq("is_active", true)
      .order("category");

    // Fetch training examples for few-shot learning
    const { data: trainingExamples } = await supabase
      .from("chatbot_training_examples")
      .select("question, ideal_answer, category")
      .eq("is_active", true)
      .order("display_order");

    // Build comprehensive context
    const roomsInfo = rooms?.map(r => 
      `- ${r.name}: ${r.description}. Harga: Rp ${r.price_per_night.toLocaleString()}/malam. Max ${r.max_guests} tamu${r.size_sqm ? `, ${r.size_sqm}m²` : ''}. Fasilitas: ${r.features.join(', ')}`
    ).join('\n') || '';

    const facilitiesInfo = facilities?.map(f => 
      `- ${f.title}: ${f.description}`
    ).join('\n') || '';

    const nearbyInfo = nearbyLocations?.map(loc => 
      `- ${loc.name} (${loc.category}): ${loc.distance_km}km, ~${loc.travel_time_minutes} menit`
    ).join('\n') || '';

    // Build knowledge base info
    const knowledgeInfo = knowledgeBase?.map(kb => 
      `[${kb.category?.toUpperCase() || 'GENERAL'}] ${kb.title}:\n${kb.content.substring(0, 1500)}`
    ).join('\n\n---\n\n') || '';

    // Build training examples for few-shot learning
    const trainingExamplesInfo = trainingExamples?.map(ex => 
      `📌 [${ex.category?.toUpperCase() || 'GENERAL'}]
User: "${ex.question}"
Bot: "${ex.ideal_answer}"`
    ).join('\n\n') || '';

    // Get current date for context
    const now = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const currentDateIndonesian = now.toLocaleDateString('id-ID', dateOptions);
    const currentDateISO = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    
    // Time-based greeting hint
    const timeGreeting = currentHour < 11 ? 'pagi' : currentHour < 15 ? 'siang' : currentHour < 18 ? 'sore' : 'malam';

    // Build conversation context string if provided
    let contextString = '';
    if (conversationContext) {
      const ctx = conversationContext;
      contextString = `
📋 KONTEKS PERCAKAPAN (ingat ini!):
${ctx.guest_name ? `- Nama tamu: ${ctx.guest_name}` : ''}
${ctx.preferred_room ? `- Kamar diminati: ${ctx.preferred_room}` : ''}
${ctx.dates ? `- Tanggal rencana: ${ctx.dates}` : ''}
${ctx.guest_count ? `- Jumlah tamu: ${ctx.guest_count} orang` : ''}
${ctx.budget_hint ? `- Budget sekitar: ${ctx.budget_hint}` : ''}
${ctx.sentiment ? `- Mood tamu: ${ctx.sentiment}` : ''}
${ctx.last_topic ? `- Topik terakhir: ${ctx.last_topic}` : ''}`;
    }

    // Build enhanced system prompt with personality
    const persona = chatbotSettings?.persona || defaultPersona;
    const botName = chatbotSettings?.bot_name || 'Rani';
    
    const systemPrompt = `Kamu adalah ${botName}, customer service ${hotelSettings?.hotel_name || 'Pomah Guesthouse'} yang ramah, cerdas, dan helpful.

🎭 PERSONALITY:
- Ramah & hangat seperti teman, tapi tetap profesional
- Cepat tanggap, jawab langsung tanpa bertele-tele  
- Proaktif memberikan saran yang relevan
- Empati tinggi, pahami kebutuhan tamu
- Gunakan emoji secukupnya 😊 (1-3 per pesan, jangan berlebihan)
- Ingat nama tamu dan pakai dalam percakapan jika sudah tahu
- Bahasa santai tapi sopan (campuran formal-informal Indonesia)

📅 TANGGAL: ${currentDateIndonesian} (${currentDateISO}) | Sekarang ${timeGreeting} | TAHUN: 2025
${contextString}

🧠 INTELLIGENCE RULES:
1. Kenali typo & singkatan umum:
   - dlx/delux → deluxe, kmr → kamar, brp → berapa, bs/bsa → bisa
   - gk/ga/ngga → tidak, sy/aku → saya, mlm → malam, org → orang
   - tgl → tanggal, kpn → kapan, bsk → besok, lusa → 2 hari lagi
   - gmn/gimana → bagaimana, emg/emang → memang

2. Deteksi konteks dari percakapan sebelumnya:
   - Jika sudah bicara kamar, pertanyaan "yg lain?" = kamar lain
   - "Kalau tanggal X?" = cek availability tanggal X untuk kamar yang sedang dibahas
   - Ingat preferensi: jumlah tamu, tanggal, kamar yang diminati

3. JANGAN PERNAH tanya ulang info yang sudah diberikan user!
   - User bilang "deluxe 15 januari" → LANGSUNG cek, jangan tanya kamar/tanggal lagi
   - User bilang "2 orang" sebelumnya → ingat jumlah tamu ini

🚨 ATURAN WAJIB TOOLS:
1. User tanya "ada kamar apa?" / "tipe kamar?" → PANGGIL get_all_rooms
2. User sebut kamar + tanggal → PANGGIL check_availability
3. User mau booking lengkap → PANGGIL create_booking_draft
4. Follow-up "kalau tanggal X?" → LANGSUNG cek availability tanggal baru
5. User tanya status/ubah booking → MINTA kode booking + telepon + email dulu

💡 PROACTIVE SUGGESTIONS:
- Setelah cek availability → "Mau saya bantu booking sekarang? 😊"
- User bilang "liburan"/"jalan-jalan" → sarankan kamar yang cocok
- User ragu-ragu → bantu compare 2-3 opsi: "Untuk [kebutuhan], saya rekomendasikan..."
- Setelah booking → "Pembayaran bisa transfer ke [bank]. Butuh invoice WhatsApp?"

📍 INFO HOTEL:
- ${hotelSettings?.hotel_name || 'POMAH GUESTHOUSE'}
- Alamat: ${hotelSettings?.address || 'Jl. Dewi Sartika IV No 71, Semarang'}
- Check-in: ${hotelSettings?.check_in_time || '14:00'} | Check-out: ${hotelSettings?.check_out_time || '12:00'}
- WhatsApp: ${hotelSettings?.whatsapp_number || '+6281227271799'}

🛏️ KAMAR:
${roomsInfo}

✨ FASILITAS: ${facilitiesInfo}

📍 LOKASI SEKITAR: ${nearbyInfo}

⚠️ FORMAT OUTPUT:
- Kode booking: PMH-XXXXXX (bukan UUID)
- Tanggal: "15 Januari 2025" (bukan 2025-01-15)
- Harga: "Rp 450.000" dengan titik ribuan
- Respons singkat & jelas, maksimal 3-4 paragraf
- Gunakan bullet points untuk list

${knowledgeInfo ? `📚 PENGETAHUAN TAMBAHAN:\n${knowledgeInfo.substring(0, 1200)}` : ''}
${trainingExamplesInfo ? `🎯 CONTOH RESPONS IDEAL:\n${trainingExamplesInfo.substring(0, 800)}` : ''}

PERSONA ASLI: ${persona}`;

    // Define tools for the AI
    const tools = [
      {
        type: "function",
        function: {
          name: "get_all_rooms",
          description: "GUNAKAN INI saat user tanya 'ada kamar apa?', 'tipe kamar?', 'harga kamar?', 'list kamar'. Menampilkan semua tipe kamar yang tersedia dengan harga TANPA perlu tanggal.",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Cek ketersediaan kamar untuk tanggal tertentu. PENTING: Gunakan tahun 2025 atau lebih baru untuk semua tanggal!",
          parameters: {
            type: "object",
            properties: {
              check_in: { 
                type: "string", 
                description: "Tanggal check-in format YYYY-MM-DD. WAJIB pakai tahun 2025 atau lebih. Contoh: 2025-01-15, 2025-12-20. JANGAN pakai tahun < 2025!" 
              },
              check_out: { 
                type: "string", 
                description: "Tanggal check-out format YYYY-MM-DD. WAJIB pakai tahun 2025 atau lebih. Contoh: 2025-01-18, 2025-12-25. JANGAN pakai tahun < 2025!" 
              },
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
          description: "Dapatkan detail lengkap tentang kamar tertentu",
          parameters: {
            type: "object",
            properties: {
              room_name: { type: "string", description: "Nama kamar (contoh: Deluxe Room, Villa)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_facilities",
          description: "Dapatkan daftar fasilitas hotel"
        }
      },
      {
        type: "function",
        function: {
          name: "create_booking_draft",
          description: "Buat booking dengan satu atau beberapa kamar sekaligus. PENTING: Nomor telepon WAJIB diisi! Support multiple rooms!",
          parameters: {
            type: "object",
            properties: {
              guest_name: { type: "string", description: "Nama lengkap tamu" },
              guest_email: { type: "string", description: "Email tamu" },
              guest_phone: { type: "string", description: "Nomor telepon/WhatsApp tamu (WAJIB DIISI!)" },
              check_in: { type: "string", description: "Tanggal check-in YYYY-MM-DD" },
              check_out: { type: "string", description: "Tanggal check-out YYYY-MM-DD" },
              num_guests: { type: "number", description: "Total jumlah tamu" },
              room_name: { type: "string", description: "Nama tipe kamar (untuk single room booking, backward compatible)" },
              room_selections: { 
                type: "array", 
                description: "Untuk multiple room: Array kamar yang dipilih. Contoh: [{room_name: 'Deluxe', quantity: 2}, {room_name: 'Villa', quantity: 1}]. Jika hanya 1 kamar, bisa pakai room_name saja.",
                items: {
                  type: "object",
                  properties: {
                    room_name: { type: "string", description: "Nama tipe kamar" },
                    quantity: { type: "number", description: "Jumlah kamar tipe ini (default: 1)" }
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
          description: "Cari dan tampilkan detail booking tamu. WAJIB minta kode booking, nomor telepon, dan email untuk verifikasi keamanan.",
          parameters: {
            type: "object",
            properties: {
              booking_id: { 
                type: "string", 
                description: "Kode booking format PMH-XXXXXX (contoh: PMH-Y739M3). Bukan UUID panjang." 
              },
              guest_phone: { 
                type: "string", 
                description: "Nomor telepon pemesan untuk verifikasi" 
              },
              guest_email: { 
                type: "string", 
                description: "Email pemesan untuk verifikasi" 
              }
            },
            required: ["booking_id", "guest_phone", "guest_email"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_booking",
          description: "Ubah detail booking yang sudah ada. WAJIB verifikasi dengan kode booking, nomor telepon, dan email terlebih dahulu. Booking cancelled tidak bisa diubah.",
          parameters: {
            type: "object",
            properties: {
              booking_id: { type: "string", description: "Kode booking format PMH-XXXXXX" },
              guest_phone: { type: "string", description: "Nomor telepon pemesan untuk verifikasi" },
              guest_email: { type: "string", description: "Email pemesan untuk verifikasi" },
              new_check_in: { type: "string", description: "Tanggal check-in baru (YYYY-MM-DD)" },
              new_check_out: { type: "string", description: "Tanggal check-out baru (YYYY-MM-DD)" },
              new_num_guests: { type: "number", description: "Jumlah tamu baru" },
              new_special_requests: { type: "string", description: "Permintaan khusus baru" }
            },
            required: ["booking_id", "guest_phone", "guest_email"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "check_payment_status",
          description: "Cek status pembayaran booking. WAJIB verifikasi dengan kode booking, nomor telepon, dan email untuk keamanan.",
          parameters: {
            type: "object",
            properties: {
              booking_id: { 
                type: "string", 
                description: "Kode booking format PMH-XXXXXX" 
              },
              guest_phone: { 
                type: "string", 
                description: "Nomor telepon pemesan untuk verifikasi" 
              },
              guest_email: { 
                type: "string", 
                description: "Email pemesan untuk verifikasi" 
              }
            },
            required: ["booking_id", "guest_phone", "guest_email"]
          }
        }
      }
    ];

    // Call Lovable AI with optimized settings
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
        temperature: 0.4, // Slightly higher for natural responses
        max_tokens: chatbotSettings.response_speed === 'fast' ? 500 : 
                    chatbotSettings.response_speed === 'detailed' ? 900 : 700,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
