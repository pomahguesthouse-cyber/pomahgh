import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, content, title, category, filename } = await req.json();

    let parsedContent = "";
    let sourceType = type;

    if (type === "url") {
      // Fetch content from URL
      const response = await fetch(content);
      const html = await response.text();
      // Simple HTML to text extraction
      parsedContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 10000);
      sourceType = "url";
    } else if (type === "text") {
      parsedContent = content;
      sourceType = "txt";
    } else if (type === "file") {
      parsedContent = content;
      sourceType = filename?.split(".").pop() || "txt";
    }

    const tokensCount = Math.ceil(parsedContent.length / 4);
    const summary = parsedContent.substring(0, 200);

    const { data, error } = await supabase
      .from("admin_chatbot_knowledge_base")
      .insert({
        title,
        content: parsedContent,
        summary,
        category: category || "general",
        source_type: sourceType,
        source_url: type === "url" ? content : null,
        original_filename: filename || null,
        tokens_count: tokensCount,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Parse admin knowledge error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
