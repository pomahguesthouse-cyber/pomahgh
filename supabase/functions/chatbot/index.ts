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
    const { messages, chatbotSettings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client to fetch real data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

TOOLS YANG TERSEDIA:
1. check_availability - Cek ketersediaan real-time kamar untuk tanggal tertentu
2. get_room_details - Info lengkap kamar spesifik
3. get_facilities - Daftar lengkap fasilitas
4. create_booking_draft - Buat booking langsung
5. get_booking_details - Cek detail booking (WAJIB minta kode booking + no telepon + email)
6. update_booking - Ubah jadwal/detail booking (WAJIB verifikasi dulu)

⚠️ PENTING UNTUK REVIEW/UBAH BOOKING:
- SELALU minta 3 DATA VERIFIKASI: KODE BOOKING + NO TELEPON + EMAIL
- Jangan pernah tampilkan detail booking tanpa verifikasi lengkap
- Booking dengan status "cancelled" TIDAK bisa diubah
- Booking "pending" dan "confirmed" bisa diubah
- Jika tamu tidak tahu kode booking, sarankan cek email atau hubungi resepsionis
- PASTIKAN cek ketersediaan kamar saat mengubah tanggal booking

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

CARA MENJAWAB (PENTING!):
✓ LUGAS & LANGSUNG - Langsung jawab pertanyaan tanpa basa-basi berlebihan
✓ GUNAKAN DATA AKURAT - Semua info di atas adalah data real dari database
✓ PROAKTIF - Tawarkan info relevan tanpa diminta jika membantu
✓ GUNAKAN TOOLS - Jangan tebak-tebak, gunakan tools untuk data real-time
✓ SINGKAT TAPI LENGKAP - Tidak perlu kalimat panjang, langsung ke intinya
✓ NUMBERS MATTER - Selalu sebutkan harga, kapasitas, dan detail spesifik
✓ NATURAL - Berbicara seperti resepsionis hotel profesional yang ramah

CONTOH JAWABAN YANG BAIK:
❌ "Terima kasih atas pertanyaan Anda. Kami dengan senang hati akan membantu..."
✅ "Ada 3 tipe kamar: Deluxe Room Rp 500rb, Superior Rp 700rb, Villa Rp 1jt per malam."

❌ "Kami memiliki berbagai fasilitas yang menarik untuk Anda..."
✅ "Fasilitas: WiFi gratis, kolam renang, sarapan, parkir, AC semua kamar."

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
          description: "Buat draft booking dengan data yang sudah dikumpulkan. PENTING: Nomor telepon (guest_phone) WAJIB diisi!",
          parameters: {
            type: "object",
            properties: {
              guest_name: { type: "string", description: "Nama lengkap tamu" },
              guest_email: { type: "string", description: "Email tamu" },
              guest_phone: { type: "string", description: "Nomor telepon/WhatsApp tamu (WAJIB DIISI!)" },
              check_in: { type: "string", description: "Tanggal check-in YYYY-MM-DD" },
              check_out: { type: "string", description: "Tanggal check-out YYYY-MM-DD" },
              num_guests: { type: "number", description: "Jumlah tamu" },
              room_name: { type: "string", description: "Nama tipe kamar" }
            },
            required: ["guest_name", "guest_email", "guest_phone", "check_in", "check_out", "num_guests", "room_name"]
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
                description: "Kode/ID booking (UUID format atau sebagian ID)" 
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
              booking_id: { type: "string", description: "Kode/ID booking" },
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
