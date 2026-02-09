// Check Inline Payment Status
// File: supabase/functions/check-inline-payment-status/index.ts
// Purpose: Poll payment status for inline BCA VA

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { md5 } from "../_shared/md5.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: 'info' | 'error', message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'payment-gateway',
    function: 'check-inline-payment-status',
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
    const { booking_id, booking_code } = await req.json();

    if (!booking_id && !booking_code) {
      return new Response(
        JSON.stringify({ error: "booking_id or booking_code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantCode = Deno.env.get("DUITKU_MERCHANT_CODE")!;
    const apiKey = Deno.env.get("DUITKU_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const duitkuEnv = Deno.env.get("DUITKU_ENV") || "sandbox";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get booking details
    let query = supabase
      .from("bookings")
      .select("*, rooms(name)")
      .eq("payment_status", "pending");

    if (booking_id) {
      query = query.eq("id", booking_id);
    } else {
      query = query.eq("booking_code", booking_code);
    }

    const { data: booking, error: bookingError } = await query.single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check if already expired
    if (new Date(booking.payment_expires_at) < new Date()) {
      log('info', 'Payment expired', { requestId, bookingId: booking.id });
      
      // Auto-cancel
      await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          payment_status: "expired",
          cancellation_reason: "Payment timeout - 1 hour expired",
          updated_at: new Date().toISOString()
        })
        .eq("id", booking.id);

      return new Response(
        JSON.stringify({
          status: "expired",
          booking_id: booking.id,
          booking_code: booking.booking_code,
          message: "Payment expired. Booking cancelled."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get payment transaction
    const { data: txn } = await supabase
      .from("payment_transactions")
      .select("merchant_order_id")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!txn) {
      return new Response(
        JSON.stringify({ error: "Payment transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Check with Duitku API
    const signature = await md5(merchantCode + txn.merchant_order_id + apiKey);
    
    const DUITKU_BASE_URL = duitkuEnv === "production"
      ? "https://passport.duitku.com"
      : "https://sandbox.duitku.com";

    const duitkuResponse = await fetch(
      `${DUITKU_BASE_URL}/webapi/api/merchant/transactionStatus`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantCode,
          merchantOrderId: txn.merchant_order_id,
          signature
        })
      }
    );

    const duitkuData = await duitkuResponse.json();

    // 5. Map status
    let status = "pending";
    if (duitkuData.statusCode === "00") status = "paid";
    else if (duitkuData.statusCode === "02") status = "expired";

    // 6. Update if status changed
    if (status === "paid" && booking.payment_status !== "paid") {
      await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed",
          updated_at: new Date().toISOString()
        })
        .eq("id", booking.id);

      // Update transaction
      await supabase
        .from("payment_transactions")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_amount: duitkuData.amount
        })
        .eq("booking_id", booking.id);

      // Send success notification
      try {
        await supabase.functions.invoke("send-whatsapp", {
          body: {
            phone: booking.guest_phone || booking.guest_email,
            message: `💰 Pembayaran Berhasil!\n\nBooking ${booking.booking_code} telah lunas.`,
            type: "payment_success"
          }
        });
      } catch (e) {
        log('warn', 'Failed to send success notification', { requestId, error: e.message });
      }

      log('info', 'Payment confirmed', { requestId, bookingId: booking.id });
    }

    // 7. Calculate remaining time
    const expiresAt = new Date(booking.payment_expires_at);
    const now = new Date();
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000));
    const remainingSeconds = Math.max(0, Math.floor((remainingMs % 60000) / 1000));

    return new Response(
      JSON.stringify({
        status,
        booking_id: booking.id,
        booking_code: booking.booking_code,
        va_number: booking.va_number,
        amount: booking.total_price,
        remaining_minutes: remainingMinutes,
        remaining_seconds: remainingSeconds,
        expires_at: booking.payment_expires_at,
        is_expired: remainingMs <= 0,
        paid_at: status === "paid" ? new Date().toISOString() : null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log('error', 'Error checking status', { requestId, error: error.message });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
