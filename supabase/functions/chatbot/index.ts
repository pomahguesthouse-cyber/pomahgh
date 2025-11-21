import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Build system prompt with chatbot settings
    const systemPrompt = `${chatbotSettings.persona}

Informasi Penting:
- Nama Hotel: Pomah Guesthouse
- Check-in: 14:00, Check-out: 12:00
- Lokasi: Bali, Indonesia

Anda memiliki akses ke tools untuk:
1. Cek ketersediaan kamar (check_availability)
2. Dapatkan info detail kamar (get_room_details)
3. Dapatkan daftar fasilitas (get_facilities)
4. Bantu membuat booking (create_booking_draft)

Pedoman:
- Selalu ramah dan profesional
- Jika ditanya ketersediaan, gunakan tool check_availability
- Jika ditanya fasilitas, gunakan tool get_facilities
- Jika tamu ingin booking, kumpulkan info: nama, email, telepon, tanggal check-in/out, jumlah tamu
- Berikan informasi yang akurat dan jelas
- Gunakan bahasa Indonesia yang natural
`;

    // Define tools for the AI
    const tools = [
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Cek ketersediaan kamar untuk tanggal tertentu",
          parameters: {
            type: "object",
            properties: {
              check_in: { type: "string", description: "Tanggal check-in (YYYY-MM-DD)" },
              check_out: { type: "string", description: "Tanggal check-out (YYYY-MM-DD)" },
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
          description: "Buat draft booking dengan data yang sudah dikumpulkan",
          parameters: {
            type: "object",
            properties: {
              guest_name: { type: "string" },
              guest_email: { type: "string" },
              guest_phone: { type: "string" },
              check_in: { type: "string" },
              check_out: { type: "string" },
              num_guests: { type: "number" },
              room_name: { type: "string" }
            },
            required: ["guest_name", "guest_email", "check_in", "check_out", "num_guests", "room_name"]
          }
        }
      }
    ];

    // Call Lovable AI
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
        temperature: 0.7,
        max_tokens: chatbotSettings.response_speed === 'fast' ? 300 : 
                    chatbotSettings.response_speed === 'detailed' ? 800 : 500,
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
