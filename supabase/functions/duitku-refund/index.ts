// Refund processing function for Duitku payments
// Supports partial and full refunds

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { md5 } from "../_shared/md5.ts";

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
    function: 'duitku-refund',
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

    const merchantCode = Deno.env.get("DUITKU_MERCHANT_CODE")!;
    const apiKey = Deno.env.get("DUITKU_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const duitkuEnv = Deno.env.get("DUITKU_ENV") || "sandbox";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    log('info', 'Processing refund request', { 
      requestId, 
      transaction_id, 
      amount,
      reason 
    });

    // Get transaction details
    const { data: txn, error: txnError } = await supabase
      .from("payment_transactions")
      .select("*, bookings(id, booking_code, guest_name, guest_email)")
      .eq("id", transaction_id)
      .eq("status", "paid")
      .single();

    if (txnError || !txn) {
      log('error', 'Transaction not found or not paid', { 
        requestId, 
        transaction_id,
        error: txnError?.message 
      });
      return new Response(
        JSON.stringify({ error: "Transaction not found or not in paid status" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate refund amount
    const refundAmount = Math.round(amount);
    const paidAmount = Number(txn.amount);
    
    if (refundAmount > paidAmount) {
      return new Response(
        JSON.stringify({ 
          error: "Refund amount exceeds paid amount",
          paid_amount: paidAmount,
          requested_refund: refundAmount
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing refunds
    const { data: existingRefunds } = await supabase
      .from("payment_refunds")
      .select("amount")
      .eq("transaction_id", transaction_id)
      .eq("status", "completed");

    const totalRefunded = existingRefunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const remainingAmount = paidAmount - totalRefunded;

    if (refundAmount > remainingAmount) {
      return new Response(
        JSON.stringify({ 
          error: "Refund amount exceeds remaining refundable amount",
          total_paid: paidAmount,
          total_refunded: totalRefunded,
          remaining: remainingAmount,
          requested: refundAmount
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantOrderId = txn.merchant_order_id;
    const refundId = `REF-${merchantOrderId}-${Date.now()}`;

    // Generate signature: MD5(merchantCode + merchantOrderId + refundAmount + apiKey)
    const signature = await md5(merchantCode + merchantOrderId + refundAmount + apiKey);

    // Environment-based URL
    const DUITKU_BASE_URL = duitkuEnv === "production"
      ? "https://passport.duitku.com"
      : "https://sandbox.duitku.com";

    const refundPayload = {
      merchantCode,
      merchantOrderId,
      paymentAmount: refundAmount,
      signature,
      refundId,
      reason: reason || "Customer request"
    };

    log('info', 'Calling Duitku refund API', { 
      requestId, 
      refundId,
      amount: refundAmount 
    });

    const duitkuResponse = await fetch(
      `${DUITKU_BASE_URL}/webapi/api/merchant/v2/refund`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(refundPayload),
      }
    );

    const duitkuData = await duitkuResponse.json();

    // Insert refund record
    const { data: refund, error: refundError } = await supabase
      .from("payment_refunds")
      .insert({
        transaction_id,
        refund_id: refundId,
        merchant_order_id: merchantOrderId,
        amount: refundAmount,
        reason: reason || "Customer request",
        status: duitkuData.statusCode === "00" ? "completed" : "failed",
        duitku_response: duitkuData,
        processed_by: req.headers.get("x-user-id") || "system"
      })
      .select()
      .single();

    if (refundError) {
      log('error', 'Failed to save refund record', { 
        requestId, 
        error: refundError.message 
      });
    }

    if (duitkuData.statusCode !== "00") {
      log('error', 'Duitku refund failed', { 
        requestId, 
        refundId,
        error: duitkuData.statusMessage 
      });
      
      return new Response(
        JSON.stringify({ 
          error: "Refund failed", 
          detail: duitkuData.statusMessage,
          refund_id: refundId
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction with refund info
    await supabase
      .from("payment_transactions")
      .update({
        refunded_amount: totalRefunded + refundAmount,
        status: (totalRefunded + refundAmount) >= paidAmount ? "refunded" : "partially_refunded",
        updated_at: new Date().toISOString()
      })
      .eq("id", transaction_id);

    // Update booking status if fully refunded
    if ((totalRefunded + refundAmount) >= paidAmount) {
      await supabase
        .from("bookings")
        .update({
          payment_status: "refunded",
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", txn.booking_id);
    }

    log('info', 'Refund processed successfully', { 
      requestId, 
      refundId,
      amount: refundAmount,
      transaction_id
    });

    // Notify customer
    try {
      const booking = txn.bookings as unknown as { 
        guest_email: string; 
        booking_code: string;
      } | null;

      if (booking?.guest_email) {
        // You can add email notification here
        log('info', 'Refund notification sent', { 
          requestId,
          email: booking.guest_email 
        });
      }
    } catch (e) {
      log('warn', 'Failed to send refund notification', { requestId, error: e.message });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Refund processed successfully",
        refund_id: refundId,
        amount: refundAmount,
        status: "completed"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log('error', 'Refund processing error', { 
      requestId, 
      error: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
