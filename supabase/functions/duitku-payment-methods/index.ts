import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Valid amount is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantCode = Deno.env.get("DUITKU_MERCHANT_CODE")!;
    const apiKey = Deno.env.get("DUITKU_API_KEY")!;

    // Format: yyyy-MM-dd HH:mm:ss
    const now = new Date();
    const datetime = now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0") + " " +
      String(now.getHours()).padStart(2, "0") + ":" +
      String(now.getMinutes()).padStart(2, "0") + ":" +
      String(now.getSeconds()).padStart(2, "0");

    // Signature: SHA256(merchantCode + paymentAmount + datetime + apiKey)
    const signature = await sha256(merchantCode + Math.round(amount) + datetime + apiKey);

    console.log("Requesting payment methods with datetime:", datetime);

    const duitkuResponse = await fetch(
      "https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantcode: merchantCode,
          amount: Math.round(amount),
          datetime,
          signature,
        }),
      }
    );

    const duitkuData = await duitkuResponse.json();

    if (!duitkuData.paymentFee) {
      return new Response(
        JSON.stringify({ error: "Failed to get payment methods", detail: duitkuData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const methods = duitkuData.paymentFee.map((m: Record<string, unknown>) => ({
      code: m.paymentMethod,
      name: m.paymentName,
      image: m.paymentImage,
      fee: m.totalFee,
    }));

    return new Response(
      JSON.stringify({ success: true, methods }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get payment methods error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
