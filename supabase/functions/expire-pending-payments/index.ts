import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    const { data: expiredTxns, error: fetchError } = await supabase
      .from("payment_transactions")
      .select("id, booking_id, merchant_order_id, expires_at")
      .eq("status", "pending")
      .lt("expires_at", now);

    if (fetchError) throw fetchError;

    if (!expiredTxns || expiredTxns.length === 0) {
      return new Response(
        JSON.stringify({ success: true, expired_count: 0, message: "No expired payments" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let expiredCount = 0;
    const bookingIds = new Set<string>();

    for (const txn of expiredTxns) {
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({ status: "expired", updated_at: now })
        .eq("id", txn.id);

      if (updateError) {
        console.error(`Failed to expire transaction ${txn.id}:`, updateError);
        continue;
      }

      expiredCount++;
      bookingIds.add(txn.booking_id);
    }

    let bookingsExpired = 0;
    for (const bookingId of bookingIds) {
      const { data: activeTxns } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("booking_id", bookingId)
        .in("status", ["pending", "paid"])
        .limit(1);

      if (!activeTxns || activeTxns.length === 0) {
        const { error: bookingUpdateError } = await supabase
          .from("bookings")
          .update({ payment_status: "expired", updated_at: now })
          .eq("id", bookingId)
          .eq("payment_status", "unpaid");

        if (!bookingUpdateError) {
          bookingsExpired++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, expired_count: expiredCount, bookings_expired: bookingsExpired, checked_at: now }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in expire-pending-payments:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
