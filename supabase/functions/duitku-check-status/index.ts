import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { md5 } from "../_shared/md5.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { merchant_order_id } = await req.json();

    if (!merchant_order_id) {
      return new Response(
        JSON.stringify({ error: "merchant_order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantCode = Deno.env.get("DUITKU_MERCHANT_CODE")!;
    const apiKey = Deno.env.get("DUITKU_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = await md5(merchantCode + merchant_order_id + apiKey);

    const duitkuResponse = await fetch(
      "https://sandbox.duitku.com/webapi/api/merchant/transactionStatus",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantCode, merchantOrderId: merchant_order_id, signature }),
      }
    );

    const duitkuData = await duitkuResponse.json();
    console.log("Duitku status:", JSON.stringify(duitkuData));

    let status = "pending";
    if (duitkuData.statusCode === "00") status = "paid";
    else if (duitkuData.statusCode === "02") status = "expired";
    else if (duitkuData.statusCode === "01") status = "pending";

    const { data: txn } = await supabase
      .from("payment_transactions")
      .update({ status })
      .eq("merchant_order_id", merchant_order_id)
      .select("booking_id")
      .single();

    if (status === "paid" && txn) {
      await supabase
        .from("bookings")
        .update({ payment_status: "paid", payment_amount: Number(duitkuData.amount) })
        .eq("id", txn.booking_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        statusCode: duitkuData.statusCode,
        statusMessage: duitkuData.statusMessage,
        reference: duitkuData.reference,
        amount: duitkuData.amount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check status error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
