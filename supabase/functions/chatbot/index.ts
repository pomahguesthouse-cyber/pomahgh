import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, LOVABLE_API_URL } from "./lib/constants.ts";
import { getQuickGreeting } from "./services/greetingService.ts";
import { loadChatbotSettings } from "./services/settingsLoader.ts";
import { loadHotelData } from "./services/dataLoader.ts";
import { buildSystemPrompt } from "./ai/promptBuilder.ts";
import { tools } from "./ai/tools.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, chatbotSettings: providedSettings, conversationContext } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Load chatbot settings
    const settings = await loadChatbotSettings(supabase, providedSettings);

    // Get last user message
    const lastUserMessage = messages?.filter((m: { role: string; content: string }) => m.role === "user").pop()?.content || "";

    // Fast path: quick greeting bypass (skip AI for simple greetings)
    const greeting = getQuickGreeting(lastUserMessage, settings.persona_name);
    if (greeting) {
      console.log("Quick greeting response triggered for:", lastUserMessage);
      return new Response(JSON.stringify({
        choices: [{ message: { role: "assistant", content: greeting } }]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load hotel data (parallel fetch for efficiency)
    const hotelData = await loadHotelData(supabase);

    // Build optimized system prompt
    const systemPrompt = buildSystemPrompt({
      settings,
      hotelData,
      conversationContext,
      lastUserMessage
    });

    // Calculate max tokens based on response speed
    const maxTokens = settings.response_speed === 'fast' ? 500 
                    : settings.response_speed === 'detailed' ? 900 
                    : 700;

    // Call AI
    const response = await fetch(LOVABLE_API_URL, {
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
        tool_choice: "auto",
        temperature: 0.4,
        max_tokens: maxTokens
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
