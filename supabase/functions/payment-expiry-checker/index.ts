// Cron job to check and expire old pending payments
// Run this every 5 minutes via Supabase cron

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
    function: 'payment-expiry-checker',
    message,
    ...data
  }));
};

serve(async (req) => {
  // Simple auth check - require service role key
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(-10) || "")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    log('info', 'Starting expired payment check');

    // Find expired pending payments
    const { data: expiredPayments, error: fetchError } = await supabase
      .from("payment_transactions")
      .select("id, booking_id, merchant_order_id, amount, created_at")
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    if (fetchError) {
      log('error', 'Failed to fetch expired payments', { error: fetchError.message });
      throw fetchError;
    }

    if (!expiredPayments || expiredPayments.length === 0) {
      log('info', 'No expired payments found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No expired payments found",
          expired_count: 0 
        }),
        { headers: corsHeaders }
      );
    }

    log('info', `Found ${expiredPayments.length} expired payments`, {
      paymentIds: expiredPayments.map(p => p.id)
    });

    // Update expired payments
    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({ 
        status: "expired",
        updated_at: new Date().toISOString()
      })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    if (updateError) {
      log('error', 'Failed to update expired payments', { error: updateError.message });
      throw updateError;
    }

    // Release room inventory for expired bookings
    for (const payment of expiredPayments) {
      try {
        // Update booking status to cancelled
        await supabase
          .from("bookings")
          .update({ 
            status: "cancelled",
            payment_status: "expired",
            updated_at: new Date().toISOString()
          })
          .eq("id", payment.booking_id)
          .eq("payment_status", "pending");

        log('info', 'Released booking inventory', { 
          bookingId: payment.booking_id,
          paymentId: payment.id
        });
      } catch (err) {
        log('error', 'Failed to release booking', { 
          bookingId: payment.booking_id,
          error: err.message
        });
      }
    }

    log('info', 'Expired payment check completed', { 
      expired_count: expiredPayments.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Expired ${expiredPayments.length} payments`,
        expired_count: expiredPayments.length,
        expired_payments: expiredPayments
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    log('error', 'Error in expiry checker', { error: error.message });
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
