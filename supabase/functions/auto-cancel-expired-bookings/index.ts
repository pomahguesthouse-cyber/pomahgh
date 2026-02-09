// Auto Cancel Expired Bookings
// File: supabase/functions/auto-cancel-expired-bookings/index.ts
// Purpose: Cron job to auto-cancel expired pending bookings

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};

const log = (level: 'info' | 'error', message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'payment-gateway',
    function: 'auto-cancel-expired-bookings',
    message,
    ...data
  }));
};

serve(async (req) => {
  // Simple auth check
  const authHeader = req.headers.get("authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  
  if (!authHeader?.includes(serviceKey.slice(-10))) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }), 
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    log('info', 'Starting auto-cancel check');

    // Find expired bookings
    const { data: expiredBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("id, booking_code, guest_email, guest_phone, room_id, total_price, payment_expires_at")
      .eq("status", "pending_payment")
      .eq("payment_status", "pending")
      .lt("payment_expires_at", new Date().toISOString());

    if (fetchError) {
      log('error', 'Failed to fetch expired bookings', { error: fetchError.message });
      throw fetchError;
    }

    if (!expiredBookings || expiredBookings.length === 0) {
      log('info', 'No expired bookings found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No expired bookings found",
          cancelled_count: 0 
        }),
        { headers: corsHeaders }
      );
    }

    log('info', `Found ${expiredBookings.length} expired bookings`, {
      bookingIds: expiredBookings.map(b => b.id)
    });

    let cancelledCount = 0;

    // Process each expired booking
    for (const booking of expiredBookings) {
      try {
        // Update booking status
        const { error: updateError } = await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            payment_status: "expired",
            cancellation_reason: "Payment timeout - 1 hour expired",
            updated_at: new Date().toISOString()
          })
          .eq("id", booking.id);

        if (updateError) {
          log('error', `Failed to cancel booking ${booking.id}`, { error: updateError.message });
          continue;
        }

        // Update payment transaction
        await supabase
          .from("payment_transactions")
          .update({
            status: "expired",
            updated_at: new Date().toISOString()
          })
          .eq("booking_id", booking.id)
          .eq("status", "pending");

        // Send cancellation notification
        try {
          const message = `❌ *Booking Dibatalkan*\n\n` +
            `Kode: ${booking.booking_code}\n` +
            `Status: Pembayaran kadaluarsa\n\n` +
            `Silakan buat booking baru jika masih ingin menginap.`;

          await supabase.functions.invoke("send-whatsapp", {
            body: {
              phone: booking.guest_phone || booking.guest_email,
              message,
              type: "booking_cancelled"
            }
          });
        } catch (waError) {
          log('warn', `Failed to send WA for ${booking.id}`, { error: waError.message });
        }

        cancelledCount++;
        log('info', `Cancelled booking ${booking.booking_code}`);

      } catch (err) {
        log('error', `Error processing booking ${booking.id}`, { error: err.message });
      }
    }

    // Log to security logs
    await supabase
      .from("payment_security_logs")
      .insert({
        event_type: "auto_cancel_batch",
        details: {
          total_expired: expiredBookings.length,
          successfully_cancelled: cancelledCount,
          timestamp: new Date().toISOString()
        }
      });

    log('info', 'Auto-cancel completed', { cancelled: cancelledCount });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cancelled ${cancelledCount} expired bookings`,
        cancelled_count: cancelledCount,
        total_expired: expiredBookings.length
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    log('error', 'Auto-cancel error', { error: error.message });
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
