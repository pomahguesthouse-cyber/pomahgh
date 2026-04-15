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
import { createTrace } from "../_shared/traceContext.ts";
import { logToolExecution } from "../_shared/agentLogger.ts";
import { createHallucinationGuard } from "../_shared/hallucinationGuard.ts";

const AI_FETCH_TIMEOUT_MS = 15_000; // 15 second timeout per AI call

const formatRoomPricesResponse = (hotelName: string, toolResult: unknown): string => {
  const rooms = (toolResult as { rooms?: Array<{ name: string; price_formatted?: string; effective_price?: number; base_price?: number; price_source?: string }> })?.rooms || [];

  if (rooms.length === 0) {
    return `Data harga kamar ${hotelName} tidak tersedia saat ini.`;
  }

  const lines = rooms.map((room, index) => {
    const formattedPrice = room.price_formatted || `Rp ${(room.effective_price || room.base_price || 0).toLocaleString('id-ID')}`;
    const sourceLabel = room.price_source === 'promo'
      ? ' (Promo)'
      : room.price_source === 'dynamic'
        ? ' (Dynamic)'
        : '';

    return `${index + 1}. *${room.name}*\n   💰 ${formattedPrice}${sourceLabel}`;
  });

  return `Berikut daftar harga kamar *${hotelName}* per malam:\n\n${lines.join('\n\n')}`;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const trace = createTrace(req, 'admin-chatbot');

    // 1. Authenticate
    const auth = await validateAuth(req, supabase);
    if (!auth.isAuthorized) {
      return createErrorResponse(auth.error || "Unauthorized", auth.status || 401);
    }

    const { messages, forceRefresh = false } = await req.json();
    const chatMessages = Array.isArray(messages) ? messages : [];

    // 2. Fetch context data with caching
    const [hotelSettingsData, chatbotSettingsData, knowledgeData, trainingData, facilitiesData, nearbyData, guestKBData, guestTrainingData] = await Promise.all([
      getOrLoadAdmin(
        ADMIN_CACHE_KEYS.HOTEL_SETTINGS,
        async () => {
          const { data } = await supabase.from('hotel_settings')
            .select('hotel_name, check_in_time, check_out_time, address, whatsapp_number, phone_primary').single();
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
      ),
      // NEW: Load facilities
      getOrLoadAdmin(
        'admin_facilities',
        async () => {
          const { data } = await supabase.from('facilities')
            .select('title, description').eq('is_active', true).order('display_order');
          return data || [];
        },
        ADMIN_CACHE_TTL.HOTEL_SETTINGS,
        forceRefresh
      ),
      // NEW: Load nearby locations
      getOrLoadAdmin(
        'admin_nearby_locations',
        async () => {
          const { data } = await supabase.from('nearby_locations')
            .select('name, category, distance_km, travel_time_minutes')
            .eq('is_active', true).order('distance_km').limit(10);
          return data || [];
        },
        ADMIN_CACHE_TTL.HOTEL_SETTINGS,
        forceRefresh
      ),
      // NEW: Load guest chatbot knowledge base (hotel info)
      getOrLoadAdmin(
        'admin_guest_kb',
        async () => {
          const { data } = await supabase.from('chatbot_knowledge_base')
            .select('title, content, category, summary').eq('is_active', true).order('category');
          return data || [];
        },
        ADMIN_CACHE_TTL.KNOWLEDGE_BASE,
        forceRefresh
      ),
      // NEW: Load guest chatbot training examples
      getOrLoadAdmin(
        'admin_guest_training',
        async () => {
          const { data } = await supabase.from('chatbot_training_examples')
            .select('question, ideal_answer, category').eq('is_active', true)
            .order('display_order', { ascending: true }).limit(20);
          return data || [];
        },
        ADMIN_CACHE_TTL.TRAINING_EXAMPLES,
        forceRefresh
      ),
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
    const lastUserMessage = (chatMessages as ChatMessage[]).filter((m) => m.role === 'user').pop();
    const userMessage = lastUserMessage?.content || '';
    const intentMatch = detectIntent(userMessage);
    const intentHint = getToolGuidanceHint(intentMatch);

    console.log(`📝 Intent detected: ${intentMatch.intent} (${intentMatch.confidence}) → ${intentMatch.suggestedTool || 'none'}`);
    trace.info('Intent detected', { intent: intentMatch.intent, confidence: intentMatch.confidence, tool: intentMatch.suggestedTool });

    // 4. Build system prompt with intent hint
    // Combine admin KB + guest KB for comprehensive knowledge
    const allKnowledge = [...(knowledgeData || []), ...(guestKBData || [])];
    const knowledgeContext = buildKnowledgeContext(allKnowledge);
    // Combine admin training + guest training
    const allTraining = [...(trainingData || []), ...(guestTrainingData || [])];
    const trainingContext = buildTrainingContext(allTraining, 10, 300);

    // Build facilities and nearby locations context
    const facilities = (facilitiesData || []) as Array<{title: string; description: string}>;
    const facilitiesContext = facilities.length > 0
      ? `\n\n✨ FASILITAS HOTEL:\n${facilities.map(f => `- ${f.title}: ${f.description}`).join('\n')}`
      : '';
    
    const nearby = (nearbyData || []) as Array<{name: string; category: string; distance_km: number; travel_time_minutes: number}>;
    const nearbyContext = nearby.length > 0
      ? `\n\n🗺️ LOKASI SEKITAR:\n${nearby.map(l => `- ${l.name} (${l.category}): ${l.distance_km} km, ~${l.travel_time_minutes} menit`).join('\n')}`
      : '';

    const systemPrompt = buildSystemPrompt({
      managerName: auth.managerName,
      managerRole: auth.managerRole,
      hotelSettings,
      personaSettings,
      knowledgeContext: knowledgeContext + facilitiesContext + nearbyContext,
      trainingContext,
      isFirstMessage: chatMessages.length <= 1,
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

    // Force tool execution for room price requests to avoid hallucination
    if (intentMatch.suggestedTool === 'get_room_prices' && intentMatch.confidence !== 'low') {
      const forcedToolStart = Date.now();
      // Extract room name from user message if mentioned
      const roomNameMatch = userMessage.match(/(?:kamar|room|tipe|type)\s+(\w+)/i);
      const forcedArgs = roomNameMatch ? { room_name: roomNameMatch[1] } : {};
      const roomToolResult = await executeToolWithValidation(supabase, 'get_room_prices', forcedArgs, auth.managerRole);

      logToolExecution(supabase, {
        trace_id: trace.traceId, tool_name: 'get_room_prices',
        arguments: {}, result_status: 'success',
        result_summary: 'forced_price_lookup',
        duration_ms: Date.now() - forcedToolStart, agent_name: 'admin-chatbot',
      });

      executedTools.push({
        tool_name: 'get_room_prices',
        arguments: {},
        result: roomToolResult,
        success: true,
        executed_at: new Date().toISOString()
      });

      const forcedResponse = formatRoomPricesResponse(hotelSettings.hotel_name, roomToolResult);

      await logAuditEntry(supabase, {
        adminId: auth.adminId!,
        adminEmail: auth.adminEmail,
        sessionId,
        userMessage,
        executedTools,
        aiResponse: forcedResponse,
        durationMs: Date.now() - startTime,
        ipAddress,
        userAgent
      });

      const stream = createSSEStream(async (ctx: StreamContext) => {
        sendTextChunk(ctx, forcedResponse);
        return forcedResponse;
      });

      return createSSEResponse(stream);
    }

    // 6. Stream response
    const stream = createSSEStream(async (ctx: StreamContext) => {
      let finalResponse = '';
      let currentMessages: Array<{ role: string; content: string; tool_call_id?: string }> = [
        { role: "system", content: systemPrompt },
        ...(chatMessages as ChatMessage[]).map((m) => ({ role: m.role, content: m.content }))
      ];
      
      let iterations = 0;
      const maxIterations = 5;
      const allToolResults: string[] = [];

      while (iterations < maxIterations) {
        iterations++;
        
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);

        let response: Response;
        try {
          response = await fetch(`${LOVABLE_API_URL}/chat/completions`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${LOVABLE_API_KEY}`
            },
            body: JSON.stringify({
              messages: currentMessages,
              model: "google/gemini-2.5-flash",
              tools: filteredTools,
              tool_choice: "auto"
            }),
            signal: controller.signal,
          });
        } catch (fetchErr: unknown) {
          clearTimeout(timeoutId);
          if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
            throw new Error(`AI API timeout after ${AI_FETCH_TIMEOUT_MS}ms`);
          }
          throw fetchErr;
        }
        clearTimeout(timeoutId);

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
            const toolStart = Date.now();

            try {
              // Execute with role re-validation
              const toolResult = await executeToolWithValidation(
                supabase, toolName, toolArgs, auth.managerRole
              );
              
              logToolExecution(supabase, {
                trace_id: trace.traceId, tool_name: toolName, arguments: toolArgs,
                result_status: 'success', result_summary: JSON.stringify(toolResult).substring(0, 200),
                duration_ms: Date.now() - toolStart, agent_name: 'admin-chatbot',
              });

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
              allToolResults.push(JSON.stringify(toolResult));
            } catch (toolError: unknown) {
              const errMsg = toolError instanceof Error ? toolError.message : String(toolError);
              console.error(`Tool error (${toolName}):`, toolError);
              
              logToolExecution(supabase, {
                trace_id: trace.traceId, tool_name: toolName, arguments: toolArgs,
                result_status: 'failed', error_message: errMsg,
                duration_ms: Date.now() - toolStart, agent_name: 'admin-chatbot',
              });

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

        // Stream final response with hallucination guard
        const content = choice.message?.content || "";
        if (content) {
          // Validate AI response against tool results
          const guard = createHallucinationGuard({
            roomPrices: allToolResults.flatMap(tr => {
              const prices: number[] = [];
              for (const m of tr.matchAll(/"(?:price_per_night|effective_price|base_price)"\s*:\s*(\d+)/g)) {
                prices.push(Number(m[1]));
              }
              return prices;
            }),
            knownBookingCodes: allToolResults.flatMap(tr => {
              return [...tr.matchAll(/PMH-[A-Z0-9]{4,10}/gi)].map(m => m[0]);
            }),
          });
          const validation = guard.validate(content, allToolResults);
          if (!validation.passed) {
            console.warn(`⚠️ Hallucination guard flagged ${validation.violations.length} violation(s):`,
              validation.violations.map(v => `${v.type}: ${v.detail}`));
          }
          finalResponse = validation.passed ? content : validation.corrected;
          sendTextChunk(ctx, finalResponse);
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
