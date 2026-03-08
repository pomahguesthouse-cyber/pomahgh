import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildDokuHeaders } from "../_shared/doku-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (level: 'info' | 'error' | 'warn', message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'payment-gateway',
    function: 'doku-refund',
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
    const { transaction_id, amount, reason } = await req.json();

    if (!transaction_id || !amount) {
      return new Response(
        JSON.stringify({ error: "transaction_id and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("DOKU_CLIENT_ID")!;
    const secretKey = Deno.env.get("DOKU_SECRET_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dokuEnv = Deno.env.get("DOKU_ENV") || "production";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    log('info', 'Processing refund request', { requestId, transaction_id, amount, reason });

    const { data: txn, error: txnError } = await supabase
      .from("payment_transactions")
      .select("*, bookings(id, booking_code, guest_name, guest_email)")
      .eq("id", transaction_id)
      .eq("status", "paid")
      .single();

    if (txnError || !txn) {
      log('error', 'Transaction not found or not paid', { requestId, transaction_id, error: txnError?.message });
      return new Response(
        JSON.stringify({ error: "Transaction not found or not in paid status" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refundAmount = Math.round(amount);
    const paidAmount = Number(txn.amount);

    if (refundAmount > paidAmount) {
      return new Response(
        JSON.stringify({ error: "Refund amount exceeds paid amount", paid_amount: paidAmount, requested_refund: refundAmount }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const invoiceNumber = txn.merchant_order_id;
    const refundId = `REF-${invoiceNumber}-${Date.now()}`;

    // Build DOKU refund request
    const refundBody = JSON.stringify({
      order: {
        invoice_number: invoiceNumber,
        amount: refundAmount,
      },
      refund: {
        refund_id: refundId,
        description: reason || "Customer request",
      }
    });

    const requestTarget = "/orders/v1/refund";

    log('info', 'Calling DOKU refund API', { requestId, refundId, amount: refundAmount });

    const { headers: dokuHeaders, baseUrl } = await buildDokuHeaders(
      clientId, secretKey, requestTarget, refundBody, dokuEnv
    );

    const dokuResponse = await fetch(`${baseUrl}${requestTarget}`, {
      method: "POST",
      headers: dokuHeaders,
      body: refundBody,
    });

    const dokuData = await dokuResponse.json();
    const isSuccess = dokuResponse.ok && dokuData.refund?.status === "SUCCESS";

    // Insert refund record
    await supabase
      .from("payment_refunds")
      .insert({
        transaction_id,
        refund_id: refundId,
        merchant_order_id: invoiceNumber,
        amount: refundAmount,
        reason: reason || "Customer request",
        status: isSuccess ? "completed" : "failed",
        duitku_response: dokuData,
        processed_by: req.headers.get("x-user-id") || "system"
      });

    if (!isSuccess) {
      log('error', 'DOKU refund failed', { requestId, refundId, error: dokuData });
      return new Response(
        JSON.stringify({ error: "Refund failed", detail: dokuData, refund_id: refundId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check total refunded
    const { data: existingRefunds } = await supabase
      .from("payment_refunds")
      .select("amount")
      .eq("transaction_id", transaction_id)
      .eq("status", "completed");

    const totalRefunded = existingRefunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

    await supabase
      .from("payment_transactions")
      .update({
        refunded_amount: totalRefunded,
        status: totalRefunded >= paidAmount ? "refunded" : "partially_refunded",
        updated_at: new Date().toISOString()
      })
      .eq("id", transaction_id);

    if (totalRefunded >= paidAmount) {
      await supabase
        .from("bookings")
        .update({ payment_status: "refunded", status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", txn.booking_id);
    }

    log('info', 'Refund processed successfully', { requestId, refundId, amount: refundAmount });

    return new Response(
      JSON.stringify({ success: true, message: "Refund processed successfully", refund_id: refundId, amount: refundAmount, status: "completed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log('error', 'Refund processing error', { requestId, error: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
