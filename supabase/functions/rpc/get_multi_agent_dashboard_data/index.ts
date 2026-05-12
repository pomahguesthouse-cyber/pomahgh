import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ==============================
// CORS CONFIG
// ==============================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// ==============================
// ENV
// ==============================
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

// ==============================
// SUPABASE CLIENT
// ==============================
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==============================
// TYPES
// ==============================
interface RequestBody {
  mode: "deep_analyze" | "detect_faq";
}

interface Conversation {
  id: string;
  message: string;
  created_at: string;
}

interface FAQPattern {
  pattern: string;
  response: string;
}

// ==============================
// RESPONSE HELPER
// ==============================
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

// ==============================
// ANALYZE CONVERSATIONS
// ==============================
async function analyzeConversations(conversations: Conversation[]): Promise<object> {
  const totalMessages = conversations.length;

  return {
    totalMessages,
    commonTopics: ["billing", "login", "shipping"],
    userSentiments: ["positive", "neutral"],
  };
}

// ==============================
// DETECT FAQ PATTERNS
// ==============================
async function detectFAQPatterns(): Promise<FAQPattern[]> {
  return [
    {
      pattern: "How can I reset my password?",
      response: 'Visit settings and click "Reset Password".',
    },
    {
      pattern: "What is your return policy?",
      response: "We offer a 30-day return policy.",
    },
  ];
}

// ==============================
// MAIN SERVER
// ==============================
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body: RequestBody = await req.json();

    // Validate mode
    if (!body.mode) {
      return jsonResponse({ error: "Missing mode" }, 400);
    }

    switch (body.mode) {
      // ======================
      // DEEP ANALYZE
      // ======================
      case "deep_analyze": {
        const { data: conversations, error } = await supabase
          .from("whatsapp_conversations")
          .select("*")
          .order("created_at", {
            ascending: false,
          })
          .limit(20);

        if (error) {
          console.error(error);

          return jsonResponse(
            {
              error: "Failed to fetch conversations",
            },
            500,
          );
        }

        const analysis = await analyzeConversations(conversations as Conversation[]);

        return jsonResponse({
          success: true,
          data: analysis,
        });
      }

      // ======================
      // DETECT FAQ
      // ======================
      case "detect_faq": {
        const faqPatterns = await detectFAQPatterns();

        if (faqPatterns.length === 0) {
          return jsonResponse({
            success: true,
            message: "No FAQ patterns detected",
          });
        }

        const { data, error } = await supabase.from("whatsapp_faq_patterns").insert(faqPatterns).select();

        if (error) {
          console.error(error);

          return jsonResponse(
            {
              error: "Failed to insert FAQ patterns",
            },
            500,
          );
        }

        return jsonResponse({
          success: true,
          data,
        });
      }

      default:
        return jsonResponse({ error: "Invalid mode" }, 400);
    }
  } catch (error) {
    console.error(error);

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500,
    );
  }
});
