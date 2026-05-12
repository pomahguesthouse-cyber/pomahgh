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
// ENV VALIDATION
// ==============================
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

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
// MAIN SERVER
// ==============================
serve(async (req: Request): Promise<Response> => {
  // Handle preflight request
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
    // Parse body safely
    let body: RequestBody;

    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    // Validate mode
    if (!body.mode) {
      return jsonResponse({ error: "Missing mode field" }, 400);
    }

    switch (body.mode) {
      // =====================================
      // DEEP ANALYSIS
      // =====================================
      case "deep_analyze": {
        console.log("Performing deep analysis...");

        const { data: conversations, error } = await supabase
          .from("whatsapp_conversations")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          console.error("Database error:", error);

          return jsonResponse({ error: "Failed to fetch conversations" }, 500);
        }

        const analysisResult = await analyzeConversations(conversations as Conversation[]);

        return jsonResponse({
          success: true,
          data: analysisResult,
        });
      }

      // =====================================
      // FAQ DETECTION
      // =====================================
      case "detect_faq": {
        console.log("Detecting FAQ patterns...");

        const faqPatterns = await detectFAQPatterns();

        if (!faqPatterns || faqPatterns.length === 0) {
          return jsonResponse({
            success: true,
            message: "No FAQ patterns detected",
          });
        }

        const { data, error } = await supabase.from("whatsapp_faq_patterns").insert(faqPatterns).select();

        if (error) {
          console.error("Insert error:", error);

          return jsonResponse({ error: "Failed to insert FAQ patterns" }, 500);
        }

        return jsonResponse({
          success: true,
          inserted: data,
        });
      }

      default:
        return jsonResponse({ error: "Invalid mode" }, 400);
    }
  } catch (error) {
    console.error("Unexpected error:", error);

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500,
    );
  }
});

// ==============================
// ANALYZE CONVERSATIONS
// ==============================
async function analyzeConversations(conversations: Conversation[]): Promise<object> {
  // Example AI/NLP analysis placeholder

  const totalMessages = conversations.length;

  const summary = {
    totalMessages,
    commonTopics: ["billing", "login", "shipping"],
    userSentiments: ["positive", "neutral"],
  };

  return summary;
}

// ==============================
// DETECT FAQ PATTERNS
// ==============================
async function detectFAQPatterns(): Promise<FAQPattern[]> {
  // Placeholder ML / NLP logic

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
// RESPONSE HELPER
// ==============================
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}
