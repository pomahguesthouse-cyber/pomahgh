import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get un-analyzed WhatsApp conversations
    const { data: conversations, error: convError } = await supabase
      .from("chat_conversations")
      .select("id, session_id")
      .ilike("session_id", "wa_%")
      .eq("analyzed_for_training", false)
      .order("started_at", { ascending: false })
      .limit(20);

    if (convError) throw convError;
    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Tidak ada percakapan baru untuk dianalisis",
        analyzed: 0, 
        extracted: 0 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let totalExtracted = 0;

    for (const convo of conversations) {
      // Get messages for this conversation
      const { data: messages, error: msgError } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("conversation_id", convo.id)
        .order("created_at", { ascending: true });

      if (msgError || !messages || messages.length < 4) {
        // Mark as analyzed even if too short
        await supabase
          .from("chat_conversations")
          .update({ analyzed_for_training: true })
          .eq("id", convo.id);
        continue;
      }

      // Format conversation for AI
      const formattedConvo = messages
        .map((m) => `${m.role === "user" ? "Tamu" : "Bot"}: ${m.content}`)
        .join("\n");

      // Call AI to extract Q&A pairs
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Kamu adalah analis percakapan hotel. Tugas: ekstrak pasangan Q&A berkualitas tinggi dari log percakapan WhatsApp antara tamu dan chatbot hotel.

Kriteria Q&A yang baik:
- Pertanyaan yang sering ditanyakan tamu (FAQ)
- Jawaban yang informatif, akurat, dan ramah
- Hindari pertanyaan yang terlalu spesifik ke satu tamu tertentu (nama, tanggal spesifik)
- Generalisasi pertanyaan agar bisa dipakai sebagai template
- Kategori: general, greeting, booking, availability, facilities, promo, payment, location, complaint, reschedule, cancel, special_request

Gunakan tool extract_qa_pairs untuk mengembalikan hasilnya.`
            },
            {
              role: "user",
              content: `Analisis percakapan WhatsApp berikut dan ekstrak pasangan Q&A terbaik:\n\n${formattedConvo}`
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_qa_pairs",
                description: "Ekstrak pasangan pertanyaan dan jawaban dari percakapan",
                parameters: {
                  type: "object",
                  properties: {
                    pairs: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string", description: "Pertanyaan umum dari tamu (digeneralisasi)" },
                          answer: { type: "string", description: "Jawaban ideal dari bot" },
                          category: { 
                            type: "string", 
                            enum: ["general", "greeting", "booking", "availability", "facilities", "promo", "payment", "location", "complaint", "reschedule", "cancel", "special_request"]
                          }
                        },
                        required: ["question", "answer", "category"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["pairs"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "extract_qa_pairs" } }
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI error for convo ${convo.id}:`, await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        try {
          const { pairs } = JSON.parse(toolCall.function.arguments);
          
          if (pairs && pairs.length > 0) {
            // Get max display_order
            const { data: existing } = await supabase
              .from("chatbot_training_examples")
              .select("display_order")
              .order("display_order", { ascending: false })
              .limit(1);
            
            let maxOrder = existing?.[0]?.display_order || 0;

            const inserts = pairs.map((p: any) => ({
              question: p.question,
              ideal_answer: p.answer,
              category: p.category || "general",
              is_active: false,
              source: "auto_whatsapp",
              display_order: ++maxOrder,
            }));

            const { error: insertError } = await supabase
              .from("chatbot_training_examples")
              .insert(inserts);

            if (!insertError) {
              totalExtracted += pairs.length;
            } else {
              console.error("Insert error:", insertError);
            }
          }
        } catch (parseErr) {
          console.error("Parse error:", parseErr);
        }
      }

      // Mark conversation as analyzed
      await supabase
        .from("chat_conversations")
        .update({ analyzed_for_training: true })
        .eq("id", convo.id);
    }

    return new Response(JSON.stringify({
      success: true,
      analyzed: conversations.length,
      extracted: totalExtracted,
      message: `Berhasil menganalisis ${conversations.length} percakapan, mengekstrak ${totalExtracted} contoh training`
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
