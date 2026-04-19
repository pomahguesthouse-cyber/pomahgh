import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-service-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Dual auth: service role key (internal callers/cron) OR admin JWT (frontend)
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const xServiceKey = req.headers.get("x-service-key") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

  const isServiceRole = !!serviceKey && (bearer === serviceKey || xServiceKey === serviceKey);

  if (!isServiceRole) {
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.ok) {
      // Add CORS headers to the unauthorized response
      const body = await adminCheck.response.text();
      return new Response(body, {
        status: adminCheck.response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const { phone, message, type } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FONNTE_API_KEY = Deno.env.get("FONNTE_API_KEY");
    if (!FONNTE_API_KEY) {
      throw new Error("FONNTE_API_KEY not configured");
    }

    console.log("Sending WhatsApp to:", phone, "type:", type);

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": FONNTE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: phone,
        message: message,
        countryCode: "62",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Fonnte API error:", result);
      throw new Error(result.reason || "Failed to send WhatsApp");
    }

    console.log("WhatsApp sent successfully:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
