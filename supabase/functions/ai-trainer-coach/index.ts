/**
 * AI Trainer Coach Edge Function
 *
 * An AI-powered chat coach that helps hotel admins create quality training data
 * for their WhatsApp chatbot. Responds via SSE streaming.
 *
 * Capabilities:
 * - Analyze overall training data quality
 * - Suggest missing categories / topics
 * - Generate example Q&A pairs on request
 * - Find near-duplicate training entries
 * - Review and give feedback on specific examples
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIStream } from "../_shared/aiProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// ── SSE helpers ────────────────────────────────────────────────────────────

function sseChunk(content: string): Uint8Array {
  const encoder = new TextEncoder();
  const payload = JSON.stringify({ choices: [{ delta: { content } }] });
  return encoder.encode(`data: ${payload}\n\n`);
}

function sseDone(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

function sseError(message: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
}

// ── Main ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(authHeader.slice(7));
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { messages = [] }: { messages: ChatMessage[] } = await req.json();

    // ── Load context ──────────────────────────────────────────────────────

    const [settingsRes, hotelRes, guestExamplesRes, adminExamplesRes, knowledgeRes] =
      await Promise.all([
        supabase
          .from("chatbot_settings")
          .select(
            "persona_name, persona_role"
          )
          .single(),
        supabase
          .from("hotel_settings")
          .select("hotel_name, check_in_time, check_out_time")
          .single(),
        supabase
          .from("chatbot_training_examples")
          .select("question, answer, category, is_active, auto_generated")
          .order("display_order", { ascending: true })
          .limit(80),
        supabase
          .from("admin_chatbot_training_examples")
          .select("question, ideal_answer, category, is_active")
          .order("display_order", { ascending: true })
          .limit(30),
        supabase
          .from("chatbot_knowledge_base")
          .select("title, content, category")
          .eq("is_active", true)
          .limit(20),
      ]);

    const model = "google/gemini-2.5-flash";
    const hotelName: string = hotelRes.data?.hotel_name || "Hotel";

    const guestExamples = guestExamplesRes.data || [];
    const adminExamples = adminExamplesRes.data || [];
    const knowledge = knowledgeRes.data || [];

    // Build concise context snapshots
    const guestSummary = guestExamples
      .slice(0, 40)
      .map((e: { category?: string; question: string; is_active?: boolean; auto_generated?: boolean }) =>
        `[${e.category || "umum"}${e.auto_generated ? " ✦auto" : ""}${!e.is_active ? " ✗inactive" : ""}] ${e.question}`
      )
      .join("\n");

    const adminSummary = adminExamples
      .slice(0, 15)
      .map(
        (e: { category?: string; question: string }) =>
          `[${e.category || "umum"}] ${e.question}`
      )
      .join("\n");

    const knowledgeSummary = knowledge
      .map((k: { title: string; category?: string }) => `• ${k.title} (${k.category || "umum"})`)
      .join("\n");

    // ── System prompt ─────────────────────────────────────────────────────

    const systemPrompt = `Kamu adalah AI Coach untuk training chatbot hotel "${hotelName}".
Tugasmu adalah membantu admin hotel membuat dan meningkatkan kualitas data training untuk AI chatbot WhatsApp mereka.

Model AI yang digunakan saat ini: ${model}

== DATA TRAINING GUEST CHATBOT (${guestExamples.length} contoh) ==
${guestSummary || "(belum ada data)"}

== DATA TRAINING ADMIN CHATBOT (${adminExamples.length} contoh) ==
${adminSummary || "(belum ada data)"}

== KNOWLEDGE BASE (${knowledge.length} artikel) ==
${knowledgeSummary || "(belum ada knowledge base)"}

== PANDUAN ==
Kamu bisa membantu admin dengan:
1. **Analisis kualitas** — review data training yang ada, temukan kelemahan
2. **Generate examples** — buat contoh Q&A baru untuk kategori tertentu
3. **Deteksi duplikat** — cari pertanyaan yang terlalu mirip
4. **Saran topik** — rekomendasikan topik yang perlu ditambah
5. **Feedback** — review dan koreksi contoh yang diberikan admin

Gunakan Bahasa Indonesia. Berikan jawaban yang praktis dan langsung bisa diterapkan.
Jika admin minta generate Q&A, gunakan format yang bisa langsung disalin.`;

    // ── Build message array for AI ────────────────────────────────────────

    const aiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.filter((m) => m.role === "user" || m.role === "assistant"),
    ];

    // ── Stream response ───────────────────────────────────────────────────

    const streamResult = await callAIStream(LOVABLE_API_KEY, model, aiMessages, {
      temperature: 0.6,
      max_tokens: 1500,
    });

    if (streamResult.rateLimited) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded, coba lagi sesaat" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const upstreamBody = streamResult.response.body;
    if (!upstreamBody) {
      throw new Error("No stream body from AI gateway");
    }

    // Passthrough SSE stream from gateway to client, with proper CORS headers
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Process upstream SSE and re-emit to client
    (async () => {
      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          await writer.write(new TextEncoder().encode(chunk));
        }
        await writer.write(sseDone());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Stream error";
        await writer.write(sseError(msg));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ai-trainer-coach] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
