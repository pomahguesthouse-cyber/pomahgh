import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch hotel data for system prompt
    const { data: hotelSettings } = await supabase
      .from('hotel_settings')
      .select('*')
      .single();

    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('available', true);

    const { data: facilities } = await supabase
      .from('facilities')
      .select('*')
      .eq('is_active', true);

    // Build system prompt
    const currentDate = new Date().toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const systemPrompt = `Anda adalah resepsionis hotel virtual yang ramah dan profesional untuk ${hotelSettings?.hotel_name || 'hotel kami'}.

PENTING: ANDA HANYA BOLEH BERBICARA DALAM BAHASA INDONESIA. JANGAN PERNAH MENGGUNAKAN BAHASA INGGRIS ATAU BAHASA LAIN.

TANGGAL HARI INI: ${currentDate}

INFORMASI HOTEL:
${hotelSettings?.description || ''}
Alamat: ${hotelSettings?.address || ''}
Check-in: ${hotelSettings?.check_in_time || '14:00'}
Check-out: ${hotelSettings?.check_out_time || '12:00'}

KAMAR TERSEDIA:
${rooms?.map((room: any) => `- ${room.name}: ${room.description} (${room.max_guests} tamu, Rp ${room.price_per_night.toLocaleString('id-ID')}/malam)`).join('\n') || ''}

FASILITAS:
${facilities?.map((f: any) => `- ${f.title}: ${f.description}`).join('\n') || ''}

INSTRUKSI PENTING:
- WAJIB menggunakan HANYA Bahasa Indonesia yang natural dan ramah dalam percakapan suara
- Tidak boleh mencampur bahasa Inggris atau bahasa lain
- Jika tamu menyebutkan tanggal tanpa tahun, GUNAKAN TAHUN 2025
- Tanggal relatif: "hari ini" = tanggal hari ini, "besok" = hari ini + 1 hari, dst
- Tanyakan detail yang diperlukan secara natural dalam percakapan
- Saat menggunakan tool untuk cek ketersediaan atau buat booking, beri tahu tamu bahwa Anda sedang mengecek
- Setelah tool selesai, berikan respons berdasarkan hasilnya
- Jika ada pertanyaan yang tidak dapat dijawab, tawarkan bantuan alternatif
- Semua respons harus dalam Bahasa Indonesia, termasuk saat menjawab pertanyaan dalam bahasa lain`;

    // Get ephemeral token from OpenAI for WebSocket connection
    const sessionResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
      }),
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error("[Server] Failed to create OpenAI session:", sessionResponse.status, errorText);
      throw new Error(`Failed to create OpenAI session: ${sessionResponse.status}`);
    }

    const sessionData = await sessionResponse.json();
    const EPHEMERAL_KEY = sessionData.client_secret.value;

    console.log("[Server] Ephemeral session created");

    // Upgrade to WebSocket
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // Connect to OpenAI Realtime API using ephemeral token
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const openAISocket = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${model}`,
      ["realtime", `openai-insecure-api-key.${EPHEMERAL_KEY}`, "openai-beta.realtime-v1"]
    );

    let sessionConfigured = false;

    openAISocket.onopen = () => {
      console.log("[OpenAI] Connected to Realtime API");
    };

    openAISocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log("[OpenAI] Received:", data.type);

      // Configure session after connection
      if (data.type === 'session.created' && !sessionConfigured) {
        sessionConfigured = true;
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: systemPrompt,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            tools: [
              {
                type: 'function',
                name: 'check_availability',
                description: 'Cek ketersediaan kamar untuk tanggal tertentu. PENTING: Jika tahun tidak disebutkan, gunakan tahun 2025.',
                parameters: {
                  type: 'object',
                  properties: {
                    check_in: {
                      type: 'string',
                      description: 'Tanggal check-in (YYYY-MM-DD). Jika hanya bulan-hari disebutkan, gunakan tahun 2025.'
                    },
                    check_out: {
                      type: 'string',
                      description: 'Tanggal check-out (YYYY-MM-DD). Jika hanya bulan-hari disebutkan, gunakan tahun 2025.'
                    },
                    num_guests: {
                      type: 'number',
                      description: 'Jumlah tamu'
                    }
                  },
                  required: ['check_in', 'check_out', 'num_guests']
                }
              },
              {
                type: 'function',
                name: 'create_booking_draft',
                description: 'Buat draft booking setelah konfirmasi dari tamu. Pastikan semua data lengkap.',
                parameters: {
                  type: 'object',
                  properties: {
                    room_name: {
                      type: 'string',
                      description: 'Nama kamar yang dipilih'
                    },
                    check_in: {
                      type: 'string',
                      description: 'Tanggal check-in (YYYY-MM-DD)'
                    },
                    check_out: {
                      type: 'string',
                      description: 'Tanggal check-out (YYYY-MM-DD)'
                    },
                    num_guests: {
                      type: 'number',
                      description: 'Jumlah tamu'
                    },
                    guest_name: {
                      type: 'string',
                      description: 'Nama lengkap tamu'
                    },
                    guest_email: {
                      type: 'string',
                      description: 'Email tamu'
                    },
                    guest_phone: {
                      type: 'string',
                      description: 'Nomor telepon tamu (wajib diisi)'
                    },
                    special_requests: {
                      type: 'string',
                      description: 'Permintaan khusus (opsional)'
                    }
                  },
                  required: ['room_name', 'check_in', 'check_out', 'num_guests', 'guest_name', 'guest_email', 'guest_phone']
                }
              }
            ],
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 'inf'
          }
        };
        openAISocket.send(JSON.stringify(sessionConfig));
        console.log("[OpenAI] Session configured");
      }

      // Handle function calls
      if (data.type === 'response.function_call_arguments.done') {
        console.log("[Tool] Function call:", data.name, data.arguments);
        
        try {
          const args = JSON.parse(data.arguments);
          const { data: toolResult, error } = await supabase.functions.invoke('chatbot-tools', {
            body: {
              tool_name: data.name,
              parameters: args
            }
          });

          if (error) throw error;

          // Send result back to OpenAI
          const functionOutput = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: data.call_id,
              output: JSON.stringify(toolResult)
            }
          };
          openAISocket.send(JSON.stringify(functionOutput));
          openAISocket.send(JSON.stringify({ type: 'response.create' }));
          console.log("[Tool] Result sent back to AI");
        } catch (error) {
          console.error("[Tool] Error:", error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorOutput = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: data.call_id,
              output: JSON.stringify({ error: errorMessage })
            }
          };
          openAISocket.send(JSON.stringify(errorOutput));
        }
      }

      // Forward all messages to client
      socket.send(event.data);
    };

    openAISocket.onerror = (error) => {
      console.error("[OpenAI] Error:", error);
      socket.send(JSON.stringify({ 
        type: 'error',
        error: 'OpenAI connection error' 
      }));
    };

    openAISocket.onclose = () => {
      console.log("[OpenAI] Connection closed");
      socket.close();
    };

    // Client to OpenAI relay
    socket.onmessage = (event) => {
      if (openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
      }
    };

    socket.onerror = (error) => {
      console.error("[Client] Error:", error);
      openAISocket.close();
    };

    socket.onclose = () => {
      console.log("[Client] Connection closed");
      openAISocket.close();
    };

    return response;
  } catch (error) {
    console.error("[Server] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
