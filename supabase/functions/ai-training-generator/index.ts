/**
 * AI Training Generator Edge Function
 * 
 * Modes:
 *   analyze_logs       — Scan recent chat_conversations and auto-generate Q&A training examples
 *   generate_for_category — Generate N training examples for a given category using hotel context
 *   analyze_gaps       — Analyze existing training data and return underrepresented topics
 *   improve_example    — Rewrite an existing training example to be higher quality
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/aiProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Authentication ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { mode, category, count = 5, example, target = "guest" } = body;

    // Load settings for model + hotel context
    const { data: chatbotSettings } = await supabase
      .from("chatbot_settings")
      .select("persona_name, persona_role")
      .single();

    const { data: hotelSettings } = await supabase
      .from("hotel_settings")
      .select("hotel_name, address, check_in_time, check_out_time")
      .single();

    const model = "google/gemini-2.5-flash";
    const hotelName: string = hotelSettings?.hotel_name || "Hotel";
    const checkIn: string = hotelSettings?.check_in_time || "14:00";
    const checkOut: string = hotelSettings?.check_out_time || "12:00";

    // --- Load hotel room list for context ---
    const { data: rooms } = await supabase
      .from("rooms")
      .select("name, base_price, description")
      .eq("is_available", true)
      .limit(10);

    const roomList = (rooms || [])
      .map((r: { name: string; base_price: number; description?: string }) =>
        `- ${r.name}: Rp ${r.base_price.toLocaleString("id-ID")}/malam`
      )
      .join("\n");

    const hotelContext = `
Hotel: ${hotelName}
Check-in: ${checkIn} | Check-out: ${checkOut}
Kamar tersedia:
${roomList || "- Data kamar tidak tersedia"}
`.trim();

    // ============================================================
    // Mode: analyze_gaps
    // ============================================================
    if (mode === "analyze_gaps") {
      const tableName =
        target === "admin"
          ? "admin_chatbot_training_examples"
          : "chatbot_training_examples";

      const { data: existingExamples } = await supabase
        .from(tableName)
        .select("question, category")
        .eq("is_active", true)
        .limit(200);

      const examplesSummary = (existingExamples || [])
        .map(
          (e: { question: string; category?: string }) =>
            `[${e.category || "umum"}] ${e.question}`
        )
        .join("\n");

      const aiResult = await callAI(
        LOVABLE_API_KEY,
        model,
        [
          {
            role: "system",
            content: `Kamu adalah ahli training data untuk AI chatbot hotel.
Analisis kumpulan pertanyaan training berikut dan identifikasi:
1. Topik/kategori yang kurang terwakili
2. Jenis pertanyaan yang belum ada
3. Saran kategori baru yang perlu ditambah
${hotelContext}`,
          },
          {
            role: "user",
            content: `Berikut adalah ${(existingExamples || []).length} pertanyaan training yang ada:
${examplesSummary || "(belum ada data training)"}

Berikan analisis gap dalam format JSON:
{
  "underrepresented_categories": ["kategori1", "kategori2"],
  "missing_topics": ["topik1", "topik2"],
  "recommendations": ["saran1", "saran2"],
  "priority_gaps": [
    {"topic": "...", "reason": "...", "suggested_count": 5}
  ]
}`,
          },
        ],
        { max_tokens: 1200, temperature: 0.3 }
      );

      if (aiResult.rateLimited) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, coba lagi sesaat" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawContent = aiResult.data.choices[0]?.message?.content || "{}";
      let parsed: unknown = {};
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        parsed = { raw: rawContent };
      }

      return new Response(JSON.stringify({ success: true, analysis: parsed, model }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // Mode: generate_for_category
    // ============================================================
    if (mode === "generate_for_category") {
      if (!category) {
        return new Response(JSON.stringify({ error: "Parameter 'category' diperlukan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const safeCount = Math.min(Math.max(parseInt(String(count)) || 5, 1), 20);

      const aiResult = await callAI(
        LOVABLE_API_KEY,
        model,
        [
          {
            role: "system",
            content: `Kamu adalah ahli training data untuk AI chatbot hotel Indonesia.
Tugasmu: buat contoh percakapan Q&A berkualitas tinggi untuk melatih AI chatbot.

Konteks hotel:
${hotelContext}

Prinsip Q&A yang baik:
- Pertanyaan harus natural, seperti yang ditulis tamu via WhatsApp
- Jawaban harus informatif, ramah, dan akurat sesuai kontek hotel
- Variasikan gaya pertanyaan (formal, informal, singkat, panjang)
- Sertakan variasi ejaan/penulisan yang umum`,
          },
          {
            role: "user",
            content: `Buat ${safeCount} contoh Q&A untuk kategori: "${category}"

Format output JSON array:
[
  {
    "question": "pertanyaan dari tamu",
    "answer": "jawaban ideal dari chatbot",
    "category": "${category}",
    "tags": ["tag1", "tag2"]
  }
]

Pastikan setiap contoh unik dan berbeda gaya.`,
          },
        ],
        { max_tokens: 2500, temperature: 0.7 }
      );

      if (aiResult.rateLimited) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, coba lagi sesaat" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawContent = aiResult.data.choices[0]?.message?.content || "[]";
      let examples: unknown[] = [];
      try {
        const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
        examples = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        examples = [];
      }

      // Save to DB with auto_generated flag (is_active: false = needs review)
      const tableName =
        target === "admin"
          ? "admin_chatbot_training_examples"
          : "chatbot_training_examples";

      const toInsert = (examples as Array<{ question?: string; answer?: string; category?: string; tags?: string[] }>)
        .filter((e) => e.question && e.answer)
        .map((e, idx) => {
          const base: Record<string, unknown> = {
            question: e.question,
            ideal_answer: e.answer,
            category: e.category || category,
            is_active: false,
            display_order: 9000 + idx,
          };
          if (tableName === "chatbot_training_examples") {
            base.auto_generated = true;
            base.source = "ai_generated";
            if (e.tags && e.tags.length > 0) base.response_tags = e.tags;
          }
          return base;
        });

      let saved = 0;
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from(tableName).insert(toInsert);
        if (!insertError) saved = toInsert.length;
        else console.error("[ai-training-generator] Insert error:", insertError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          generated: examples.length,
          saved,
          pending_review: saved,
          model,
          examples: toInsert,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // Mode: improve_example
    // ============================================================
    if (mode === "improve_example") {
      if (!example || !example.question || !example.answer) {
        return new Response(
          JSON.stringify({ error: "Parameter 'example' dengan 'question' dan 'answer' diperlukan" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResult = await callAI(
        LOVABLE_API_KEY,
        model,
        [
          {
            role: "system",
            content: `Kamu adalah ahli training data chatbot hotel Indonesia.
Tugasmu adalah memperbaiki kualitas contoh Q&A training agar:
- Pertanyaan lebih natural dan beragam gaya penulisan
- Jawaban lebih informatif, ramah, dan tepat sasaran
- Menambahkan variasi pertanyaan yang serupa
${hotelContext}`,
          },
          {
            role: "user",
            content: `Perbaiki contoh training ini:

Pertanyaan: ${example.question}
Jawaban: ${example.answer}
Kategori: ${example.category || "umum"}

Berikan output JSON:
{
  "improved_question": "pertanyaan yang diperbaiki",
  "improved_answer": "jawaban yang diperbaiki",
  "question_variants": ["variasi1", "variasi2", "variasi3"],
  "improvement_notes": "penjelasan apa yang diperbaiki"
}`,
          },
        ],
        { max_tokens: 1000, temperature: 0.5 }
      );

      if (aiResult.rateLimited) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawContent = aiResult.data.choices[0]?.message?.content || "{}";
      let improved: unknown = {};
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        improved = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: rawContent };
      } catch {
        improved = { raw: rawContent };
      }

      return new Response(
        JSON.stringify({ success: true, improved, model }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // Mode: analyze_logs
    // ============================================================
    if (mode === "analyze_logs") {
      // Get un-analyzed WhatsApp conversations, prioritize by message count
      const { data: conversations } = await supabase
        .from("chat_conversations")
        .select("id, session_id, message_count")
        .ilike("session_id", "wa_%")
        .eq("analyzed_for_training", false)
        .order("message_count", { ascending: false })
        .order("started_at", { ascending: false })
        .limit(15);

      if (!conversations || conversations.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "Tidak ada percakapan baru untuk dianalisis", analyzed: 0, total_saved: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results: Array<{ conversation_id: string; examples_generated: number; saved: number }> = [];

      for (const conv of conversations) {
        // Fetch messages from chat_messages table
        const { data: msgData, error: msgErr } = await supabase
          .from("chat_messages")
          .select("role, content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });

        if (msgErr || !msgData || msgData.length < 4) {
          // Too short — mark analyzed, skip
          await supabase
            .from("chat_conversations")
            .update({ analyzed_for_training: true })
            .eq("id", conv.id);
          continue;
        }

        const transcript = msgData
          .map((m: { role: string; content: string }) => `${m.role === "user" ? "Tamu" : "Bot"}: ${m.content}`)
          .join("\n");

        let aiResult;
        try {
          aiResult = await callAI(
            LOVABLE_API_KEY,
            model,
            [
              {
                role: "system",
                content: `Kamu adalah analis percakapan hotel. Tugas: ekstrak pasangan Q&A berkualitas tinggi dari log percakapan WhatsApp antara tamu dan chatbot hotel.

${hotelContext}

Kriteria Q&A yang baik:
- Pertanyaan yang sering ditanyakan tamu (FAQ)
- Jawaban yang informatif, akurat, dan ramah
- Hindari pertanyaan yang terlalu spesifik ke satu tamu tertentu (nama, tanggal spesifik)
- Generalisasi pertanyaan agar bisa dipakai sebagai template
- Kategori: general, greeting, booking, availability, facilities, promo, payment, location, complaint, reschedule, cancel, special_request`,
              },
              {
                role: "user",
                content: `Analisis percakapan WhatsApp berikut dan ekstrak 2-5 pasangan Q&A terbaik dalam format JSON array:

${transcript}

Format output JSON array:
[
  {
    "question": "pertanyaan umum dari tamu (digeneralisasi)",
    "answer": "jawaban ideal dari bot",
    "category": "booking/availability/facilities/promo/payment/location/complaint/general"
  }
]

Jika tidak ada nilai training yang baik, kembalikan array kosong [].`,
              },
            ],
            { max_tokens: 1200, temperature: 0.3 }
          );
        } catch (aiErr) {
          // AI call failed — DON'T mark as analyzed so it can be retried
          console.error(`[analyze_logs] AI error for conv ${conv.id}:`, aiErr);
          continue;
        }

        if (aiResult.rateLimited) {
          // Stop processing but don't mark remaining as analyzed
          console.warn("[analyze_logs] Rate limited, stopping batch");
          break;
        }

        const rawContent = aiResult.data.choices[0]?.message?.content || "[]";
        let examples: Array<{ question?: string; answer?: string; category?: string }> = [];
        try {
          const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
          examples = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch {
          examples = [];
        }

        // Get max display_order for proper ordering
        const { data: maxOrderData } = await supabase
          .from("chatbot_training_examples")
          .select("display_order")
          .order("display_order", { ascending: false })
          .limit(1);

        let maxOrder = maxOrderData?.[0]?.display_order || 0;

        const toInsert = examples
          .filter((e) => e.question && e.answer)
          .map((e) => ({
            question: e.question,
            ideal_answer: e.answer,
            category: e.category || "general",
            is_active: false,
            source: "auto_whatsapp",
            auto_generated: true,
            display_order: ++maxOrder,
          }));

        let saved = 0;
        if (toInsert.length > 0) {
          const { error: insertErr } = await supabase
            .from("chatbot_training_examples")
            .insert(toInsert);
          if (!insertErr) saved = toInsert.length;
          else console.error("[analyze_logs] Insert error:", insertErr);
        }

        // Only mark as analyzed AFTER successful processing
        await supabase
          .from("chat_conversations")
          .update({ analyzed_for_training: true })
          .eq("id", conv.id);

        results.push({
          conversation_id: conv.id,
          examples_generated: examples.length,
          saved,
        });
      }

      const totalSaved = results.reduce((sum, r) => sum + r.saved, 0);

      return new Response(
        JSON.stringify({
          success: true,
          analyzed: results.length,
          extracted: totalSaved,
          total_saved: totalSaved,
          pending_review: totalSaved,
          message: `Berhasil menganalisis ${results.length} percakapan, mengekstrak ${totalSaved} contoh training`,
          results,
          model,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Mode tidak dikenal: '${mode}'. Gunakan: analyze_logs, generate_for_category, analyze_gaps, improve_example` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ai-training-generator] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
