import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { md5 } from "../_shared/md5.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Logger utility
const log = (level: 'info' | 'error' | 'warn', message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'payment-gateway',
    function: 'duitku-callback',
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
    // Validate callback secret
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const expectedSecret = Deno.env.get("DUITKU_CALLBACK_SECRET");
    
    if (secret !== expectedSecret) {
      log('error', 'Invalid callback secret', { requestId, providedSecret: secret?.slice(0, 5) + '***' });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantCode = Deno.env.get("DUITKU_MERCHANT_CODE")!;
    const apiKey = Deno.env.get("DUITKU_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse callback - Duitku sends form-urlencoded or JSON
    let callbackData: Record<string, string>;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      callbackData = {};
      formData.forEach((value, key) => {
        callbackData[key] = value.toString();
      });
    } else {
      callbackData = await req.json();
    }

    log('info', 'Duitku callback received', { 
      requestId, 
      merchantOrderId: callbackData.merchantOrderId,
      resultCode: callbackData.resultCode
    });

    const { merchantOrderId, amount, resultCode, reference, signature: receivedSignature } = callbackData;

    // Validate signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
    const expectedSignature = await md5(merchantCode + amount + merchantOrderId + apiKey);

    if (receivedSignature !== expectedSignature) {
      log('error', 'Invalid signature', { 
        requestId, 
        received: receivedSignature?.slice(0, 10) + '***', 
        expected: expectedSignature?.slice(0, 10) + '***'
      });
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing transaction
    const { data: txn, error: txnError } = await supabase
      .from("payment_transactions")
      .select("*, bookings(guest_name, guest_email, booking_code)")
      .eq("merchant_order_id", merchantOrderId)
      .single();

    if (txnError || !txn) {
      log('error', 'Transaction not found', { requestId, merchantOrderId, error: txnError?.message });
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // VALIDATE AMOUNT MATCH
    const callbackAmount = Number(amount);
    const expectedAmount = Number(txn.amount);
    
    if (callbackAmount !== expectedAmount) {
      log('error', 'Amount mismatch detected', { 
        requestId, 
        merchantOrderId,
        callbackAmount,
        expectedAmount,
        difference: callbackAmount - expectedAmount
      });
      
      // Log suspicious activity
      await supabase
        .from("payment_security_logs")
        .insert({
          transaction_id: txn.id,
          event_type: "amount_mismatch",
          details: {
            callback_amount: callbackAmount,
            expected_amount: expectedAmount,
            callback_data: callbackData
          }
        });
      
      return new Response(
        JSON.stringify({ error: "Amount mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let status = "pending";
    if (resultCode === "00") status = "paid";
    else if (resultCode === "01") status = "pending";
    else status = "failed";

    // Only process if status changed
    if (txn.status === status) {
      log('info', 'Status unchanged, skipping update', { requestId, merchantOrderId, status });
      return new Response(
        JSON.stringify({ success: true, status, message: "Status unchanged" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status,
        duitku_reference: reference,
        callback_data: callbackData,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("merchant_order_id", merchantOrderId);

    if (updateError) {
      log('error', 'Failed to update transaction', { requestId, merchantOrderId, error: updateError.message });
      throw updateError;
    }

    log('info', 'Transaction updated successfully', { 
      requestId, 
      merchantOrderId, 
      status,
      amount: callbackAmount
    });

    if (status === "paid") {
      // Update booking status
      await supabase
        .from("bookings")
        .update({ 
          payment_status: "paid", 
          payment_amount: callbackAmount,
          status: "confirmed"
        })
        .eq("id", txn.booking_id);

      log('info', 'Booking updated to paid', { requestId, bookingId: txn.booking_id });

      // Notify managers (with retry)
      try {
        const booking = txn.bookings as unknown as { 
          booking_code: string; 
          guest_name: string;
        } | null;

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
              `Total: Rp ${callbackAmount.toLocaleString('id-ID')}\n` +
              `Metode: Duitku Online Payment\n\n` +
              `✅ Pembayaran telah dikonfirmasi otomatis.`;
            
            await supabase.functions.invoke("send-whatsapp", { 
              body: { phone: manager.phone, message } 
            }).catch(err => {
              log('warn', 'Failed to send WhatsApp notification', { 
                requestId, 
                manager: manager.phone,
                error: err.message 
              });
            });
          }
        }
      } catch (e) {
        log('warn', 'Failed to notify managers', { requestId, error: e.message });
        // Don't fail the callback if notification fails
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
