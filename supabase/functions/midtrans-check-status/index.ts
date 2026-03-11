import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (level: string, message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, service: "payment-gateway", function: "midtrans-check-status", message, ...data }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const { merchant_order_id } = await req.json();

    if (!merchant_order_id) {
      return new Response(JSON.stringify({ error: "merchant_order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get transaction from DB
    const { data: txn, error: txnError } = await supabase
      .from("payment_transactions")
      .select("booking_id, status, amount")
      .eq("merchant_order_id", merchant_order_id)
      .single();

    if (txnError) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already final
    if (["paid", "refunded", "failed"].includes(txn.status)) {
      return new Response(JSON.stringify({ success: true, status: txn.status, amount: txn.amount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check with Midtrans API
    const isSandbox = serverKey.startsWith("SB-");
    const apiBase = isSandbox
      ? "https://api.sandbox.midtrans.com/v2"
      : "https://api.midtrans.com/v2";

    const authString = btoa(serverKey + ":");

    const response = await fetch(`${apiBase}/${merchant_order_id}/status`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Basic ${authString}`,
      },
    });

    const midtransData = await response.json();

    log("info", "Midtrans status response", { requestId, transactionStatus: midtransData.transaction_status });

    let status = "pending";
    const ts = midtransData.transaction_status;
    if (ts === "settlement" || (ts === "capture" && midtransData.fraud_status === "accept")) status = "paid";
    else if (ts === "expire") status = "expired";
    else if (["cancel", "deny"].includes(ts)) status = "failed";

    // Update transaction
    await supabase
      .from("payment_transactions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("merchant_order_id", merchant_order_id);

    if (status === "paid" && txn) {
      await supabase
        .from("bookings")
        .update({ payment_status: "paid", payment_amount: Number(midtransData.gross_amount || txn.amount), status: "confirmed" })
        .eq("id", txn.booking_id);
    }

    return new Response(JSON.stringify({ success: true, status, amount: midtransData.gross_amount || txn.amount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const err = error as Error;
    log("error", "Check status error", { requestId, error: err.message });
    return new Response(JSON.stringify({ error: "Internal server error", detail: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
