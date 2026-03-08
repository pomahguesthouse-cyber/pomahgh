import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateDigest, generateSignature } from "../_shared/doku-signature.ts";
import {
  buildInvoiceCandidates,
  extractAmount,
  extractInvoiceNumber,
  extractVaNumber,
  mapCallbackStatus,
  safeJsonParse,
} from "../_shared/doku-callback-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, client-id, request-id, request-timestamp, request-target, signature, digest, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (level: "info" | "error" | "warn", message: string, data?: Record<string, unknown>) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: "payment-gateway",
      function: "doku-callback",
      message,
      ...data,
    }),
  );
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const bodyText = await req.text();

  try {
    const secretKey = (Deno.env.get("DOKU_SECRET_KEY") || "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const callbackData = safeJsonParse<Record<string, any>>(bodyText);
    if (!callbackData) {
      log("error", "Invalid callback JSON", { requestId, bodyText });
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoiceNumber = extractInvoiceNumber(callbackData);
    const transactionStatus = callbackData?.transaction?.status ?? callbackData?.status ?? null;
    const callbackAmount = extractAmount(callbackData);

    log("info", "DOKU callback received", {
      requestId,
      invoiceNumber,
      transactionStatus,
      callbackAmount,
    });

    if (!invoiceNumber) {
      log("error", "Missing invoice_number in callback", { requestId, payload: callbackData });
      return new Response(JSON.stringify({ error: "Missing invoice_number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Signature verification (soft fail for compatibility, but always logged)
    const receivedSignature = req.headers.get("signature") || req.headers.get("Signature");
    const receivedClientId = req.headers.get("client-id") || req.headers.get("Client-Id");
    const receivedRequestId = req.headers.get("request-id") || req.headers.get("Request-Id");
    const receivedTimestamp = req.headers.get("request-timestamp") || req.headers.get("Request-Timestamp");

    if (secretKey && receivedSignature && receivedClientId && receivedRequestId && receivedTimestamp) {
      const notifyTarget = "/checkout/v1/payment";
      const digest = await generateDigest(bodyText);
      const expectedSignature = await generateSignature(
        receivedClientId,
        receivedRequestId,
        receivedTimestamp,
        notifyTarget,
        digest,
        secretKey,
      );

      if (receivedSignature !== expectedSignature) {
        log("warn", "Callback signature mismatch", {
          requestId,
          invoiceNumber,
          receivedSignature: `${receivedSignature.slice(0, 24)}***`,
        });

        await supabase.from("payment_security_logs").insert({
          event_type: "signature_mismatch",
          details: {
            invoice_number: invoiceNumber,
            request_id: receivedRequestId,
            request_timestamp: receivedTimestamp,
          },
        }).throwOnError().catch(() => undefined);
      }
    }

    const invoiceCandidates = buildInvoiceCandidates(invoiceNumber);
    let txn: any = null;

    for (const candidate of invoiceCandidates) {
      const { data } = await supabase
        .from("payment_transactions")
        .select("*, bookings(guest_name, guest_email, booking_code)")
        .eq("merchant_order_id", candidate)
        .maybeSingle();

      if (data) {
        txn = data;
        break;
      }
    }

    if (!txn) {
      log("error", "Transaction not found", { requestId, invoiceNumber, invoiceCandidates });
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedAmount = Number(txn.amount);
    if (callbackAmount !== null && callbackAmount !== expectedAmount) {
      log("error", "Amount mismatch detected", {
        requestId,
        invoiceNumber,
        callbackAmount,
        expectedAmount,
      });

      await supabase.from("payment_security_logs").insert({
        booking_id: txn.booking_id,
        event_type: "amount_mismatch",
        details: {
          callback_amount: callbackAmount,
          expected_amount: expectedAmount,
          callback_data: callbackData,
        },
      });

      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = mapCallbackStatus(callbackData);
    if (txn.status === status) {
      log("info", "Status unchanged, skipping update", { requestId, invoiceNumber, status });
      return new Response(JSON.stringify({ success: true, status, message: "Status unchanged" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vaNumber = extractVaNumber(callbackData);

    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status,
        callback_data: callbackData,
        va_number: vaNumber || txn.va_number,
        paid_at: status === "paid" ? new Date().toISOString() : txn.paid_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", txn.id);

    if (updateError) {
      log("error", "Failed to update transaction", { requestId, invoiceNumber, error: updateError.message });
      throw updateError;
    }

    log("info", "Transaction updated successfully", { requestId, invoiceNumber, status, amount: callbackAmount });

    if (status === "paid") {
      await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          payment_amount: callbackAmount ?? expectedAmount,
          status: "confirmed",
        })
        .eq("id", txn.booking_id);

      log("info", "Booking updated to paid", { requestId, bookingId: txn.booking_id });
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
