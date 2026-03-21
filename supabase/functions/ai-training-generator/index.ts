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
import { callAI, DEFAULT_MODEL } from "../_shared/aiProvider.ts";

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
      .select("ai_model_training, persona_name, persona_role")
      .single();

    const { data: hotelSettings } = await supabase
      .from("hotel_settings")
      .select("hotel_name, address, check_in_time, check_out_time")
      .single();

    const model: string = chatbotSettings?.ai_model_training || DEFAULT_MODEL;
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
        .map((e, idx) => ({
          question: e.question,
          answer: e.answer,
          category: e.category || category,
          tags: e.tags || [],
          is_active: false,
          auto_generated: true,
          display_order: 9000 + idx,
        }));

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
      // Get recent conversations that haven't been analyzed for training
      const { data: conversations } = await supabase
        .from("chat_conversations")
        .select("id, guest_name, messages, created_at")
        .eq("analyzed_for_training", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!conversations || conversations.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "Tidak ada percakapan baru untuk dianalisis", analyzed: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results: Array<{ conversation_id: string; examples_generated: number; saved: number }> = [];

      for (const conv of conversations) {
        const messagesArr: Array<{ role: string; content: string }> =
          Array.isArray(conv.messages) ? conv.messages : [];

        // Only process conversations with enough messages
        if (messagesArr.length < 4) {
          await supabase
            .from("chat_conversations")
            .update({ analyzed_for_training: true })
            .eq("id", conv.id);
          continue;
        }

        const transcript = messagesArr
          .map((m) => `${m.role === "user" ? "Tamu" : "Chatbot"}: ${m.content}`)
          .join("\n");

        const aiResult = await callAI(
          LOVABLE_API_KEY,
          model,
          [
            {
              role: "system",
              content: `Analisis percakapan chatbot hotel ini dan ekstrak contoh Q&A terbaik untuk melatih AI.
${hotelContext}
Pilih hanya pertanyaan-jawaban yang bernilai tinggi untuk training data.`,
            },
            {
              role: "user",
              content: `Percakapan:
${transcript}

Ekstrak 2-4 contoh Q&A training terbaik dalam format JSON array:
[
  {
    "question": "pertanyaan tamu yang natural",
    "answer": "jawaban chatbot yang ideal",
    "category": "booking/harga/fasilitas/lokasi/umum/lainnya"
  }
]

Jika tidak ada nilai training yang baik, kembalikan array kosong [].`,
            },
          ],
          { max_tokens: 1200, temperature: 0.3 }
        );

        if (aiResult.rateLimited) break;

        const rawContent = aiResult.data.choices[0]?.message?.content || "[]";
        let examples: Array<{ question?: string; answer?: string; category?: string }> = [];
        try {
          const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
          examples = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch {
          examples = [];
        }

        const toInsert = examples
          .filter((e) => e.question && e.answer)
          .map((e, idx) => ({
            question: e.question,
            answer: e.answer,
            category: e.category || "umum",
            is_active: false,
            auto_generated: true,
            display_order: 9500 + idx,
          }));

        let saved = 0;
        if (toInsert.length > 0) {
          const { error: insertErr } = await supabase
            .from("chatbot_training_examples")
            .insert(toInsert);
          if (!insertErr) saved = toInsert.length;
        }

        // Mark conversation as analyzed
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
          total_saved: totalSaved,
          pending_review: totalSaved,
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
