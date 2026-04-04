/**
 * WhatsApp Learning Agent
 * 
 * An intelligent agent that learns from WhatsApp conversation logs to:
 * 1. Analyze conversation quality and patterns
 * 2. Extract FAQ patterns from recurring questions
 * 3. Detect new Indonesian slang/abbreviations
 * 4. Generate high-quality training examples
 * 5. Identify areas where the bot struggles
 * 6. Auto-promote proven response patterns to training
 *
 * Modes:
 *   deep_analyze   — Full analysis of unanalyzed WhatsApp conversations
 *   detect_faq     — Aggregate FAQ patterns across all insights
 *   detect_slang   — Find new slang from recent conversations
 *   promote_faq    — Auto-promote top FAQ patterns to training examples
 *   learning_report — Generate a learning progress report
 *   analyze_single — Analyze a single conversation by ID
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, type AIMessage } from "../_shared/aiProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const MAX_AI_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

async function callAIWithRetry(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  options: { max_tokens?: number; temperature?: number },
  retries = MAX_AI_RETRIES,
): Promise<ReturnType<typeof callAI>> {
  const result = await callAI(apiKey, model, messages, options);
  if (result.rateLimited && retries > 0) {
    console.warn(`[AI] Rate limited, retrying in ${RETRY_DELAY_MS}ms (${retries} left)`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return callAIWithRetry(apiKey, model, messages, options, retries - 1);
  }
  return result;
}

// ============================================================
// Main Handler
// ============================================================
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
    return jsonResponse({ error: "LOVABLE_API_KEY not configured" }, 500);
  }

  // --- Authentication ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const { mode, conversation_id, limit = 20 } = body;

    // Load hotel context for AI calls
    const hotelContext = await loadHotelContext(supabase);

    switch (mode) {
      case "deep_analyze":
        return await deepAnalyze(supabase, LOVABLE_API_KEY, hotelContext, Math.min(limit, 30));

      case "detect_faq":
        return await detectFAQPatterns(supabase, LOVABLE_API_KEY, hotelContext);

      case "detect_slang":
        return await detectNewSlang(supabase, LOVABLE_API_KEY);

      case "promote_faq":
        return await promoteFAQToTraining(supabase, LOVABLE_API_KEY, hotelContext);

      case "learning_report":
        return await generateLearningReport(supabase);

      case "analyze_single":
        if (!conversation_id) {
          return jsonResponse({ error: "conversation_id diperlukan untuk mode analyze_single" }, 400);
        }
        return await analyzeSingleConversation(supabase, LOVABLE_API_KEY, hotelContext, conversation_id);

      default:
        return jsonResponse({
          error: `Mode tidak dikenal: '${mode}'`,
          available_modes: ["deep_analyze", "detect_faq", "detect_slang", "promote_faq", "learning_report", "analyze_single"]
        }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp-learning-agent] Error:", message);
    return jsonResponse({ error: message }, 500);
  }
});

// ============================================================
// Mode: deep_analyze
// Deep analysis of WhatsApp conversation logs
// ============================================================
async function deepAnalyze(
  supabase: SupabaseClient,
  apiKey: string,
  hotelContext: string,
  limit: number
): Promise<Response> {
  // Get unanalyzed WhatsApp conversations (not yet in insights table)
  const { data: conversations } = await supabase
    .from("chat_conversations")
    .select("id, session_id, message_count, started_at, booking_created")
    .ilike("session_id", "wa_%")
    .order("message_count", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(limit);

  if (!conversations || conversations.length === 0) {
    return jsonResponse({ success: true, message: "Tidak ada percakapan baru", analyzed: 0 });
  }

  // Filter out already analyzed conversations
  const convIds = conversations.map(c => c.id);
  const { data: existingInsights } = await supabase
    .from("whatsapp_conversation_insights")
    .select("conversation_id")
    .in("conversation_id", convIds);

  const analyzedIds = new Set((existingInsights || []).map(i => i.conversation_id));
  const toAnalyze = conversations.filter(c => !analyzedIds.has(c.id));

  if (toAnalyze.length === 0) {
    return jsonResponse({ success: true, message: "Semua percakapan sudah dianalisis", analyzed: 0 });
  }

  const results: Array<{ conversation_id: string; success: boolean; topics?: string[] }> = [];
  let totalInsights = 0;
  const accuracyScores: number[] = [];
  let resolvedCount = 0;
  let totalAnalyzed = 0;

  for (const conv of toAnalyze) {
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (!messages || messages.length < 3) {
      // Too short, mark it with minimal insight
      await supabase.from("whatsapp_conversation_insights").insert({
        conversation_id: conv.id,
        session_id: conv.session_id,
        summary: "Percakapan terlalu singkat untuk analisis mendalam",
        topics: [],
        sentiment: "neutral",
        resolution_status: "abandoned",
        message_count: messages?.length || 0,
        model_used: MODEL,
      });
      results.push({ conversation_id: conv.id, success: true, topics: [] });
      continue;
    }

    const transcript = messages
      .map(m => `[${m.role === "user" ? "TAMU" : "BOT"}] ${m.content}`)
      .join("\n");

    try {
      const aiResult = await callAIWithRetry(apiKey, MODEL, [
        {
          role: "system",
          content: buildAnalysisPrompt(hotelContext),
        },
        {
          role: "user",
          content: `Analisis percakapan WhatsApp berikut:\n\n${transcript}\n\nKembalikan analisis dalam format JSON yang diminta.`,
        },
      ], { max_tokens: 2000, temperature: 0.2 });

      if (aiResult.rateLimited) {
        console.warn("[deep_analyze] Rate limited, stopping batch");
        break;
      }

      const rawContent = aiResult.data.choices[0]?.message?.content || "{}";
      const analysis = parseJsonFromAI(rawContent);

      if (analysis) {
        await supabase.from("whatsapp_conversation_insights").insert({
          conversation_id: conv.id,
          session_id: conv.session_id,
          summary: analysis.summary || "Tidak ada ringkasan",
          topics: analysis.topics || [],
          sentiment: validateEnum(analysis.sentiment, ["positive", "neutral", "negative", "mixed"], "neutral"),
          intent_flow: analysis.intent_flow || [],
          resolution_status: validateEnum(analysis.resolution_status, ["resolved", "unresolved", "escalated", "abandoned"], "unresolved"),
          bot_accuracy_score: clampScore(analysis.bot_accuracy_score),
          guest_satisfaction_signal: analysis.guest_satisfaction_signal || "neutral",
          common_questions: analysis.common_questions || [],
          failed_responses: analysis.failed_responses || [],
          successful_patterns: analysis.successful_patterns || [],
          suggested_improvements: analysis.suggested_improvements || [],
          new_slang_detected: analysis.new_slang_detected || [],
          message_count: messages.length,
          model_used: MODEL,
        });

        totalInsights++;
        totalAnalyzed++;
        const score = clampScore(analysis.bot_accuracy_score);
        accuracyScores.push(score);
        const resolution = validateEnum(analysis.resolution_status, ["resolved", "unresolved", "escalated", "abandoned"], "unresolved");
        if (resolution === "resolved") resolvedCount++;
        results.push({ conversation_id: conv.id, success: true, topics: analysis.topics });
      } else {
        results.push({ conversation_id: conv.id, success: false });
      }
    } catch (err) {
      console.error(`[deep_analyze] Error for ${conv.id}:`, err);
      results.push({ conversation_id: conv.id, success: false });
    }
  }

  // Record metrics
  const avgAccuracy = accuracyScores.length > 0
    ? accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length
    : undefined;
  const avgResolution = totalAnalyzed > 0
    ? resolvedCount / totalAnalyzed
    : undefined;

  await recordMetrics(supabase, {
    conversations_analyzed: results.filter(r => r.success).length,
    messages_processed: toAnalyze.reduce((sum, c) => sum + (c.message_count || 0), 0),
    insights_generated: totalInsights,
    avg_bot_accuracy: avgAccuracy,
    avg_resolution_rate: avgResolution,
  });

  return jsonResponse({
    success: true,
    analyzed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    insights_generated: totalInsights,
    results,
  });
}

// ============================================================
// Mode: detect_faq
// Aggregate FAQ patterns from conversation insights
// ============================================================
async function detectFAQPatterns(
  supabase: SupabaseClient,
  apiKey: string,
  hotelContext: string
): Promise<Response> {
  // Get recent insights with common_questions
  const { data: insights } = await supabase
    .from("whatsapp_conversation_insights")
    .select("id, conversation_id, common_questions, topics")
    .not("common_questions", "eq", "[]")
    .order("analyzed_at", { ascending: false })
    .limit(50);

  if (!insights || insights.length === 0) {
    return jsonResponse({ success: true, message: "Belum ada insight untuk dianalisis FAQ", patterns_found: 0 });
  }

  // Collect all common questions
  const allQuestions: Array<{ question: string; category?: string; conv_id: string }> = [];
  for (const insight of insights) {
    const questions = insight.common_questions as Array<{ question: string; category?: string }>;
    if (Array.isArray(questions)) {
      for (const q of questions) {
        if (q.question) {
          allQuestions.push({ ...q, conv_id: insight.conversation_id });
        }
      }
    }
  }

  if (allQuestions.length === 0) {
    return jsonResponse({ success: true, message: "Tidak ada pertanyaan umum ditemukan", patterns_found: 0 });
  }

  // Use AI to cluster similar questions into FAQ patterns
  const aiResult = await callAIWithRetry(apiKey, MODEL, [
    {
      role: "system",
      content: `Kamu adalah analis FAQ hotel. Tugasmu mengelompokkan pertanyaan-pertanyaan serupa dari tamu WhatsApp menjadi pola FAQ yang jelas.

${hotelContext}

Untuk setiap cluster pertanyaan serupa, buat:
1. canonical_question: Versi bersih dan umum dari pertanyaan
2. pattern_text: Pola regex-like untuk mendeteksi pertanyaan serupa
3. category: Kategori (booking, availability, facilities, payment, location, promo, complaint, general)
4. best_response: Jawaban ideal untuk pertanyaan ini
5. occurrence_count: Berapa kali muncul (estimasi dari data)

Kembalikan JSON array. Prioritaskan pertanyaan yang paling sering muncul.`
    },
    {
      role: "user",
      content: `Berikut ${allQuestions.length} pertanyaan tamu dari percakapan WhatsApp:\n\n${allQuestions.map((q, i) => `${i + 1}. "${q.question}" [${q.category || "unknown"}]`).join("\n")}\n\nKelompokkan menjadi FAQ patterns (maks 15 pattern). Format JSON array:\n[{"canonical_question":"...","pattern_text":"...","category":"...","best_response":"...","occurrence_count":N}]`
    }
  ], { max_tokens: 2500, temperature: 0.2 });

  if (aiResult.rateLimited) {
    return jsonResponse({ error: "Rate limited, coba lagi nanti" }, 429);
  }

  const rawContent = aiResult.data.choices[0]?.message?.content || "[]";
  const patterns = parseJsonArrayFromAI(rawContent);
  let savedCount = 0;

  for (const pattern of patterns) {
    if (!pattern.canonical_question) continue;

    // Check if similar pattern already exists
    const { data: existing } = await supabase
      .from("whatsapp_faq_patterns")
      .select("id, occurrence_count")
      .ilike("canonical_question", `%${pattern.canonical_question.substring(0, 30)}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update occurrence count
      await supabase.from("whatsapp_faq_patterns")
        .update({
          occurrence_count: (existing[0].occurrence_count || 0) + (pattern.occurrence_count || 1),
          last_seen_at: new Date().toISOString(),
          best_response: pattern.best_response || undefined,
        })
        .eq("id", existing[0].id);
    } else {
      // Insert new pattern
      const convIds = allQuestions
        .filter(q => q.question.toLowerCase().includes(pattern.canonical_question?.toLowerCase()?.substring(0, 20) || ""))
        .map(q => q.conv_id)
        .filter((v, i, a) => a.indexOf(v) === i);

      await supabase.from("whatsapp_faq_patterns").insert({
        pattern_text: pattern.pattern_text || pattern.canonical_question,
        canonical_question: pattern.canonical_question,
        category: pattern.category || "general",
        occurrence_count: pattern.occurrence_count || 1,
        best_response: pattern.best_response || null,
        response_quality_score: pattern.best_response ? 0.7 : null,
        conversation_ids: convIds,
      });
      savedCount++;
    }
  }

  await recordMetrics(supabase, { faq_patterns_found: savedCount });

  return jsonResponse({
    success: true,
    patterns_found: patterns.length,
    new_patterns_saved: savedCount,
    total_questions_analyzed: allQuestions.length,
  });
}

// ============================================================
// Mode: detect_slang
// Detect new Indonesian slang/abbreviations from conversations
// ============================================================
async function detectNewSlang(
  supabase: SupabaseClient,
  apiKey: string
): Promise<Response> {
  // Get recent user messages from WhatsApp
  const { data: recentConvs } = await supabase
    .from("chat_conversations")
    .select("id")
    .ilike("session_id", "wa_%")
    .order("started_at", { ascending: false })
    .limit(30);

  if (!recentConvs || recentConvs.length === 0) {
    return jsonResponse({ success: true, slang_found: 0 });
  }

  const convIds = recentConvs.map(c => c.id);
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("content")
    .in("conversation_id", convIds)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!messages || messages.length === 0) {
    return jsonResponse({ success: true, slang_found: 0 });
  }

  const userMessages = messages.map(m => m.content).join("\n---\n");

  // Known slang patterns (from whatsapp-webhook normalizer)
  const knownSlang = [
    "dlx", "delux", "grnd", "grd", "fam", "fmly", "sgl", "sngl",
    "kmr", "kmar", "brp", "brapa", "bs", "bsa", "bza",
    "gk", "ga", "ngga", "gak", "nggak", "sy", "ak", "gw", "gue",
    "mlm", "malem", "org", "orng", "tgl", "tggl", "kpn", "kapn",
    "bsk", "besuk", "lsa", "gmn", "gimana", "gmna",
    "udh", "udah", "sdh", "blm", "blum", "yg", "yng",
    "dg", "dgn", "utk", "utuk", "krn", "krna",
    "lg", "lgi", "msh", "msih", "jg", "jga", "tp", "tpi",
    "sm", "ama", "trims", "tq", "makasih", "mksh"
  ];

  const aiResult = await callAIWithRetry(apiKey, MODEL, [
    {
      role: "system",
      content: `Kamu adalah ahli bahasa Indonesia dan slang/singkatan digital. Tugas: deteksi singkatan dan slang BARU yang belum ada dalam daftar yang dikenal.

Slang yang SUDAH DIKENAL (JANGAN masukkan lagi):
${knownSlang.join(", ")}

Cari singkatan/slang BARU yang digunakan tamu hotel via WhatsApp. Fokus pada:
- Singkatan kata Indonesia yang belum ada di daftar
- Bahasa gaul baru
- Typo yang konsisten (indikasi singkatan)
- Singkatan industri hotel

Format output JSON array:
[{"slang":"singkatan","meaning":"arti lengkap","example":"contoh kalimat","confidence":"high/medium/low"}]

Hanya sertakan yang confidence medium/high. Array kosong jika tidak ada yang baru.`
    },
    {
      role: "user",
      content: `Analisis pesan-pesan tamu WhatsApp berikut untuk slang/singkatan baru:\n\n${userMessages.substring(0, 4000)}`
    }
  ], { max_tokens: 1000, temperature: 0.3 });

  if (aiResult.rateLimited) {
    return jsonResponse({ error: "Rate limited" }, 429);
  }

  const rawContent = aiResult.data.choices[0]?.message?.content || "[]";
  const newSlang = parseJsonArrayFromAI(rawContent);

  // Store detected slang in insights (aggregate in latest insight)
  if (newSlang.length > 0) {
    await recordMetrics(supabase, { slang_patterns_detected: newSlang.length });
  }

  return jsonResponse({
    success: true,
    slang_found: newSlang.length,
    new_slang: newSlang,
    messages_analyzed: messages.length,
    suggestion: newSlang.length > 0
      ? "Tambahkan slang baru ke SLANG_PATTERNS di whatsapp-webhook/index.ts"
      : "Tidak ada slang baru terdeteksi",
  });
}

// ============================================================
// Mode: promote_faq
// Auto-promote top FAQ patterns to training examples
// ============================================================
async function promoteFAQToTraining(
  supabase: SupabaseClient,
  apiKey: string,
  hotelContext: string
): Promise<Response> {
  // Get top FAQ patterns not yet promoted
  const { data: patterns } = await supabase
    .from("whatsapp_faq_patterns")
    .select("*")
    .eq("is_promoted_to_training", false)
    .gte("occurrence_count", 2)      // At least seen twice
    .not("best_response", "is", null)
    .order("occurrence_count", { ascending: false })
    .limit(10);

  if (!patterns || patterns.length === 0) {
    return jsonResponse({ success: true, message: "Tidak ada FAQ pattern siap dipromosikan", promoted: 0 });
  }

  // Use AI to polish the Q&A pairs before promoting
  const aiResult = await callAIWithRetry(apiKey, MODEL, [
    {
      role: "system",
      content: `Kamu adalah quality checker untuk training data chatbot hotel. Tugas: poles dan perbaiki pasangan Q&A dari data FAQ.

${hotelContext}

Untuk setiap Q&A:
1. Perbaiki bahasa agar natural dan ramah
2. Pastikan jawaban akurat sesuai konteks hotel
3. Tambahkan emoji jika sesuai
4. Tentukan category dan response_tags

Format output JSON array:
[{"question":"...","ideal_answer":"...","category":"...","response_tags":["empati","guide"...]}]`
    },
    {
      role: "user",
      content: `Poles Q&A berikut:\n\n${patterns.map((p, i) => `${i + 1}. Q: "${p.canonical_question}"\n   A: "${p.best_response}"\n   Category: ${p.category}`).join("\n\n")}`
    }
  ], { max_tokens: 2000, temperature: 0.3 });

  if (aiResult.rateLimited) {
    return jsonResponse({ error: "Rate limited" }, 429);
  }

  const rawContent = aiResult.data.choices[0]?.message?.content || "[]";
  const polished = parseJsonArrayFromAI(rawContent);
  let promoted = 0;

  // Get max display_order
  const { data: maxOrderData } = await supabase
    .from("chatbot_training_examples")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  let maxOrder = maxOrderData?.[0]?.display_order || 0;

  for (let i = 0; i < Math.min(polished.length, patterns.length); i++) {
    const p = polished[i];
    const pattern = patterns[i];
    if (!p?.question || !p?.ideal_answer) continue;

    // Insert training example
    const { data: training, error: insertErr } = await supabase
      .from("chatbot_training_examples")
      .insert({
        question: p.question,
        ideal_answer: p.ideal_answer,
        category: p.category || pattern.category || "general",
        is_active: false,  // Needs admin approval
        source: "auto_whatsapp",
        auto_generated: true,
        response_tags: p.response_tags || [],
        display_order: ++maxOrder,
      })
      .select("id")
      .single();

    if (!insertErr && training) {
      // Mark FAQ pattern as promoted
      await supabase.from("whatsapp_faq_patterns")
        .update({
          is_promoted_to_training: true,
          training_example_id: training.id,
        })
        .eq("id", pattern.id);
      promoted++;
    }
  }

  await recordMetrics(supabase, { training_examples_created: promoted });

  return jsonResponse({
    success: true,
    promoted,
    total_candidates: patterns.length,
    message: `${promoted} FAQ pattern dipromosikan ke training (menunggu approval admin)`,
  });
}

// ============================================================
// Mode: learning_report
// Generate a comprehensive learning report
// ============================================================
async function generateLearningReport(supabase: SupabaseClient): Promise<Response> {
  // Aggregate insights
  const { data: recentInsights } = await supabase
    .from("whatsapp_conversation_insights")
    .select("*")
    .order("analyzed_at", { ascending: false })
    .limit(50);

  const { data: faqPatterns } = await supabase
    .from("whatsapp_faq_patterns")
    .select("*")
    .order("occurrence_count", { ascending: false })
    .limit(20);

  const { data: metrics } = await supabase
    .from("whatsapp_learning_metrics")
    .select("*")
    .order("run_date", { ascending: false })
    .limit(7);

  const { count: trainingCount } = await supabase
    .from("chatbot_training_examples")
    .select("id", { count: "exact", head: true })
    .eq("source", "auto_whatsapp");

  const { count: pendingCount } = await supabase
    .from("chatbot_training_examples")
    .select("id", { count: "exact", head: true })
    .eq("source", "auto_whatsapp")
    .eq("is_active", false);

  // Compute stats
  const insights = recentInsights || [];
  const totalInsights = insights.length;
  const avgAccuracy = insights.reduce((s, i) => s + (i.bot_accuracy_score || 0), 0) / (totalInsights || 1);
  
  const sentimentDist = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
  const resolutionDist = { resolved: 0, unresolved: 0, escalated: 0, abandoned: 0 };
  const topicCounts: Record<string, number> = {};

  for (const insight of insights) {
    if (insight.sentiment) sentimentDist[insight.sentiment as keyof typeof sentimentDist]++;
    if (insight.resolution_status) resolutionDist[insight.resolution_status as keyof typeof resolutionDist]++;
    for (const topic of (insight.topics || [])) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }

  // All failed responses
  const allFailures: Array<{ user_msg: string; issue: string }> = [];
  for (const insight of insights) {
    const failures = insight.failed_responses as Array<{ user_msg: string; issue: string }>;
    if (Array.isArray(failures)) {
      allFailures.push(...failures.slice(0, 3));
    }
  }

  // All improvement suggestions
  const allSuggestions: Array<{ area: string; suggestion: string }> = [];
  for (const insight of insights) {
    const suggestions = insight.suggested_improvements as Array<{ area: string; suggestion: string }>;
    if (Array.isArray(suggestions)) {
      allSuggestions.push(...suggestions.slice(0, 2));
    }
  }

  // Top topics
  const topTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  return jsonResponse({
    success: true,
    report: {
      summary: {
        total_conversations_analyzed: totalInsights,
        avg_bot_accuracy: Math.round(avgAccuracy * 100) / 100,
        total_faq_patterns: (faqPatterns || []).length,
        total_training_from_wa: trainingCount || 0,
        pending_approval: pendingCount || 0,
      },
      sentiment_distribution: sentimentDist,
      resolution_distribution: resolutionDist,
      top_topics: topTopics,
      top_faq_patterns: (faqPatterns || []).slice(0, 10).map(p => ({
        question: p.canonical_question,
        category: p.category,
        occurrence_count: p.occurrence_count,
        has_response: !!p.best_response,
        promoted: p.is_promoted_to_training,
      })),
      recent_failures: allFailures.slice(0, 10),
      improvement_suggestions: allSuggestions.slice(0, 10),
      weekly_metrics: (metrics || []).map(m => ({
        date: m.run_date,
        conversations: m.conversations_analyzed,
        insights: m.insights_generated,
        faq_found: m.faq_patterns_found,
        training_created: m.training_examples_created,
      })),
    }
  });
}

// ============================================================
// Mode: analyze_single
// Analyze a single conversation in depth
// ============================================================
async function analyzeSingleConversation(
  supabase: SupabaseClient,
  apiKey: string,
  hotelContext: string,
  conversationId: string
): Promise<Response> {
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (!messages || messages.length === 0) {
    return jsonResponse({ error: "Percakapan tidak ditemukan atau kosong" }, 404);
  }

  const transcript = messages
    .map(m => `[${m.role === "user" ? "TAMU" : "BOT"}] ${m.content}`)
    .join("\n");

  const aiResult = await callAIWithRetry(apiKey, MODEL, [
    {
      role: "system",
      content: buildAnalysisPrompt(hotelContext),
    },
    {
      role: "user",
      content: `Analisis percakapan WhatsApp berikut secara mendalam:\n\n${transcript}\n\nKembalikan analisis dalam format JSON yang diminta.`,
    },
  ], { max_tokens: 2500, temperature: 0.2 });

  if (aiResult.rateLimited) {
    return jsonResponse({ error: "Rate limited" }, 429);
  }

  const rawContent = aiResult.data.choices[0]?.message?.content || "{}";
  const analysis = parseJsonFromAI(rawContent);

  if (!analysis) {
    return jsonResponse({ error: "Gagal menganalisis percakapan" }, 500);
  }

  // Store insight
  await supabase.from("whatsapp_conversation_insights").upsert({
    conversation_id: conversationId,
    summary: analysis.summary || "Tidak ada ringkasan",
    topics: analysis.topics || [],
    sentiment: validateEnum(analysis.sentiment, ["positive", "neutral", "negative", "mixed"], "neutral"),
    intent_flow: analysis.intent_flow || [],
    resolution_status: validateEnum(analysis.resolution_status, ["resolved", "unresolved", "escalated", "abandoned"], "unresolved"),
    bot_accuracy_score: clampScore(analysis.bot_accuracy_score),
    guest_satisfaction_signal: analysis.guest_satisfaction_signal || "neutral",
    common_questions: analysis.common_questions || [],
    failed_responses: analysis.failed_responses || [],
    successful_patterns: analysis.successful_patterns || [],
    suggested_improvements: analysis.suggested_improvements || [],
    new_slang_detected: analysis.new_slang_detected || [],
    message_count: messages.length,
    model_used: MODEL,
  }, { onConflict: "conversation_id" });

  return jsonResponse({
    success: true,
    conversation_id: conversationId,
    analysis,
    message_count: messages.length,
  });
}

// ============================================================
// Helpers
// ============================================================

function buildAnalysisPrompt(hotelContext: string): string {
  return `Kamu adalah analis percakapan AI untuk chatbot hotel. Analisis percakapan WhatsApp antara tamu dan chatbot secara mendalam.

${hotelContext}

Analisis dan kembalikan JSON object dengan field berikut:

{
  "summary": "Ringkasan singkat percakapan (1-2 kalimat bahasa Indonesia)",
  "topics": ["topik1", "topik2"],
  "sentiment": "positive|neutral|negative|mixed",
  "intent_flow": ["greeting", "availability_check", "booking", ...],
  "resolution_status": "resolved|unresolved|escalated|abandoned",
  "bot_accuracy_score": 0.0-1.0,
  "guest_satisfaction_signal": "happy|frustrated|neutral",
  "common_questions": [
    {"question": "pertanyaan umum (digeneralisasi)", "category": "booking|availability|facilities|payment|location|promo|complaint|general"}
  ],
  "failed_responses": [
    {"user_msg": "pesan tamu", "bot_response": "respons bot yang buruk", "issue": "masalah apa"}
  ],
  "successful_patterns": [
    {"trigger": "apa yang memicu respons bagus", "response_style": "gaya respons", "why_worked": "kenapa berhasil"}
  ],
  "suggested_improvements": [
    {"area": "area improvement", "suggestion": "saran perbaikan", "priority": "high|medium|low"}
  ],
  "new_slang_detected": [
    {"slang": "singkatan baru", "meaning": "arti", "context": "konteks penggunaan"}
  ]
}

Aturan penilaian:
- bot_accuracy_score 1.0 = semua respons akurat dan membantu
- bot_accuracy_score 0.5 = beberapa respons salah atau tidak membantu
- bot_accuracy_score 0.0 = bot gagal total
- resolved = tamu mendapat info/booking yang diinginkan
- unresolved = tamu tidak mendapat jawaban yang memuaskan
- escalated = perlu bantuan admin
- abandoned = tamu berhenti tanpa resolusi

PENTING: Kembalikan HANYA JSON object, tanpa teks tambahan.`;
}

async function loadHotelContext(supabase: SupabaseClient): Promise<string> {
  const [{ data: hotel }, { data: rooms }] = await Promise.all([
    supabase.from("hotel_settings")
      .select("hotel_name, address, check_in_time, check_out_time")
      .single(),
    supabase.from("rooms")
      .select("name, base_price")
      .eq("is_available", true)
      .limit(10),
  ]);

  const roomList = (rooms || [])
    .map((r: { name: string; base_price: number }) => `- ${r.name}: Rp ${r.base_price.toLocaleString("id-ID")}/malam`)
    .join("\n");

  return `Hotel: ${hotel?.hotel_name || "Pomah Guesthouse"}
Alamat: ${hotel?.address || "-"}
Check-in: ${hotel?.check_in_time || "14:00"} | Check-out: ${hotel?.check_out_time || "12:00"}
Kamar:
${roomList || "- Data tidak tersedia"}`;
}

function parseJsonFromAI(raw: string): Record<string, unknown> | null {
  try {
    // Try direct parse
    return JSON.parse(raw);
  } catch {
    // Try extracting JSON from markdown code block
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[1] || match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseJsonArrayFromAI(raw: string): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return [];
      }
    }
    return [];
  }
}

function validateEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }
  return fallback;
}

function clampScore(score: unknown): number {
  const num = typeof score === "number" ? score : parseFloat(String(score));
  if (isNaN(num)) return 0.5;
  return Math.max(0, Math.min(1, num));
}

async function recordMetrics(
  supabase: SupabaseClient,
  data: Partial<{
    conversations_analyzed: number;
    messages_processed: number;
    insights_generated: number;
    faq_patterns_found: number;
    training_examples_created: number;
    slang_patterns_detected: number;
    improvements_suggested: number;
    avg_bot_accuracy: number;
    avg_resolution_rate: number;
  }>
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Try to update existing row for today
  const { data: existing } = await supabase
    .from("whatsapp_learning_metrics")
    .select("id, conversations_analyzed, messages_processed, insights_generated, faq_patterns_found, training_examples_created, slang_patterns_detected, improvements_suggested")
    .eq("run_date", today)
    .maybeSingle();

  if (existing) {
    const updatePayload: Record<string, unknown> = {
      conversations_analyzed: (existing.conversations_analyzed || 0) + (data.conversations_analyzed || 0),
      messages_processed: (existing.messages_processed || 0) + (data.messages_processed || 0),
      insights_generated: (existing.insights_generated || 0) + (data.insights_generated || 0),
      faq_patterns_found: (existing.faq_patterns_found || 0) + (data.faq_patterns_found || 0),
      training_examples_created: (existing.training_examples_created || 0) + (data.training_examples_created || 0),
      slang_patterns_detected: (existing.slang_patterns_detected || 0) + (data.slang_patterns_detected || 0),
      improvements_suggested: (existing.improvements_suggested || 0) + (data.improvements_suggested || 0),
    };
    if (data.avg_bot_accuracy != null) updatePayload.avg_bot_accuracy = data.avg_bot_accuracy;
    if (data.avg_resolution_rate != null) updatePayload.avg_resolution_rate = data.avg_resolution_rate;
    await supabase.from("whatsapp_learning_metrics").update(updatePayload).eq("id", existing.id);
  } else {
    await supabase.from("whatsapp_learning_metrics").insert({
      run_date: today,
      ...data,
    });
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
