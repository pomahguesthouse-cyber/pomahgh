import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, LOVABLE_API_URL } from "./lib/constants.ts";
import { getQuickGreeting } from "./services/greetingService.ts";
import { loadChatbotSettings } from "./services/settingsLoader.ts";
import { loadHotelData } from "./services/dataLoader.ts";
import { buildSystemPrompt } from "./ai/promptBuilder.ts";
import { tools } from "./ai/tools.ts";

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments?: string;
  };
}

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

interface ChatbotMeta {
  booking_created: boolean;
  booking_guest_email: string | null;
  tool_calls_used: string[];
}

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

    const CHATBOT_TOOLS_INTERNAL_SECRET = Deno.env.get("CHATBOT_TOOLS_INTERNAL_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
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

    const meta: ChatbotMeta = {
      booking_created: false,
      booking_guest_email: null,
      tool_calls_used: []
    };

    const callAi = async (chatMessages: ChatCompletionMessage[]) => {
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
            ...chatMessages
          ],
          tools,
          tool_choice: "auto",
          temperature: 0.4,
          max_tokens: maxTokens
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return { rateLimited: true, data: null };
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      return { rateLimited: false, data };
    };

    let workingMessages: ChatCompletionMessage[] = Array.isArray(messages) ? messages : [];
    const maxIterations = 4;

    for (let i = 0; i < maxIterations; i++) {
      const aiResult = await callAi(workingMessages);

      if (aiResult.rateLimited) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = aiResult.data;
      const aiMessage = data?.choices?.[0]?.message;

      if (!aiMessage) {
        throw new Error("No AI message returned");
      }

      const toolCalls: ToolCall[] = aiMessage.tool_calls || [];

      if (toolCalls.length === 0) {
        return new Response(JSON.stringify({
          choices: [{ message: { role: "assistant", content: aiMessage.content || "" } }],
          meta
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!CHATBOT_TOOLS_INTERNAL_SECRET) {
        throw new Error("CHATBOT_TOOLS_INTERNAL_SECRET is not configured");
      }

      const toolResults: ChatCompletionMessage[] = [];

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name;
        if (!toolName) continue;

        meta.tool_calls_used.push(toolName);

        let parameters: Record<string, unknown> = {};
        try {
          parameters = JSON.parse(toolCall.function?.arguments || "{}");
        } catch {
          parameters = {};
        }

        try {
          const toolResponse = await fetch(`${SUPABASE_URL}/functions/v1/chatbot-tools`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "X-Internal-Secret": CHATBOT_TOOLS_INTERNAL_SECRET,
            },
            body: JSON.stringify({
              tool_name: toolName,
              parameters,
            }),
          });

          let toolResult: unknown;
          if (!toolResponse.ok) {
            const errorText = await toolResponse.text();
            toolResult = { error: `Tool execution failed: ${errorText || toolResponse.status}` };
          } else {
            toolResult = await toolResponse.json();
          }

          if (
            toolName === "create_booking_draft" &&
            (toolResult as { success?: boolean })?.success
          ) {
            meta.booking_created = true;
            meta.booking_guest_email =
              (toolResult as { booking?: { guest_email?: string } })?.booking?.guest_email || null;
          }

          toolResults.push({
            role: "tool",
            content: JSON.stringify(toolResult),
            tool_call_id: toolCall.id,
          });
        } catch (toolError) {
          console.error(`Tool ${toolName} error:`, toolError);
          toolResults.push({
            role: "tool",
            content: JSON.stringify({ error: "Tool execution failed" }),
            tool_call_id: toolCall.id,
          });
        }
      }

      workingMessages = [
        ...workingMessages,
        {
          role: "assistant",
          content: aiMessage.content || "",
          tool_calls: toolCalls,
        },
        ...toolResults,
      ];
    }

    return new Response(JSON.stringify({
      choices: [{ message: { role: "assistant", content: "Maaf, saya tidak bisa memproses permintaan ini saat ini. Silakan coba lagi." } }],
      meta
    }), {
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
