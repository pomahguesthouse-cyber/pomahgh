import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildDokuHeaders } from "../_shared/doku-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (level: 'info' | 'error' | 'warn', message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'payment-gateway',
    function: 'doku-create-transaction',
    message,
    ...data
  }));
};

const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const delay = Math.pow(2, i) * 1000;
      log('warn', `Retry attempt ${i + 1}/${retries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const { booking_id, payment_method } = await req.json();

    if (!booking_id) {
      log('error', 'Missing required parameters', { requestId, booking_id });
      return new Response(
        JSON.stringify({ error: "booking_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("DOKU_CLIENT_ID")!;
    const secretKey = Deno.env.get("DOKU_SECRET_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dokuEnv = Deno.env.get("DOKU_ENV") || "production";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    log('info', 'Creating payment transaction', { requestId, booking_id, payment_method });

    // Get booking data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, rooms(name)")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      log('error', 'Booking not found', { requestId, booking_id, error: bookingError?.message });
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending transaction (IDEMPOTENCY)
    const { data: existingTxn } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("booking_id", booking_id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingTxn) {
      log('info', 'Returning existing pending transaction', { requestId, booking_id, existingTxnId: existingTxn.id });
      return new Response(
        JSON.stringify({
          success: true,
          payment_url: existingTxn.payment_url,
          reference: existingTxn.duitku_reference,
          va_number: existingTxn.va_number,
          qr_string: existingTxn.qr_string,
          amount: existingTxn.amount,
          transaction_id: existingTxn.id,
          expires_at: existingTxn.expires_at,
          is_existing: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const room = booking.rooms as unknown as { name: string } | null;
    const paymentAmount = Math.round(booking.total_price);
    const invoiceNumber = `${booking.booking_code}-${Date.now()}`;
    const email = booking.guest_email || "guest@hotel.com";
    const phoneNumber = booking.guest_phone || "";
    const customerName = booking.guest_name;

    const siteUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
    const paymentReturnUrl = `${siteUrl}/payment/${booking_id}/status`;

    const callbackUrl = `${supabaseUrl}/functions/v1/doku-callback`;

    const expiryMinutes = 1440; // 24 hours

    // Build DOKU Checkout request body
    const dokuBody: Record<string, unknown> = {
      order: {
        amount: paymentAmount,
        invoice_number: invoiceNumber,
        callback_url: callbackUrl,
        auto_redirect: true,
      },
      payment: {
        payment_due_date: expiryMinutes,
      },
      customer: {
        id: booking_id,
        name: customerName,
        email: email,
        phone: phoneNumber,
        country: "ID",
      },
    };

    // Add payment method filter if specified
    if (payment_method) {
      dokuBody.payment = {
        ...(dokuBody.payment as Record<string, unknown>),
        payment_method_types: [payment_method],
      };
    }

    const bodyString = JSON.stringify(dokuBody);
    const requestTarget = "/checkout/v1/payment";

    log('info', 'Calling DOKU Checkout API', { requestId, invoiceNumber, paymentAmount, environment: dokuEnv });

    const dokuData = await retryWithBackoff(async () => {
      const { headers: dokuHeaders, baseUrl } = await buildDokuHeaders(
        clientId, secretKey, requestTarget, bodyString, dokuEnv
      );

      const response = await fetch(`${baseUrl}${requestTarget}`, {
        method: "POST",
        headers: dokuHeaders,
        body: bodyString,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `DOKU API error: ${response.status}`);
      }

      return data;
    });

    log('info', 'DOKU transaction created successfully', { requestId, invoiceNumber });

    const paymentUrl = dokuData.response?.payment?.url || dokuData.payment?.url || null;
    const tokenId = dokuData.response?.payment?.token_id || dokuData.payment?.token_id || null;

    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    const { data: txn, error: txnError } = await supabase
      .from("payment_transactions")
      .insert({
        booking_id,
        merchant_order_id: invoiceNumber,
        duitku_reference: tokenId,
        payment_method: payment_method || "DOKU_CHECKOUT",
        payment_method_name: payment_method || "DOKU Checkout",
        amount: paymentAmount,
        status: "pending",
        payment_url: paymentUrl,
        va_number: null,
        qr_string: null,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (txnError) {
      log('error', 'Failed to save transaction to database', { requestId, error: txnError.message, invoiceNumber });
      throw txnError;
    }

    log('info', 'Transaction saved successfully', { requestId, transactionId: txn.id, booking_id });

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: paymentUrl,
        reference: tokenId,
        va_number: null,
        qr_string: null,
        amount: paymentAmount,
        transaction_id: txn.id,
        expires_at: expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log('error', 'Error creating DOKU transaction', { requestId, error: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
