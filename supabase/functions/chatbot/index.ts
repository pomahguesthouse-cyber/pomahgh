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

    // Fetch chatbot settings from database if not provided (for WhatsApp webhook)
    let chatbotSettings = providedSettings;
    if (!chatbotSettings?.persona) {
      const { data: dbSettings } = await supabase
        .from("chatbot_settings")
        .select("*")
        .single();
      
      chatbotSettings = dbSettings || {
        persona: "Anda adalah asisten hotel yang ramah dan membantu tamu dengan informasi kamar, booking, fasilitas, dan pertanyaan umum seputar hotel. Jawab dengan bahasa Indonesia yang natural dan profesional."
      };
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

    // Build enhanced system prompt
    const systemPrompt = `${chatbotSettings.persona}

📅 TANGGAL SEKARANG: ${currentDateIndonesian} (${currentDateISO})
⚠️ TAHUN SEKARANG: 2025

⚠️ FORMAT KODE BOOKING:
- Kode booking baru: PMH-XXXXXX (contoh: PMH-Y739M3, PMH-TBGXC7)
- JANGAN gunakan UUID panjang seperti "a106ab78-0a9a-4850-8076-59e13d9eb227"
- Jika tamu memberikan UUID panjang, minta mereka cek email/WhatsApp untuk kode baru format PMH-XXXXXX

INFORMASI LENGKAP ${hotelSettings?.hotel_name || 'POMAH GUESTHOUSE'}:

📍 LOKASI & KONTAK:
- Alamat: ${hotelSettings?.address || 'Bali, Indonesia'}
- Email: ${hotelSettings?.email_primary || '-'}
- Telepon: ${hotelSettings?.phone_primary || '-'}
- WhatsApp: ${hotelSettings?.whatsapp_number || '-'}

⏰ JAM OPERASIONAL:
- Check-in: ${hotelSettings?.check_in_time || '14:00'}
- Check-out: ${hotelSettings?.check_out_time || '12:00'}
${hotelSettings?.min_stay_nights ? `- Minimum menginap: ${hotelSettings.min_stay_nights} malam` : ''}
${hotelSettings?.max_stay_nights ? `- Maximum menginap: ${hotelSettings.max_stay_nights} malam` : ''}

🏨 TENTANG KAMI:
${hotelSettings?.description || 'Guesthouse nyaman dengan layanan terbaik'}

🛏️ TIPE KAMAR:
${roomsInfo}

✨ FASILITAS:
${facilitiesInfo}

📍 LOKASI TERDEKAT:
${nearbyInfo}

💰 INFORMASI PEMBAYARAN:
${hotelSettings?.tax_name && hotelSettings?.tax_rate ? `- Pajak: ${hotelSettings.tax_name} ${hotelSettings.tax_rate}%` : ''}
- Mata uang: ${hotelSettings?.currency_code || 'IDR'}

📋 KEBIJAKAN REFUND:
${hotelSettings.refund_policy_enabled ? (() => {
  if (hotelSettings.refund_policy_type === 'custom' && hotelSettings.refund_policy_text) {
    return hotelSettings.refund_policy_text;
  }
  if (hotelSettings.refund_policy_type === 'non-refundable') {
    return '❌ Tidak ada pengembalian dana untuk pembatalan apapun';
  }
  if (hotelSettings.refund_policy_type === 'full') {
    const days = hotelSettings.full_refund_days_before || 7;
    return `✅ Pembatalan ${days}+ hari sebelum: Refund 100%\n❌ Pembatalan kurang dari ${days} hari: Tidak ada refund`;
  }
  // Partial (default)
  const fullDays = hotelSettings.full_refund_days_before || 7;
  const partialDays = hotelSettings.partial_refund_days_before || 3;
  const partialPercent = hotelSettings.partial_refund_percentage || 50;
  return `✅ Pembatalan ${fullDays}+ hari sebelum: Refund 100%\n⚠️ Pembatalan ${partialDays}-${fullDays-1} hari sebelum: Refund ${partialPercent}%\n❌ Pembatalan kurang dari ${partialDays} hari: Tidak ada refund`;
})() : 'Hubungi admin untuk informasi refund'}

${knowledgeInfo ? `📚 KNOWLEDGE BASE (Informasi Tambahan dari Admin):
${knowledgeInfo}

⚠️ PENTING: Gunakan informasi dari Knowledge Base di atas untuk menjawab pertanyaan yang relevan. Ini adalah sumber utama untuk FAQ, kebijakan, promo, dan informasi khusus hotel.
` : ''}
${trainingExamplesInfo ? `🎯 CONTOH JAWABAN YANG BAIK (Few-Shot Learning):
Pelajari dan ikuti pola jawaban dari contoh-contoh berikut ini:

${trainingExamplesInfo}

⚠️ PENTING: Gunakan gaya, nada, dan format yang sama dengan contoh di atas saat menjawab pertanyaan serupa. Contoh-contoh ini adalah standar kualitas yang diharapkan.
` : ''}

TOOLS YANG TERSEDIA:
1. check_availability - Cek ketersediaan real-time kamar untuk tanggal tertentu
2. get_room_details - Info lengkap kamar spesifik
3. get_facilities - Daftar lengkap fasilitas
4. create_booking_draft - Buat booking langsung (SUPPORT MULTIPLE ROOMS!)
5. get_booking_details - Cek detail booking (WAJIB minta kode booking + no telepon + email)
6. update_booking - Ubah jadwal/detail booking (WAJIB verifikasi dulu)
7. check_payment_status - Cek status pembayaran (WAJIB verifikasi 3 faktor)

🛏️ MULTIPLE ROOM BOOKING:
- Chatbot dapat membantu booking beberapa kamar sekaligus dalam satu transaksi
- Tanyakan kepada tamu berapa kamar yang dibutuhkan dari setiap tipe
- Contoh: "2 kamar Deluxe dan 1 Villa untuk rombongan keluarga"
- Gunakan parameter room_selections untuk multiple rooms: [{ room_name: "Deluxe", quantity: 2 }, { room_name: "Villa", quantity: 1 }]
- Jika hanya 1 kamar, boleh pakai room_name saja (backward compatible)
- Total harga otomatis menghitung semua kamar yang dipilih

CONTOH PERCAKAPAN:
User: "Saya mau booking 2 kamar deluxe dan 1 villa untuk tanggal 15-17 Januari"
Bot: → Gunakan check_availability dulu untuk cek ketersediaan semua tipe kamar
Bot: → Lalu create_booking_draft dengan room_selections: [{ room_name: "Deluxe", quantity: 2 }, { room_name: "Villa", quantity: 1 }]

⚠️ PENTING UNTUK REVIEW/UBAH BOOKING:
- SELALU minta 3 DATA VERIFIKASI: KODE BOOKING + NO TELEPON + EMAIL
- Jangan pernah tampilkan detail booking tanpa verifikasi lengkap
- Booking dengan status "cancelled" TIDAK bisa diubah
- Booking "pending" dan "confirmed" bisa diubah
- Jika tamu tidak tahu kode booking, sarankan cek email atau hubungi resepsionis
- PASTIKAN cek ketersediaan kamar saat mengubah tanggal booking

⚠️ PANDUAN CEK PEMBAYARAN:
- WAJIB minta 3 DATA VERIFIKASI: KODE BOOKING + NO TELEPON + EMAIL
- Tampilkan status pembayaran dengan jelas (Belum Bayar/Bayar Sebagian/Lunas)
- Jika belum lunas, tampilkan sisa yang harus dibayar dan info rekening bank
- Jika tamu mengklaim sudah bayar tapi status masih unpaid, sarankan hubungi admin

⚠️ PANDUAN PARSING TANGGAL (SANGAT PENTING!):
- "hari ini" → tanggal sekarang (${currentDateISO})
- "besok" → hari ini + 1 hari
- "lusa" → hari ini + 2 hari  
- "minggu depan" / "seminggu lagi" → hari ini + 7 hari
- "bulan depan" / "sebulan lagi" → bulan ini + 1 bulan
- "akhir pekan ini" / "weekend" → Sabtu-Minggu minggu ini
- Jika user hanya sebut tanggal & bulan (contoh: "15 Januari", "20 Desember") → SELALU GUNAKAN TAHUN 2025
- Jika tanggal sudah lewat di tahun 2025, gunakan tahun 2026
- Format output tanggal: YYYY-MM-DD (contoh: 2025-01-15, 2025-12-20)

CONTOH PARSING:
❌ User: "Ada kamar 15 Januari?" → JANGAN parse ke 2023-01-15
✅ User: "Ada kamar 15 Januari?" → HARUS parse ke 2025-01-15

❌ User: "Booking besok sampai lusa" → JANGAN gunakan tahun lama
✅ User: "Booking besok sampai lusa" → Hitung dari ${currentDateISO} + 1 dan + 2 hari

📆 FORMAT TANGGAL OUTPUT (SANGAT PENTING!):
- SELALU tampilkan tanggal dalam format Indonesia: "15 Januari 2025"
- JANGAN PERNAH tampilkan format ISO: "2025-01-15" ke user
- Contoh benar: "Check-in: Rabu, 15 Januari 2025"
- Contoh salah: "Check-in: 2025-01-15"
- Untuk rentang tanggal: "15 - 17 Januari 2025" atau "28 Desember 2024 - 2 Januari 2025"
- Tool results sudah berisi tanggal dalam format Indonesia, gunakan langsung tanpa konversi

CARA MENJAWAB (PENTING!):
✓ LUGAS & LANGSUNG - Langsung jawab pertanyaan tanpa basa-basi berlebihan
✓ GUNAKAN DATA AKURAT - Semua info di atas adalah data real dari database
✓ PROAKTIF - Tawarkan info relevan tanpa diminta jika membantu
✓ GUNAKAN TOOLS - Jangan tebak-tebak, gunakan tools untuk data real-time
✓ SINGKAT TAPI LENGKAP - Tidak perlu kalimat panjang, langsung ke intinya
✓ NUMBERS MATTER - Selalu sebutkan harga, kapasitas, dan detail spesifik
✓ NATURAL - Berbicara seperti resepsionis hotel profesional yang ramah
✓ FORMAT TANGGAL INDONESIA - Selalu gunakan "15 Januari 2025" bukan "2025-01-15"

CONTOH JAWABAN YANG BAIK:
❌ "Terima kasih atas pertanyaan Anda. Kami dengan senang hati akan membantu..."
✅ "Ada 3 tipe kamar: Deluxe Room Rp 500rb, Superior Rp 700rb, Villa Rp 1jt per malam."

❌ "Kami memiliki berbagai fasilitas yang menarik untuk Anda..."
✅ "Fasilitas: WiFi gratis, kolam renang, sarapan, parkir, AC semua kamar."

❌ "Kamar tersedia untuk tanggal 2025-01-15 sampai 2025-01-18"
✅ "Kamar tersedia untuk tanggal 15 - 18 Januari 2025"

BAHASA:
- Gunakan Bahasa Indonesia yang natural dan familiar
- Boleh informal tapi tetap profesional (seperti chat WhatsApp hotel)
- Gunakan emoji sesekali untuk kesan ramah (📍🏨✨💰)
`;

    // Define tools for the AI
    const tools = [
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
        temperature: 0.3, // Lower temperature for more focused, direct responses
        max_tokens: chatbotSettings.response_speed === 'fast' ? 250 : 
                    chatbotSettings.response_speed === 'detailed' ? 600 : 400,
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
