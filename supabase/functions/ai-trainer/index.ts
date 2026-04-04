import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { callAI, type AIMessage } from "../_shared/aiProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";

// ─── Prompt builders ───

function scenarioPrompt(scenario: any): string {
  const personaMap: Record<string, string> = {
    budget: "a budget-conscious backpacker looking for the cheapest room",
    luxury: "a luxury traveler expecting premium service and amenities",
    foreign: "a foreign tourist unfamiliar with local customs, communicating in English",
    difficult: "a demanding and sometimes rude guest who complains a lot",
  };
  const diffMap: Record<string, string> = {
    easy: "Ask straightforward questions. Be cooperative.",
    medium: "Ask follow-up questions, negotiate prices, compare with competitors.",
    hard: "Be very challenging: complain, demand discounts, threaten bad reviews, ask tricky edge-case questions.",
  };
  const lang = scenario.language === "en" ? "English" : "Indonesian";
  return `You are a simulated hotel guest with this profile:
- Persona: ${personaMap[scenario.persona] || scenario.persona}
- Difficulty: ${diffMap[scenario.difficulty] || scenario.difficulty}
- Communicate in ${lang}.
Stay in character. Your goal is to inquire about rooms at Pomah Guesthouse Semarang and test the customer service bot. Ask realistic questions about pricing, availability, facilities, and booking. ${scenario.goal ? `Additional goal: ${scenario.goal}` : ""}`;
}

function pomahSystemPrompt(scenario: any): string {
  const lang = scenario.language === "en" ? "English" : "Indonesian";
  return `You are the AI customer service assistant for Pomah Guesthouse, a cozy guesthouse in Semarang, Indonesia.
Your name is Pomah CS. Respond in ${lang}.
Be warm, friendly, persuasive, and professional. 
Guide the guest toward making a booking. Upsell when appropriate.
Room types available: Standard (Rp 200.000/night), Deluxe (Rp 350.000/night), Family Suite (Rp 500.000/night).
Facilities: Free WiFi, AC, hot water, rooftop garden, free breakfast, airport shuttle (extra fee).
Check-in: 14:00, Check-out: 12:00. Address: Jl. Pemuda No. 45, Semarang.`;
}

function evaluatorPrompt(): string {
  return `You are an expert hospitality training evaluator. Analyze the conversation between a guest and a hotel customer service bot.

You MUST respond by calling the "submit_evaluation" function with your scores and feedback. Do not respond with plain text.

Score each dimension 1-10:
- friendliness: How warm and welcoming was the bot?
- clarity: How clear and easy to understand were the responses?
- persuasiveness: How well did the bot guide toward booking?
- conversion: How likely would this lead to a booking?

Also provide:
- strengths: List of things done well (array of strings)
- weaknesses: List of areas for improvement (array of strings)
- suggestedReply: A single improved response the bot could have given at a weak point`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { action, scenario, conversation, sessionId } = await req.json();

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Generate Scenario ───
    if (action === "generate_scenario") {
      const goalMessages: AIMessage[] = [
        { role: "system", content: "Generate a one-sentence realistic goal for a hotel guest simulation. Just the goal, nothing else." },
        { role: "user", content: `Persona: ${scenario.persona}, Difficulty: ${scenario.difficulty}, Language: ${scenario.language}` },
      ];
      const result = await callAI(apiKey, MODEL, goalMessages, { max_tokens: 100 });
      if (result.rateLimited) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const goal = result.data.choices[0]?.message?.content?.trim() || "Ask about room availability and pricing.";
      return new Response(JSON.stringify({ goal }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Trainer (Guest) Message ───
    if (action === "trainer_message") {
      const messages: AIMessage[] = [
        { role: "system", content: scenarioPrompt(scenario) },
        ...(conversation || []).map((m: any) => ({
          role: m.role === "guest" ? "assistant" as const : "user" as const,
          content: m.content,
        })),
      ];
      if (conversation.length === 0) {
        messages.push({ role: "user", content: "Start the conversation as the guest. Send your first message." });
      }
      const result = await callAI(apiKey, MODEL, messages, { max_tokens: 300 });
      if (result.rateLimited) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const content = result.data.choices[0]?.message?.content?.trim() || "Halo, saya ingin tanya soal kamar.";
      return new Response(JSON.stringify({ role: "guest", content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Pomah (Bot) Reply ───
    if (action === "pomah_reply") {
      const messages: AIMessage[] = [
        { role: "system", content: pomahSystemPrompt(scenario) },
        ...(conversation || []).map((m: any) => ({
          role: m.role === "bot" ? "assistant" as const : "user" as const,
          content: m.content,
        })),
      ];
      const result = await callAI(apiKey, MODEL, messages, { max_tokens: 400 });
      if (result.rateLimited) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const content = result.data.choices[0]?.message?.content?.trim() || "Selamat datang di Pomah Guesthouse!";
      return new Response(JSON.stringify({ role: "bot", content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Evaluate ───
    if (action === "evaluate") {
      const convText = (conversation || [])
        .map((m: any) => `${m.role === "guest" ? "GUEST" : "BOT"}: ${m.content}`)
        .join("\n");

      const evalTools = [
        {
          type: "function",
          function: {
            name: "submit_evaluation",
            description: "Submit the evaluation scores and feedback",
            parameters: {
              type: "object",
              properties: {
                friendliness: { type: "number", minimum: 1, maximum: 10 },
                clarity: { type: "number", minimum: 1, maximum: 10 },
                persuasiveness: { type: "number", minimum: 1, maximum: 10 },
                conversion: { type: "number", minimum: 1, maximum: 10 },
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                suggestedReply: { type: "string" },
              },
              required: ["friendliness", "clarity", "persuasiveness", "conversion", "strengths", "weaknesses", "suggestedReply"],
            },
          },
        },
      ];

      const messages: AIMessage[] = [
        { role: "system", content: evaluatorPrompt() },
        { role: "user", content: `Evaluate this conversation:\n\n${convText}` },
      ];

      const result = await callAI(apiKey, MODEL, messages, {
        max_tokens: 800,
        tools: evalTools,
        tool_choice: { type: "function", function: { name: "submit_evaluation" } },
      });

      if (result.rateLimited) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const toolCall = result.data.choices[0]?.message?.tool_calls?.[0];
      let evaluation;
      if (toolCall) {
        evaluation = JSON.parse(toolCall.function.arguments);
      } else {
        evaluation = {
          friendliness: 7, clarity: 7, persuasiveness: 6, conversion: 6,
          strengths: ["Responsive"], weaknesses: ["Could improve upselling"],
          suggestedReply: "N/A",
        };
      }

      // Save session to DB
      if (sessionId) {
        await supabase.from("training_sessions").upsert({
          id: sessionId,
          user_id: user.id,
          scenario,
          conversation,
          evaluation,
          status: "completed",
          updated_at: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({ evaluation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Save session ───
    if (action === "save_session") {
      const { error } = await supabase.from("training_sessions").upsert({
        id: sessionId,
        user_id: user.id,
        scenario,
        conversation,
        status: "active",
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── List sessions ───
    if (action === "list_sessions") {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ sessions: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-trainer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
