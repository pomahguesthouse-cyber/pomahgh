import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, LOVABLE_API_URL } from "./lib/constants.ts";
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
    if (!CHATBOT_TOOLS_INTERNAL_SECRET) {
      throw new Error("CHATBOT_TOOLS_INTERNAL_SECRET is not configured");
    }
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

    // NOTE: Quick greeting bypass removed intentionally.
    // All messages now go through full AI pipeline with persona, KB, and training.
    // This ensures consistent personality and knowledge-aware responses.

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

    const MAX_RETRIES = 1; // Hardcoded safety cap
    const callAi = async (chatMessages: ChatCompletionMessage[], retries = MAX_RETRIES) => {
      // Safety guard: never exceed MAX_RETRIES  
      const safeRetries = Math.min(Math.max(0, retries), MAX_RETRIES);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout
      
      try {
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
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          if (response.status === 429) {
            return { rateLimited: true, data: null };
          }
          // Retry once on 5xx (capped by MAX_RETRIES)
          if (response.status >= 500 && safeRetries > 0) {
            console.warn(`AI gateway ${response.status}, retrying (${safeRetries} left)...`);
            await new Promise(r => setTimeout(r, 2000));
            return callAi(chatMessages, safeRetries - 1);
          }
          const errorText = await response.text();
          console.error("AI gateway error:", response.status, errorText);
          throw new Error("AI gateway error");
        }

        const data = await response.json();
        return { rateLimited: false, data };
      } catch (err) {
        clearTimeout(timeout);
        if ((err as Error).name === 'AbortError') {
          if (safeRetries > 0) {
            console.warn(`AI gateway timeout, retrying (${safeRetries} left)...`);
            return callAi(chatMessages, safeRetries - 1);
          }
          throw new Error("AI gateway timeout");
        }
        throw err;
      }
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

      // Execute tools in parallel
      const toolResultPromises = toolCalls.map(async (toolCall) => {
        const toolName = toolCall.function?.name;
        if (!toolName) return null;

        meta.tool_calls_used.push(toolName);

        let parameters: Record<string, unknown> = {};
        try {
          parameters = JSON.parse(toolCall.function?.arguments || "{}");
        } catch {
          console.warn(`Tool ${toolName}: failed to parse arguments`);
          parameters = {};
        }

        try {
          const toolController = new AbortController();
          const toolTimeout = setTimeout(() => toolController.abort(), 15000); // 15s per tool
          
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
            signal: toolController.signal,
          });

          clearTimeout(toolTimeout);

          let toolResult: unknown;
          if (!toolResponse.ok) {
            const errorText = await toolResponse.text();
            toolResult = { error: `Tool ${toolName} failed: ${toolResponse.status}` };
            console.error(`Tool ${toolName} error: ${errorText}`);
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

          // Trim large tool results to reduce token growth
          const resultStr = JSON.stringify(toolResult);
          let trimmedResult = resultStr;
          if (resultStr.length > 5000) {
            // Smart compression: for arrays, keep first items that fit
            if (Array.isArray(toolResult)) {
              const kept: unknown[] = [];
              let size = 2; // []
              for (const item of toolResult) {
                const itemStr = JSON.stringify(item);
                if (size + itemStr.length + 1 > 4800) break;
                kept.push(item);
                size += itemStr.length + 1;
              }
              trimmedResult = JSON.stringify({ items: kept, total: toolResult.length, truncated: toolResult.length > kept.length });
            } else {
              trimmedResult = resultStr.substring(0, 5000) + '..."}';
            }
          }

          return {
            role: "tool" as const,
            content: trimmedResult,
            tool_call_id: toolCall.id,
          };
        } catch (toolError) {
          const errMsg = (toolError as Error).name === 'AbortError' 
            ? `Tool ${toolName} timeout (15s)` 
            : `Tool ${toolName} failed`;
          console.error(errMsg, toolError);
          return {
            role: "tool" as const,
            content: JSON.stringify({ error: errMsg }),
            tool_call_id: toolCall.id,
          };
        }
      });

      const toolResults = (await Promise.all(toolResultPromises)).filter(Boolean) as ChatCompletionMessage[];

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
