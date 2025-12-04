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
    const { messages, chatbotSettings: providedSettings } = await req.json();
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
    
    // Fetch chatbot settings from database if not provided (for WhatsApp webhook)
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
        bot_name: "Hotel Assistant"
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

    // Fetch good-rated message examples (promoted responses)
    const { data: goodRatings } = await supabase
      .from("chat_message_ratings")
      .select("message_id")
      .eq("is_good_example", true)
      .gte("rating", 4);

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
      `[${kb.category?.toUpperCase() || 'GENERAL'}] ${kb.title}:\n${kb.content.substring(0, 2000)}`
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

    // Build enhanced system prompt - COMPACT VERSION for better AI response
    const persona = chatbotSettings?.persona || defaultPersona;
    const systemPrompt = `${persona}

📅 TANGGAL: ${currentDateIndonesian} (${currentDateISO}) | TAHUN: 2025

🚨 ATURAN UTAMA:
1. User tanya "ada kamar apa?" tanpa tanggal → PANGGIL get_all_rooms
2. User sebut kamar + tanggal → PANGGIL check_availability  
3. User mau booking → collect data lalu PANGGIL create_booking_draft
4. JANGAN tanya ulang info yang sudah diberikan user!
5. Follow-up "kalau tanggal X?" → LANGSUNG cek availability tanggal baru

KEYWORD: deluxe, superior, villa, standard, family, suite | besok, lusa, tanggal X, januari-desember

📍 ${hotelSettings?.hotel_name || 'POMAH GUESTHOUSE'}
- Alamat: ${hotelSettings?.address || '-'}
- Check-in: ${hotelSettings?.check_in_time || '14:00'} | Check-out: ${hotelSettings?.check_out_time || '12:00'}
- WhatsApp: ${hotelSettings?.whatsapp_number || '-'}

🛏️ KAMAR: ${roomsInfo}

✨ FASILITAS: ${facilitiesInfo}

TOOLS: get_all_rooms, check_availability, get_room_details, get_facilities, create_booking_draft, get_booking_details, update_booking, check_payment_status

⚠️ PENTING:
- Kode booking format PMH-XXXXXX (bukan UUID)
- Verifikasi booking: kode + telepon + email
- Format tanggal output: "15 Januari 2025" (bukan 2025-01-15)
- Bahasa Indonesia, natural, singkat & jelas

${knowledgeInfo ? `📚 KNOWLEDGE: ${knowledgeInfo.substring(0, 1500)}` : ''}
${trainingExamplesInfo ? `🎯 CONTOH: ${trainingExamplesInfo.substring(0, 1000)}` : ''}
`;

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

    // Call Lovable AI with optimized settings for direct answers
    // Increased max_tokens to prevent empty responses
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
        tool_choice: "auto", // Encourage tool calling
        temperature: 0.3, // Slightly higher for more natural responses
        max_tokens: chatbotSettings.response_speed === 'fast' ? 400 : 
                    chatbotSettings.response_speed === 'detailed' ? 800 : 600,
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
