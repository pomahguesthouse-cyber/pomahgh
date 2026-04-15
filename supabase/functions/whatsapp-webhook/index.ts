import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getEnvConfig } from './types.ts';
import { validateWebhookAuth } from './middleware/auth.ts';
import { orchestrate } from './agents/orchestrator.ts';

/**
 * WhatsApp Webhook — Slim Entry Point
 * 
 * Architecture: Multi-Agent System
 * - Orchestrator → routes to appropriate agent
 * - Intent Agent → name collection, session init
 * - Booking Agent → AI conversation, tool calls, stuck recovery
 * - Pricing Agent → price approval commands (APPROVE/REJECT)
 * - FAQ Agent → manager chatbot routing (admin-chatbot)
 * - Middleware → auth, rate limiter, message batcher, sentiment
 * - Services → fonnte, session, conversation, context
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET — webhook verification
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      status: "ok",
      message: "WhatsApp webhook is active",
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth
  const authError = await validateWebhookAuth(req);
  if (authError) return authError;

  try {
    const env = getEnvConfig();
    return await orchestrate(req, env);
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new Response(JSON.stringify({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
