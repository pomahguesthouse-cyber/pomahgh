import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { md5 } from "../_shared/md5.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (level: 'info' | 'error', message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'payment-gateway',
    function: 'duitku-check-status',
    message,
    ...data
  }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

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
    const duitkuEnv = Deno.env.get("DUITKU_ENV") || "sandbox";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    log('info', 'Checking payment status', { requestId, merchant_order_id });

    const signature = await md5(merchantCode + merchant_order_id + apiKey);

    // Environment-based URL
    const DUITKU_BASE_URL = duitkuEnv === "production"
      ? "https://passport.duitku.com"
      : "https://sandbox.duitku.com";

    const duitkuResponse = await fetch(
      `${DUITKU_BASE_URL}/webapi/api/merchant/transactionStatus`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantCode, merchantOrderId: merchant_order_id, signature }),
      }
    );

    const duitkuData = await duitkuResponse.json();
    
    log('info', 'Duitku status response', { 
      requestId, 
      statusCode: duitkuData.statusCode,
      statusMessage: duitkuData.statusMessage 
    });

    let status = "pending";
    if (duitkuData.statusCode === "00") status = "paid";
    else if (duitkuData.statusCode === "02") status = "expired";
    else if (duitkuData.statusCode === "01") status = "pending";
    else status = "failed";

    // Only update if status changed
    const { data: txn, error: txnError } = await supabase
      .from("payment_transactions")
      .select("booking_id, status, amount")
      .eq("merchant_order_id", merchant_order_id)
      .single();

    if (txnError) {
      log('error', 'Transaction not found', { requestId, merchant_order_id, error: txnError.message });
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already in final state
    if (['paid', 'refunded', 'failed'].includes(txn.status)) {
      log('info', 'Transaction already in final state', { 
        requestId, 
        merchant_order_id, 
        currentStatus: txn.status 
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          status: txn.status,
          statusCode: duitkuData.statusCode,
          statusMessage: duitkuData.statusMessage,
          reference: duitkuData.reference,
          amount: txn.amount,
          message: "Transaction already processed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction
    await supabase
      .from("payment_transactions")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("merchant_order_id", merchant_order_id);

    if (status === "paid" && txn) {
      await supabase
        .from("bookings")
        .update({ 
          payment_status: "paid", 
          payment_amount: Number(duitkuData.amount),
          status: "confirmed"
        })
        .eq("id", txn.booking_id);

      log('info', 'Booking marked as paid', { requestId, bookingId: txn.booking_id });
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
    log('error', 'Check status error', { requestId, error: error.message });
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
