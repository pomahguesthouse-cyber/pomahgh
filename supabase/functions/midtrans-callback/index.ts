import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (level: string, message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, service: "payment-gateway", function: "midtrans-callback", message, ...data }));
};

async function generateSignatureKey(orderId: string, statusCode: string, grossAmount: string, serverKey: string): Promise<string> {
  const raw = orderId + statusCode + grossAmount + serverKey;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-512", encoder.encode(raw));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function mapMidtransStatus(transactionStatus: string, fraudStatus?: string): "paid" | "pending" | "failed" | "expired" {
  if (transactionStatus === "capture") {
    return fraudStatus === "accept" ? "paid" : "pending";
  }
  if (transactionStatus === "settlement") return "paid";
  if (["cancel", "deny"].includes(transactionStatus)) return "failed";
  if (transactionStatus === "expire") return "expired";
  return "pending";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const serverKey = (Deno.env.get("MIDTRANS_SERVER_KEY") || "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const callbackData = await req.json();

    const orderId = callbackData.order_id;
    const transactionStatus = callbackData.transaction_status;
    const fraudStatus = callbackData.fraud_status;
    const statusCode = callbackData.status_code;
    const grossAmount = callbackData.gross_amount;
    const signatureKey = callbackData.signature_key;

    log("info", "Midtrans callback received", { requestId, orderId, transactionStatus, statusCode });

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature
    if (serverKey && signatureKey) {
      const expectedSignature = await generateSignatureKey(orderId, statusCode, grossAmount, serverKey);
      if (signatureKey !== expectedSignature) {
        log("warn", "Signature mismatch", { requestId, orderId });
        await supabase.from("payment_security_logs").insert({
          event_type: "signature_mismatch",
          details: { order_id: orderId, status_code: statusCode },
        });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Find transaction
    const { data: txn } = await supabase
      .from("payment_transactions")
      .select("*, bookings(guest_name, guest_email, booking_code)")
      .eq("merchant_order_id", orderId)
      .maybeSingle();

    if (!txn) {
      log("error", "Transaction not found", { requestId, orderId });
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify amount
    const callbackAmount = Math.round(parseFloat(grossAmount || "0"));
    const expectedAmount = Number(txn.amount);
    if (callbackAmount > 0 && callbackAmount !== expectedAmount) {
      log("error", "Amount mismatch", { requestId, orderId, callbackAmount, expectedAmount });
      await supabase.from("payment_security_logs").insert({
        booking_id: txn.booking_id,
        event_type: "amount_mismatch",
        details: { callback_amount: callbackAmount, expected_amount: expectedAmount, callback_data: callbackData },
      });
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = mapMidtransStatus(transactionStatus, fraudStatus);

    if (txn.status === status) {
      log("info", "Status unchanged", { requestId, orderId, status });
      return new Response(JSON.stringify({ success: true, status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract VA number if present
    const vaNumber = callbackData.va_numbers?.[0]?.va_number ||
      callbackData.permata_va_number || null;

    // Update transaction
    await supabase
      .from("payment_transactions")
      .update({
        status,
        callback_data: callbackData,
        va_number: vaNumber || txn.va_number,
        payment_method: callbackData.payment_type || txn.payment_method,
        payment_method_name: callbackData.payment_type || txn.payment_method_name,
        paid_at: status === "paid" ? new Date().toISOString() : txn.paid_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", txn.id);

    log("info", "Transaction updated", { requestId, orderId, status });

    // Update booking if paid
    if (status === "paid") {
      await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          payment_amount: callbackAmount || expectedAmount,
          status: "confirmed",
        })
        .eq("id", txn.booking_id);

      log("info", "Booking confirmed", { requestId, bookingId: txn.booking_id });
    } else if (status === "expired" || status === "failed") {
      await supabase
        .from("bookings")
        .update({
          payment_status: status,
          status: "cancelled",
          cancellation_reason: status === "expired" ? "Payment expired" : "Payment failed",
        })
        .eq("id", txn.booking_id)
        .eq("status", "pending_payment");
    }

    return new Response(JSON.stringify({ success: true, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const err = error as Error;
    log("error", "Callback error", { requestId, error: err.message, stack: err.stack });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
