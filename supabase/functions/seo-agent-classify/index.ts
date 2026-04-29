import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * Klasifikasi intent keyword.
 * - Heuristik regex untuk kata kunci penginapan/wisata.
 * - Lovable AI gemini-2.5-flash-lite untuk klasifikasi semantik (tool calling).
 * - Update status keyword: qualified | rejected.
 */

interface ReqBody {
  keywordIds?: string[];
  limit?: number;
}

const ACCOMMODATION_RX = /(hotel|penginapan|guesthouse|guest house|villa|homestay|stay|menginap|losmen|wisma|kosan|kost|resort)/i;
const ATTRACTION_RX = /(wisata|tempat|destinasi|pantai|gunung|kuliner|cafe|restoran|festival|event|acara|liburan)/i;

const heuristicIntent = (kw: string): { intent: string; score: number } => {
  if (ACCOMMODATION_RX.test(kw)) return { intent: "accommodation", score: 0.85 };
  if (ATTRACTION_RX.test(kw)) return { intent: "attraction", score: 0.7 };
  return { intent: "other", score: 0.3 };
};

const classifyWithAI = async (
  apiKey: string,
  model: string,
  keywords: string[]
): Promise<Array<{ keyword: string; intent: string; score: number; reasoning: string }>> => {
  const tool = {
    type: "function",
    function: {
      name: "classify_keywords",
      description: "Classify each keyword's primary user intent for a guesthouse in Semarang, Indonesia.",
      parameters: {
        type: "object",
        properties: {
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                keyword: { type: "string" },
                intent: {
                  type: "string",
                  enum: ["accommodation", "attraction", "event", "food", "other"],
                },
                score: { type: "number", description: "Confidence 0-1" },
                reasoning: { type: "string" },
              },
              required: ["keyword", "intent", "score", "reasoning"],
            },
          },
        },
        required: ["results"],
      },
    },
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Klasifikasikan setiap keyword ke salah satu intent. Konteks: Pomah Guesthouse di Semarang. " +
            "Intent 'accommodation' = pencari penginapan. 'attraction' = wisata/destinasi. " +
            "'event' = acara/festival. 'food' = kuliner. 'other' = tidak relevan untuk penginapan.",
        },
        { role: "user", content: `Keywords:\n${keywords.map((k) => `- ${k}`).join("\n")}` },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "classify_keywords" } },
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("AI rate limit. Coba lagi nanti.");
    if (res.status === 402) throw new Error("Kredit Lovable AI habis.");
    throw new Error(`AI gateway error ${res.status}`);
  }

  const data = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return [];
  const parsed = JSON.parse(args);
  return parsed.results ?? [];
};

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const limit = body.limit ?? 30;

    let query = supabase.from("seo_keywords").select("id, keyword").eq("status", "new").limit(limit);
    if (body.keywordIds?.length) {
      query = supabase.from("seo_keywords").select("id, keyword").in("id", body.keywordIds);
    }
    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ classified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Settings
    const { data: settings } = await supabase
      .from("seo_agent_settings")
      .select("target_intents, intent_threshold, model_classifier")
      .limit(1)
      .maybeSingle();
    const targetIntents: string[] = settings?.target_intents ?? ["accommodation", "attraction"];
    const threshold: number = Number(settings?.intent_threshold ?? 0.6);
    const model: string = settings?.model_classifier ?? "google/gemini-2.5-flash-lite";

    // Batch AI in chunks of 20
    const aiResults = new Map<string, { intent: string; score: number; reasoning: string }>();
    for (let i = 0; i < rows.length; i += 20) {
      const chunk = rows.slice(i, i + 20);
      try {
        const out = await classifyWithAI(lovableKey, model, chunk.map((r) => r.keyword));
        out.forEach((o) => aiResults.set(o.keyword.toLowerCase(), o));
      } catch (e) {
        console.warn("[classify] AI batch failed, falling back to heuristic:", e);
      }
    }

    let qualified = 0;
    let rejected = 0;

    for (const row of rows) {
      const heur = heuristicIntent(row.keyword);
      const ai = aiResults.get(row.keyword.toLowerCase());
      const intent = ai?.intent ?? heur.intent;
      // Combine: AI weight 0.7, heuristic 0.3 if both agree, else AI only
      const score =
        ai && ai.intent === heur.intent
          ? Math.min(1, ai.score * 0.7 + heur.score * 0.3)
          : ai?.score ?? heur.score;
      const reasoning = ai?.reasoning ?? "Heuristic regex match";

      const isQualified = targetIntents.includes(intent) && score >= threshold;
      const status = isQualified ? "qualified" : "rejected";

      await supabase
        .from("seo_keywords")
        .update({
          intent_category: intent,
          intent_score: score,
          intent_reasoning: reasoning,
          status,
          rejection_reason: isQualified
            ? null
            : `Intent '${intent}' tidak target atau skor ${score.toFixed(2)} < ${threshold}`,
          processed_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (isQualified) qualified++;
      else rejected++;
    }

    await supabase.from("seo_agent_runs").insert({
      step: "filter",
      status: "success",
      model_used: model,
      payload: { processed: rows.length, qualified, rejected, threshold },
    });

    return new Response(
      JSON.stringify({ processed: rows.length, qualified, rejected }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[seo-agent-classify] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});