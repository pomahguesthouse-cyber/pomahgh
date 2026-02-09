// Create Booking with Inline BCA VA Payment
// File: supabase/functions/create-booking-with-payment/index.ts
// Purpose: Create booking + generate BCA VA simultaneously

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { md5 } from "../_shared/md5.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Logger utility
const log = (level: 'info' | 'error' | 'warn', message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'payment-gateway',
    function: 'create-booking-with-payment',
    message,
    ...data
  }));
};

// Generate booking code: PMH-XXXXXX
const generateBookingCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'PMH-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const body = await req.json();
    const {
      guest_name,
      guest_email,
      guest_phone,
      room_id,
      room_ids,
      check_in,
      check_out,
      total_nights,
      total_price,
      num_guests,
      special_requests,
      booking_source = 'manual',
      user_id
    } = body;

    // Validation
    if (!guest_name || !guest_email || !check_in || !check_out || !total_price) {
      log('error', 'Missing required fields', { requestId, body });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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

    log('info', 'Creating booking with payment', { 
      requestId, 
      guest_email,
      total_price,
      user_id: user_id || 'guest'
    });

    // 1. Get room details
    const { data: rooms, error: roomError } = await supabase
      .from("rooms")
      .select("id, name, room_numbers, allotment")
      .in("id", room_ids || [room_id]);

    if (roomError || !rooms || rooms.length === 0) {
      log('error', 'Room not found', { requestId, room_id, error: roomError?.message });
      return new Response(
        JSON.stringify({ error: "Room not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roomNames = rooms.map(r => r.name).join(', ');
    const bookingCode = generateBookingCode();
    const paymentAmount = Math.round(total_price);
    const merchantOrderId = `${bookingCode}-${Date.now()}`;

    // 2. Check room availability (exclude rooms with pending payment)
    const { data: conflictingBookings } = await supabase
      .from("bookings")
      .select("id, status, room_id")
      .in("room_id", room_ids || [room_id])
      .or(`status.eq.confirmed,status.eq.checked_in,and(status.eq.pending_payment,payment_expires_at.gt.${new Date().toISOString()})`)
      .overlaps("check_in,check_out", [check_in, check_out]);

    if (conflictingBookings && conflictingBookings.length > 0) {
      log('warn', 'Room not available', { 
        requestId, 
        room_id, 
        conflicting: conflictingBookings.length 
      });
      return new Response(
        JSON.stringify({ error: "Room not available for selected dates" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Prepare Duitku payload
    const siteUrl = req.headers.get("origin") || "*";
    const callbackUrl = `${supabaseUrl}/functions/v1/duitku-callback?secret=${callbackSecret}`;
    const returnUrl = `${siteUrl}/booking/${bookingCode}/status`;

    // Generate signature
    const signature = await md5(merchantCode + merchantOrderId + paymentAmount + apiKey);

    const DUITKU_BASE_URL = duitkuEnv === "production"
      ? "https://passport.duitku.com"
      : "https://sandbox.duitku.com";

    const duitkuPayload = {
      merchantCode,
      paymentAmount,
      merchantOrderId,
      productDetails: `Booking ${roomNames} - ${bookingCode}`,
      email: guest_email,
      phoneNumber: guest_phone || "",
      additionalParam: bookingCode,
      merchantUserInfo: guest_name,
      customerVaName: guest_name,
      callbackUrl,
      returnUrl,
      expiryPeriod: 60, // 1 hour in minutes
      signature,
      paymentMethod: "BC", // BCA Virtual Account
    };

    log('info', 'Calling Duitku API', { requestId, merchantOrderId, amount: paymentAmount });

    // 4. Call Duitku API
    const duitkuResponse = await fetch(
      `${DUITKU_BASE_URL}/webapi/api/merchant/v2/inquiry`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duitkuPayload),
      }
    );

    const duitkuData = await duitkuResponse.json();

    if (duitkuData.statusCode !== "00") {
      log('error', 'Duitku API failed', { 
        requestId, 
        statusCode: duitkuData.statusCode,
        message: duitkuData.statusMessage 
      });
      return new Response(
        JSON.stringify({ error: "Failed to create payment", detail: duitkuData.statusMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Calculate expiry (1 hour from now)
    const paymentExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // 6. Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_code: bookingCode,
        guest_name,
        guest_email,
        guest_phone: guest_phone || null,
        room_id: room_ids ? null : room_id,
        check_in,
        check_out,
        total_nights,
        total_price: paymentAmount,
        num_guests: num_guests || 1,
        special_requests: special_requests || null,
        status: "pending_payment",
        payment_status: "pending",
        booking_source,
        user_id: user_id || null,
        guest_email_backup: guest_email,
        va_number: duitkuData.vaNumber,
        payment_expires_at: paymentExpiresAt,
        bank_code: "BCA",
        is_inline_payment: true
      })
      .select()
      .single();

    if (bookingError) {
      log('error', 'Failed to create booking', { requestId, error: bookingError.message });
      throw bookingError;
    }

    // 7. Create payment transaction record
    const { error: txnError } = await supabase
      .from("payment_transactions")
      .insert({
        booking_id: booking.id,
        merchant_order_id: merchantOrderId,
        duitku_reference: duitkuData.reference,
        payment_method: "BC",
        payment_method_name: "BCA Virtual Account",
        amount: paymentAmount,
        status: "pending",
        va_number: duitkuData.vaNumber,
        payment_url: duitkuData.paymentUrl,
        expires_at: paymentExpiresAt,
        is_inline: true,
        bank_code: "BCA",
        metadata: {
          request_id: requestId,
          duitku_env: duitkuEnv,
          booking_code: bookingCode
        }
      });

    if (txnError) {
      log('error', 'Failed to create payment transaction', { requestId, error: txnError.message });
      // Don't throw, booking already created
    }

    // 8. Handle multi-room bookings
    if (room_ids && room_ids.length > 0) {
      const bookingRooms = room_ids.map((rid: string, idx: number) => ({
        booking_id: booking.id,
        room_id: rid,
        price_per_night: Math.round(paymentAmount / total_nights / room_ids.length),
        room_number: rooms[idx]?.room_numbers?.[0] || null
      }));

      await supabase.from("booking_rooms").insert(bookingRooms);
    }

    // 9. Send WhatsApp notification
    try {
      const waMessage = `✅ *Booking Berhasil Dibuat!*\n\n` +
        `Kode: *${bookingCode}*\n` +
        `Kamar: ${roomNames}\n` +
        `Check-in: ${check_in}\n` +
        `Total: Rp ${paymentAmount.toLocaleString('id-ID')}\n\n` +
        `🏦 *BCA Virtual Account:*\n` +
        `${duitkuData.vaNumber}\n\n` +
        `⏰ Bayar sebelum 1 jam\n\n` +
        `Salin nomor VA untuk pembayaran via BCA Mobile/myBCA.`;

      await supabase.functions.invoke("send-whatsapp", {
        body: {
          phone: guest_phone || guest_email, // Fallback
          message: waMessage,
          type: "booking_confirmation"
        }
      });
    } catch (waError) {
      log('warn', 'Failed to send WhatsApp', { requestId, error: waError.message });
    }

    log('info', 'Booking created successfully', { 
      requestId, 
      bookingId: booking.id,
      bookingCode,
      vaNumber: duitkuData.vaNumber
    });

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          booking_code: bookingCode,
          status: "pending_payment",
          va_number: duitkuData.vaNumber,
          payment_expires_at: paymentExpiresAt,
          total_price: paymentAmount,
          guest_name,
          guest_email,
          room_name: roomNames
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log('error', 'Error creating booking', { 
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
