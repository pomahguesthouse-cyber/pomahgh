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
    function: 'duitku-create-transaction',
    message,
    ...data
  }));
};

// Retry utility with exponential backoff
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

    if (!booking_id || !payment_method) {
      log('error', 'Missing required parameters', { requestId, booking_id, payment_method });
      return new Response(
        JSON.stringify({ error: "booking_id and payment_method are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantCode = Deno.env.get("DUITKU_MERCHANT_CODE")!;
    const apiKey = Deno.env.get("DUITKU_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const callbackSecret = Deno.env.get("DUITKU_CALLBACK_SECRET")!;
    const duitkuEnv = Deno.env.get("DUITKU_ENV") || "sandbox";

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
      log('info', 'Returning existing pending transaction', { 
        requestId, 
        booking_id, 
        existingTxnId: existingTxn.id,
        expiresAt: existingTxn.expires_at 
      });
      
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

    // Environment-based URL
    const DUITKU_BASE_URL = duitkuEnv === "production"
      ? "https://passport.duitku.com"
      : "https://sandbox.duitku.com";

    // Secure callback URL with secret
    const callbackUrl = `${supabaseUrl}/functions/v1/duitku-callback?secret=${callbackSecret}`;

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
      callbackUrl,
      returnUrl: paymentReturnUrl,
      expiryPeriod,
      signature,
      paymentMethod: payment_method,
    };

    log('info', 'Calling Duitku API', { 
      requestId, 
      merchantOrderId, 
      paymentAmount,
      environment: duitkuEnv,
      url: `${DUITKU_BASE_URL}/webapi/api/merchant/v2/inquiry`
    });

    // Retry logic for Duitku API call
    const duitkuData = await retryWithBackoff(async () => {
      const response = await fetch(
        `${DUITKU_BASE_URL}/webapi/api/merchant/v2/inquiry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(duitkuPayload),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok || data.statusCode !== "00") {
        throw new Error(data.statusMessage || `Duitku API error: ${response.status}`);
      }
      
      return data;
    });

    log('info', 'Duitku transaction created successfully', { 
      requestId, 
      reference: duitkuData.reference,
      merchantOrderId
    });

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
        expires_at: expiresAt
      })
      .select()
      .single();

    if (txnError) {
      log('error', 'Failed to save transaction to database', { 
        requestId, 
        error: txnError.message,
        merchantOrderId
      });
      throw txnError;
    }

    log('info', 'Transaction saved successfully', { 
      requestId, 
      transactionId: txn.id,
      booking_id
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: duitkuData.paymentUrl,
        reference: duitkuData.reference,
        va_number: duitkuData.vaNumber || null,
        qr_string: duitkuData.qrString || null,
        amount: paymentAmount,
        transaction_id: txn.id,
        expires_at: expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log('error', 'Error creating Duitku transaction', { 
      requestId, 
      error: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
