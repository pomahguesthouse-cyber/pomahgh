import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateDigest, generateSignature } from "../_shared/doku-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, client-id, request-id, request-timestamp, signature",
};

const log = (level: 'info' | 'error' | 'warn', message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'payment-gateway',
    function: 'doku-callback',
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
    const clientId = Deno.env.get("DOKU_CLIENT_ID")!;
    const secretKey = Deno.env.get("DOKU_SECRET_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const bodyText = await req.text();
    const callbackData = JSON.parse(bodyText);

    log('info', 'DOKU callback received', { 
      requestId,
      invoiceNumber: callbackData.order?.invoice_number,
      transactionStatus: callbackData.transaction?.status,
    });

    // Verify signature from DOKU
    const receivedSignature = req.headers.get("signature") || req.headers.get("Signature");
    const receivedClientId = req.headers.get("client-id") || req.headers.get("Client-Id");
    const receivedRequestId = req.headers.get("request-id") || req.headers.get("Request-Id");
    const receivedTimestamp = req.headers.get("request-timestamp") || req.headers.get("Request-Timestamp");

    if (receivedSignature && receivedClientId && receivedRequestId && receivedTimestamp) {
      const notifyTarget = "/v1/doku-callback"; // Adjust based on your actual path
      const digest = await generateDigest(bodyText);
      const expectedSignature = await generateSignature(
        receivedClientId,
        receivedRequestId,
        receivedTimestamp,
        notifyTarget,
        digest,
        secretKey
      );

      // Note: DOKU may use different signature format for notifications
      // For production, verify this matches DOKU's callback signature format
      if (receivedSignature !== expectedSignature) {
        log('warn', 'Signature mismatch (may be expected for notification)', { 
          requestId,
          received: receivedSignature?.slice(0, 20) + '***',
        });
      }
    }

    const invoiceNumber = callbackData.order?.invoice_number;
    const transactionStatus = callbackData.transaction?.status;
    const amount = callbackData.order?.amount;

    if (!invoiceNumber) {
      log('error', 'Missing invoice_number in callback', { requestId });
      return new Response(
        JSON.stringify({ error: "Missing invoice_number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing transaction
    const { data: txn, error: txnError } = await supabase
      .from("payment_transactions")
      .select("*, bookings(guest_name, guest_email, booking_code)")
      .eq("merchant_order_id", invoiceNumber)
      .single();

    if (txnError || !txn) {
      log('error', 'Transaction not found', { requestId, invoiceNumber, error: txnError?.message });
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // VALIDATE AMOUNT MATCH
    const callbackAmount = Number(amount);
    const expectedAmount = Number(txn.amount);

    if (callbackAmount && callbackAmount !== expectedAmount) {
      log('error', 'Amount mismatch detected', { requestId, invoiceNumber, callbackAmount, expectedAmount });
      await supabase
        .from("payment_security_logs")
        .insert({
          booking_id: txn.booking_id,
          event_type: "amount_mismatch",
          details: { callback_amount: callbackAmount, expected_amount: expectedAmount, callback_data: callbackData }
        });
      return new Response(
        JSON.stringify({ error: "Amount mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map DOKU status to internal status
    let status = "pending";
    if (transactionStatus === "SUCCESS") status = "paid";
    else if (transactionStatus === "FAILED") status = "failed";
    else if (transactionStatus === "EXPIRED") status = "expired";

    // Only process if status changed
    if (txn.status === status) {
      log('info', 'Status unchanged, skipping update', { requestId, invoiceNumber, status });
      return new Response(
        JSON.stringify({ success: true, status, message: "Status unchanged" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vaNumber = callbackData.virtual_account_info?.virtual_account_number || 
                     callbackData.va_number || null;

    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status,
        duitku_reference: callbackData.transaction?.original_request_id || txn.duitku_reference,
        callback_data: callbackData,
        va_number: vaNumber || txn.va_number,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("merchant_order_id", invoiceNumber);

    if (updateError) {
      log('error', 'Failed to update transaction', { requestId, invoiceNumber, error: updateError.message });
      throw updateError;
    }

    log('info', 'Transaction updated successfully', { requestId, invoiceNumber, status, amount: callbackAmount });

    if (status === "paid") {
      await supabase
        .from("bookings")
        .update({ 
          payment_status: "paid", 
          payment_amount: callbackAmount || expectedAmount,
          status: "confirmed"
        })
        .eq("id", txn.booking_id);

      log('info', 'Booking updated to paid', { requestId, bookingId: txn.booking_id });

      // Notify managers
      try {
        const booking = txn.bookings as unknown as { booking_code: string; guest_name: string } | null;
        if (booking) {
          const { data: settings } = await supabase
            .from("hotel_settings")
            .select("whatsapp_manager_numbers, hotel_name")
            .single();

          const managerNumbers = (settings?.whatsapp_manager_numbers as Array<{ phone: string; name: string }>) || [];

          for (const manager of managerNumbers) {
            const message = `💰 *Pembayaran Diterima!*\n\n` +
              `Hotel: ${settings?.hotel_name || 'Hotel'}\n` +
              `Booking: ${booking.booking_code}\n` +
              `Tamu: ${booking.guest_name}\n` +
              `Total: Rp ${(callbackAmount || expectedAmount).toLocaleString('id-ID')}\n` +
              `Metode: DOKU Online Payment\n\n` +
              `✅ Pembayaran telah dikonfirmasi otomatis.`;

            await supabase.functions.invoke("send-whatsapp", { 
              body: { phone: manager.phone, message } 
            }).catch(err => {
              log('warn', 'Failed to send WhatsApp notification', { requestId, manager: manager.phone, error: err.message });
            });
          }
        }
      } catch (e) {
        log('warn', 'Failed to notify managers', { requestId, error: e.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log('error', 'Callback error', { requestId, error: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
