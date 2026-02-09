import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { md5 } from "../_shared/md5.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id, payment_method } = await req.json();

    if (!booking_id || !payment_method) {
      return new Response(
        JSON.stringify({ error: "booking_id and payment_method are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantCode = Deno.env.get("DUITKU_MERCHANT_CODE")!;
    const apiKey = Deno.env.get("DUITKU_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get booking data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, rooms(name)")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const room = booking.rooms as unknown as { name: string } | null;
    const paymentAmount = Math.round(booking.total_price);
    const merchantOrderId = `${booking.booking_code}-${Date.now()}`;
    const productDetails = `Booking ${room?.name || 'Room'} - ${booking.booking_code}`;
    const email = booking.guest_email || "guest@hotel.com";
    const phoneNumber = booking.guest_phone || "";
    const customerVaName = booking.guest_name;

    // Use the origin for return URL
    const siteUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
    const paymentReturnUrl = `${siteUrl}/payment/${booking_id}/status`;

    // Generate signature: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
    const signature = await md5(merchantCode + merchantOrderId + paymentAmount + apiKey);

    const expiryPeriod = 1440; // 24 hours in minutes

    const duitkuPayload = {
      merchantCode,
      paymentAmount,
      merchantOrderId,
      productDetails,
      email,
      phoneNumber,
      additionalParam: booking_id,
      merchantUserInfo: customerVaName,
      customerVaName,
      callbackUrl: `${supabaseUrl}/functions/v1/duitku-callback`,
      returnUrl: paymentReturnUrl,
      expiryPeriod,
      signature,
      paymentMethod: payment_method,
    };

    console.log("Duitku request:", JSON.stringify({ ...duitkuPayload, signature: "***" }));

    const duitkuResponse = await fetch(
      "https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duitkuPayload),
      }
    );

    const duitkuData = await duitkuResponse.json();
    console.log("Duitku response:", JSON.stringify(duitkuData));

    if (duitkuData.statusCode !== "00") {
      return new Response(
        JSON.stringify({ error: "Failed to create payment", detail: duitkuData.statusMessage || duitkuData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiresAt = new Date(Date.now() + expiryPeriod * 60 * 1000).toISOString();

    const { data: txn, error: txnError } = await supabase
      .from("payment_transactions")
      .insert({
        booking_id,
        merchant_order_id: merchantOrderId,
        duitku_reference: duitkuData.reference,
        payment_method,
        payment_method_name: payment_method,
        amount: paymentAmount,
        status: "pending",
        payment_url: duitkuData.paymentUrl,
        va_number: duitkuData.vaNumber || null,
        qr_string: duitkuData.qrString || null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (txnError) console.error("Failed to save transaction:", txnError);

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: duitkuData.paymentUrl,
        reference: duitkuData.reference,
        va_number: duitkuData.vaNumber || null,
        qr_string: duitkuData.qrString || null,
        amount: paymentAmount,
        transaction_id: txn?.id,
        expires_at: expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating Duitku transaction:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
