import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (level: string, message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, service: "payment-gateway", function: "midtrans-create-transaction", message, ...data }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!serverKey) {
      throw new Error("Midtrans credentials are not configured");
    }

    // Detect sandbox vs production
    const isSandbox = serverKey.startsWith("SB-");
    const baseUrl = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
      : "https://app.midtrans.com/snap/v1/transactions";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    log("info", "Creating Midtrans transaction", { requestId, booking_id });

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, rooms(name)")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing pending transaction (idempotency)
    const { data: existingTxn } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("booking_id", booking_id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingTxn?.payment_url) {
      log("info", "Returning existing pending transaction", { requestId, booking_id });
      return new Response(JSON.stringify({
        success: true,
        payment_url: existingTxn.payment_url,
        token: existingTxn.duitku_reference,
        amount: existingTxn.amount,
        transaction_id: existingTxn.id,
        expires_at: existingTxn.expires_at,
        is_existing: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const paymentAmount = Math.round(booking.total_price);
    const orderId = `INV-${booking.booking_code}-${Date.now()}`;
    const roomName = (booking.rooms as any)?.name || "Room";

    const siteUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";

    // Midtrans Snap API request
    const snapBody = {
      transaction_details: {
        order_id: orderId,
        gross_amount: paymentAmount,
      },
      customer_details: {
        first_name: booking.guest_name,
        email: booking.guest_email || "guest@hotel.com",
        phone: (booking.guest_phone || "").replace(/[^0-9]/g, "") || undefined,
      },
      item_details: [
        {
          id: booking.room_id,
          price: paymentAmount,
          quantity: 1,
          name: `${roomName} - ${booking.total_nights} malam`,
        },
      ],
      callbacks: {
        finish: `${siteUrl}/payment/${booking_id}/status`,
        error: `${siteUrl}/payment/${booking_id}/status`,
        pending: `${siteUrl}/payment/${booking_id}/status`,
      },
      expiry: {
        unit: "hours",
        duration: 24,
      },
    };

    log("info", "Calling Midtrans Snap API", { requestId, orderId, paymentAmount });

    const authString = btoa(serverKey + ":");

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify(snapBody),
    });

    const responseText = await response.text();
    log("info", "Midtrans API response", { requestId, status: response.status, body: responseText });

    let snapData;
    try {
      snapData = JSON.parse(responseText);
    } catch {
      throw new Error(`Midtrans returned non-JSON: ${responseText}`);
    }

    if (!response.ok) {
      const errMsg = snapData?.error_messages?.join(", ") || snapData?.message || JSON.stringify(snapData);
      throw new Error(`Midtrans API error ${response.status}: ${errMsg}`);
    }

    const paymentUrl = snapData.redirect_url;
    const snapToken = snapData.token;

    if (!paymentUrl) {
      throw new Error("Midtrans did not return a redirect URL");
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Save transaction
    const { data: txn, error: txnError } = await supabase
      .from("payment_transactions")
      .insert({
        booking_id,
        merchant_order_id: orderId,
        duitku_reference: snapToken,
        payment_method: "MIDTRANS_SNAP",
        payment_method_name: "Midtrans",
        amount: paymentAmount,
        status: "pending",
        payment_url: paymentUrl,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (txnError) {
      log("error", "Failed to save transaction", { requestId, error: txnError.message });
      throw txnError;
    }

    // Update booking status
    await supabase
      .from("bookings")
      .update({
        status: "pending_payment",
        payment_status: "pending",
        payment_expires_at: expiresAt,
      })
      .eq("id", booking_id);

    log("info", "Transaction created successfully", { requestId, txnId: txn.id, orderId });

    return new Response(JSON.stringify({
      success: true,
      payment_url: paymentUrl,
      token: snapToken,
      amount: paymentAmount,
      transaction_id: txn.id,
      expires_at: expiresAt,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const err = error as Error;
    log("error", "Error creating transaction", { requestId, error: err.message, stack: err.stack });
    return new Response(JSON.stringify({ error: "Internal server error", detail: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
