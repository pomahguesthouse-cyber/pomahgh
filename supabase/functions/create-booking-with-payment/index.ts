// Create Booking with Inline Payment via DOKU
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildDokuHeaders } from "../_shared/doku-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      guest_name, guest_email, guest_phone, room_id, room_ids,
      check_in, check_out, total_nights, total_price, num_guests,
      special_requests, booking_source = 'manual', user_id
    } = body;

    if (!guest_name || !guest_email || !check_in || !check_out || !total_price) {
      log('error', 'Missing required fields', { requestId, body });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("DOKU_CLIENT_ID")!;
    const secretKey = Deno.env.get("DOKU_SECRET_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dokuEnv = Deno.env.get("DOKU_ENV") || "production";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    log('info', 'Creating booking with payment', { requestId, guest_email, total_price, user_id: user_id || 'guest' });

    // Get room details
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
    const invoiceNumber = `${bookingCode}-${Date.now()}`;

    const siteUrl = req.headers.get("origin") || "*";
    const callbackUrl = `${supabaseUrl}/functions/v1/doku-callback`;
    const returnUrl = `${siteUrl}/booking/${bookingCode}/status`;

    // Build DOKU Checkout request - BCA VA specific
    const dokuBody = JSON.stringify({
      order: {
        amount: paymentAmount,
        invoice_number: invoiceNumber,
        callback_url: callbackUrl,
        auto_redirect: true,
      },
      payment: {
        payment_due_date: 60, // 60 minutes for inline
        payment_method_types: ["VIRTUAL_ACCOUNT_BCA"],
      },
      customer: {
        id: bookingCode,
        name: guest_name,
        email: guest_email,
        phone: guest_phone || "",
        country: "ID",
      },
    });

    const requestTarget = "/checkout/v1/payment";

    log('info', 'Calling DOKU API', { requestId, invoiceNumber, amount: paymentAmount });

    const { headers: dokuHeaders, baseUrl } = await buildDokuHeaders(
      clientId, secretKey, requestTarget, dokuBody, dokuEnv
    );

    const dokuResponse = await fetch(`${baseUrl}${requestTarget}`, {
      method: "POST",
      headers: dokuHeaders,
      body: dokuBody,
    });

    const dokuData = await dokuResponse.json();

    if (!dokuResponse.ok) {
      log('error', 'DOKU API failed', { requestId, error: dokuData });
      return new Response(
        JSON.stringify({ error: "Failed to create payment", detail: dokuData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentUrl = dokuData.response?.payment?.url || dokuData.payment?.url || null;
    const tokenId = dokuData.response?.payment?.token_id || dokuData.payment?.token_id || null;
    // DOKU Checkout returns VA info in the response for VA-only payments
    const vaNumber = dokuData.virtual_account_info?.virtual_account_number || null;
    const paymentExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_code: bookingCode,
        guest_name,
        guest_email,
        guest_phone: guest_phone || null,
        room_id: room_ids ? room_ids[0] : room_id,
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
        va_number: vaNumber,
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

    // Create payment transaction
    const { error: txnError } = await supabase
      .from("payment_transactions")
      .insert({
        booking_id: booking.id,
        merchant_order_id: invoiceNumber,
        duitku_reference: tokenId,
        payment_method: "VIRTUAL_ACCOUNT_BCA",
        payment_method_name: "BCA Virtual Account",
        amount: paymentAmount,
        status: "pending",
        va_number: vaNumber,
        payment_url: paymentUrl,
        expires_at: paymentExpiresAt,
        is_inline: true,
        bank_code: "BCA"
      });

    if (txnError) {
      log('warn', 'Failed to create payment transaction', { requestId, error: txnError.message });
    }

    // Handle multi-room bookings
    if (room_ids && room_ids.length > 0) {
      const bookingRooms = room_ids.map((rid: string, idx: number) => ({
        booking_id: booking.id,
        room_id: rid,
        price_per_night: Math.round(paymentAmount / total_nights / room_ids.length),
        room_number: (rooms[idx]?.room_numbers as string[] | null)?.[0] || ''
      }));
      await supabase.from("booking_rooms").insert(bookingRooms);
    }

    // Send WhatsApp notification (fire and forget)
    try {
      const vaInfo = vaNumber ? `\n\n🏦 *BCA Virtual Account:*\n${vaNumber}\n\n⏰ Bayar sebelum 1 jam\n\nSalin nomor VA untuk pembayaran via BCA Mobile/myBCA.` : `\n\nSilakan lanjutkan pembayaran melalui link yang diberikan.`;
      const waMessage = `✅ *Booking Berhasil Dibuat!*\n\nKode: *${bookingCode}*\nKamar: ${roomNames}\nCheck-in: ${check_in}\nTotal: Rp ${paymentAmount.toLocaleString('id-ID')}${vaInfo}`;
      await supabase.functions.invoke("send-whatsapp", {
        body: { phone: guest_phone || guest_email, message: waMessage, type: "booking_confirmation" }
      });
    } catch (waError: unknown) {
      log('warn', 'Failed to send WhatsApp', { requestId, error: (waError as Error).message });
    }

    log('info', 'Booking created successfully', { requestId, bookingId: booking.id, bookingCode, vaNumber });

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          booking_code: bookingCode,
          status: "pending_payment",
          va_number: vaNumber,
          payment_url: paymentUrl,
          payment_expires_at: paymentExpiresAt,
          total_price: paymentAmount,
          guest_name,
          guest_email,
          room_name: roomNames
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    log('error', 'Error creating booking', { requestId, error: (error as Error).message, stack: (error as Error).stack });
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
