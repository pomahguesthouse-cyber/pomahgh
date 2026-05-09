import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RETENTION_DAYS = 90;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Hapus chat_messages lama (PII tamu di body)
    const { error: msgErr, count: msgCount } = await supabase
      .from("chat_messages")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);
    if (msgErr) throw msgErr;

    // Hapus chat_conversations yang sudah lewat retention
    const { error: convErr, count: convCount } = await supabase
      .from("chat_conversations")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);
    if (convErr) throw convErr;

    // Hapus whatsapp_sessions lama (kalau ada created_at < cutoff & tidak aktif)
    const { error: waErr, count: waCount } = await supabase
      .from("whatsapp_sessions")
      .delete({ count: "exact" })
      .lt("updated_at", cutoff);
    // jangan throw untuk whatsapp_sessions kalau kolom beda — log saja
    if (waErr) console.warn("whatsapp_sessions purge skipped:", waErr.message);

    const summary = {
      cutoff,
      retention_days: RETENTION_DAYS,
      deleted: {
        chat_messages: msgCount ?? 0,
        chat_conversations: convCount ?? 0,
        whatsapp_sessions: waCount ?? 0,
      },
    };
    console.log("purge-old-chat-data:", summary);

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("purge-old-chat-data error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
