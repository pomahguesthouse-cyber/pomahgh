// ============= ADMIN CHATBOT - CLEAN ARCHITECTURE =============

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import from modular files
import { corsHeaders, LOVABLE_API_URL, type ManagerRole } from "./lib/constants.ts";
import { validateAuth } from "./lib/auth.ts";
import { buildSystemPrompt } from "./lib/systemPrompt.ts";
import { buildKnowledgeContext, buildTrainingContext } from "./lib/knowledgeContext.ts";
import { filterToolsByRole } from "./lib/toolFilter.ts";
import { executeToolWithValidation } from "./tools/executor.ts";
import { createSSEStream, createSSEResponse, createErrorResponse, sendTextChunk, type StreamContext } from "./lib/streamResponse.ts";
import { logAuditEntry } from "./lib/auditLog.ts";
import { TOOLS } from "./tools/definitions.ts";
import type { HotelSettings, PersonaSettings, ToolExecution } from "./lib/types.ts";
import { adminCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL, getOrLoadAdmin } from "./lib/cache.ts";
import { detectIntent, getToolGuidanceHint } from "./lib/intentDetector.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Authenticate
    const auth = await validateAuth(req, supabase);
    if (!auth.isAuthorized) {
      return createErrorResponse(auth.error || "Unauthorized", auth.status || 401);
    }

    const { messages, forceRefresh = false } = await req.json();

    // 2. Fetch context data with caching
    const [hotelSettingsData, chatbotSettingsData, knowledgeData, trainingData] = await Promise.all([
      getOrLoadAdmin(
        ADMIN_CACHE_KEYS.HOTEL_SETTINGS,
        async () => {
          const { data } = await supabase.from('hotel_settings')
            .select('hotel_name, check_in_time, check_out_time').single();
          return data;
        },
        ADMIN_CACHE_TTL.HOTEL_SETTINGS,
        forceRefresh
      ),
      getOrLoadAdmin(
        ADMIN_CACHE_KEYS.CHATBOT_SETTINGS,
        async () => {
          const { data } = await supabase.from('chatbot_settings')
            .select('admin_persona_name, admin_persona_role, admin_persona_traits, admin_communication_style, admin_language_formality, admin_emoji_usage, admin_custom_instructions, admin_greeting_template').single();
          return data;
        },
        ADMIN_CACHE_TTL.CHATBOT_SETTINGS,
        forceRefresh
      ),
      getOrLoadAdmin(
        ADMIN_CACHE_KEYS.KNOWLEDGE_BASE,
        async () => {
          const { data } = await supabase.from('admin_chatbot_knowledge_base')
            .select('title, content, category').eq('is_active', true).limit(15);
          return data || [];
        },
        ADMIN_CACHE_TTL.KNOWLEDGE_BASE,
        forceRefresh
      ),
      getOrLoadAdmin(
        ADMIN_CACHE_KEYS.TRAINING_EXAMPLES,
        async () => {
          const { data } = await supabase.from('admin_chatbot_training_examples')
            .select('question, ideal_answer, category').eq('is_active', true)
            .order('display_order', { ascending: true }).limit(20);
          return data || [];
        },
        ADMIN_CACHE_TTL.TRAINING_EXAMPLES,
        forceRefresh
      )
    ]);

    const hotelSettings: HotelSettings = {
      hotel_name: hotelSettingsData?.hotel_name || 'Hotel',
      check_in_time: hotelSettingsData?.check_in_time || '14:00',
      check_out_time: hotelSettingsData?.check_out_time || '12:00'
    };

    const cs = chatbotSettingsData;
    const personaSettings: PersonaSettings = {
      name: cs?.admin_persona_name || 'Rani Admin',
      role: cs?.admin_persona_role || 'Booking Manager Assistant',
      traits: cs?.admin_persona_traits || ['efisien', 'informatif', 'proaktif'],
      commStyle: cs?.admin_communication_style || 'santai-profesional',
      formality: cs?.admin_language_formality || 'informal',
      emojiUsage: cs?.admin_emoji_usage || 'minimal',
      customInstructions: cs?.admin_custom_instructions || '',
      greetingTemplate: cs?.admin_greeting_template || 'Halo {manager_name}! Ada yang bisa saya bantu?'
    };

    // 3. Detect intent from last user message
    interface ChatMessage { role: string; content: string }
    const lastUserMessage = (messages as ChatMessage[]).filter((m) => m.role === 'user').pop();
    const userMessage = lastUserMessage?.content || '';
    const intentMatch = detectIntent(userMessage);
    const intentHint = getToolGuidanceHint(intentMatch);
    
    console.log(`📝 Intent detected: ${intentMatch.intent} (${intentMatch.confidence}) → ${intentMatch.suggestedTool || 'none'}`);

    // 4. Build system prompt with intent hint
    const knowledgeContext = buildKnowledgeContext(knowledgeData || []);
    const trainingContext = buildTrainingContext(trainingData || []);

    const systemPrompt = buildSystemPrompt({
      managerName: auth.managerName,
      managerRole: auth.managerRole,
      hotelSettings,
      personaSettings,
      knowledgeContext,
      trainingContext,
      isFirstMessage: messages.length <= 1,
      intentHint
    });

    // 5. Filter tools by role
    const filteredTools = filterToolsByRole(TOOLS, auth.managerRole);

    // 6. Audit data
    const startTime = Date.now();
    const sessionId = crypto.randomUUID();
    const executedTools: ToolExecution[] = [];
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 6. Stream response
    const stream = createSSEStream(async (ctx: StreamContext) => {
      let finalResponse = '';
      let currentMessages: Array<{ role: string; content: string; tool_call_id?: string }> = [
        { role: "system", content: systemPrompt },
        ...(messages as ChatMessage[]).map((m) => ({ role: m.role, content: m.content }))
      ];
      
      let iterations = 0;
      const maxIterations = 5;

      while (iterations < maxIterations) {
        iterations++;
        
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

        const response = await fetch(`${LOVABLE_API_URL}/chat/completions`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`
          },
          body: JSON.stringify({
            messages: currentMessages,
            model: "google/gemini-3-flash-preview",
            tools: filteredTools,
            tool_choice: "auto"
          })
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.status}`);
        }

        const result = await response.json();
        const choice = result.choices?.[0];
        if (!choice) throw new Error("No response from AI");

        // Handle tool calls
        if (choice.message?.tool_calls?.length > 0) {
          currentMessages.push(choice.message);

          for (const toolCall of choice.message.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

            try {
              // Execute with role re-validation
              const toolResult = await executeToolWithValidation(
                supabase, toolName, toolArgs, auth.managerRole
              );
              
              executedTools.push({
                tool_name: toolName,
                arguments: toolArgs,
                result: toolResult,
                success: true,
                executed_at: new Date().toISOString()
              });

              currentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult)
              });
            } catch (toolError: unknown) {
              const errMsg = toolError instanceof Error ? toolError.message : String(toolError);
              console.error(`Tool error (${toolName}):`, toolError);
              
              executedTools.push({
                tool_name: toolName,
                arguments: toolArgs,
                error: errMsg,
                success: false,
                executed_at: new Date().toISOString()
              });

              currentMessages.push({
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: errMsg })
              });
            }
          }
          continue;
        }

        // Stream final response
        const content = choice.message?.content || "";
        if (content) {
          finalResponse = content;
          sendTextChunk(ctx, content);
        }
        break;
      }

      // Log audit entry
      await logAuditEntry(supabase, {
        adminId: auth.adminId!,
        adminEmail: auth.adminEmail,
        sessionId,
        userMessage,
        executedTools,
        aiResponse: finalResponse,
        durationMs: Date.now() - startTime,
        ipAddress,
        userAgent
      });

      return finalResponse;
    });

    return createSSEResponse(stream);

  } catch (error: unknown) {
    console.error("Admin chatbot error:", error);
    return createErrorResponse(error instanceof Error ? error.message : "Unknown error", 500);
  }
});
