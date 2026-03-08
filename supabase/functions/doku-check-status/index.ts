import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildDokuHeaders } from "../_shared/doku-signature.ts";

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
    function: 'doku-check-status',
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

    const clientId = Deno.env.get("DOKU_CLIENT_ID")!;
    const secretKey = Deno.env.get("DOKU_SECRET_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dokuEnv = Deno.env.get("DOKU_ENV") || "production";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    log('info', 'Checking payment status', { requestId, merchant_order_id });

    // Get transaction from DB first
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
      log('info', 'Transaction already in final state', { requestId, merchant_order_id, currentStatus: txn.status });
      return new Response(
        JSON.stringify({
          success: true,
          status: txn.status,
          amount: txn.amount,
          message: "Transaction already processed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check with DOKU API - GET /orders/v1/status/{invoice_number}
    const requestTarget = `/orders/v1/status/${merchant_order_id}`;
    const emptyBody = "";
    
    const { headers: dokuHeaders, baseUrl } = await buildDokuHeaders(
      clientId, secretKey, requestTarget, emptyBody, dokuEnv
    );

    // For GET requests, remove Content-Type and use GET-specific digest
    delete dokuHeaders["Content-Type"];

    const dokuResponse = await fetch(`${baseUrl}${requestTarget}`, {
      method: "GET",
      headers: dokuHeaders,
    });

    const dokuData = await dokuResponse.json();

    log('info', 'DOKU status response', { requestId, transactionStatus: dokuData.transaction?.status });

    // Map DOKU status
    let status = "pending";
    const txnStatus = dokuData.transaction?.status;
    if (txnStatus === "SUCCESS") status = "paid";
    else if (txnStatus === "EXPIRED") status = "expired";
    else if (txnStatus === "FAILED") status = "failed";
    else if (txnStatus === "PENDING") status = "pending";

    // Update transaction
    await supabase
      .from("payment_transactions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("merchant_order_id", merchant_order_id);

    if (status === "paid" && txn) {
      await supabase
        .from("bookings")
        .update({ 
          payment_status: "paid", 
          payment_amount: Number(dokuData.order?.amount || txn.amount),
          status: "confirmed"
        })
        .eq("id", txn.booking_id);

      log('info', 'Booking marked as paid', { requestId, bookingId: txn.booking_id });
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        statusMessage: txnStatus,
        amount: dokuData.order?.amount || txn.amount,
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
