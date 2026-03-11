// Create Booking with Inline Payment via Midtrans
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: string, message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, service: "payment-gateway", function: "create-booking-with-payment", message, ...data }));
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
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const isSandbox = serverKey.startsWith("SB-");
    const snapUrl = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
      : "https://app.midtrans.com/snap/v1/transactions";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get room details
    const { data: rooms, error: roomError } = await supabase
      .from("rooms")
      .select("id, name, room_numbers, allotment")
      .in("id", room_ids || [room_id]);

    if (roomError || !rooms || rooms.length === 0) {
      return new Response(JSON.stringify({ error: "Room not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roomNames = rooms.map(r => r.name).join(', ');
    const bookingCode = generateBookingCode();
    const paymentAmount = Math.round(total_price);
    const orderId = `${bookingCode}-${Date.now()}`;
    const paymentExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const siteUrl = req.headers.get("origin") || "*";

    // Midtrans Snap request
    const snapBody = {
      transaction_details: {
        order_id: orderId,
        gross_amount: paymentAmount,
      },
      customer_details: {
        first_name: guest_name,
        email: guest_email,
        phone: guest_phone || undefined,
      },
      item_details: [{
        id: room_ids ? room_ids[0] : room_id,
        price: paymentAmount,
        quantity: 1,
        name: `${roomNames} - ${total_nights} malam`,
      }],
      callbacks: {
        finish: `${siteUrl}/booking/${bookingCode}/status`,
      },
      expiry: {
        unit: "minutes",
        duration: 60,
      },
    };

    const authString = btoa(serverKey + ":");

    const snapResponse = await fetch(snapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify(snapBody),
    });

    const snapData = await snapResponse.json();

    if (!snapResponse.ok) {
      log("error", "Midtrans API failed", { requestId, error: snapData });
      return new Response(JSON.stringify({ error: "Failed to create payment", detail: snapData }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentUrl = snapData.redirect_url;
    const snapToken = snapData.token;

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
        payment_expires_at: paymentExpiresAt,
        is_inline_payment: true,
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Create payment transaction
    await supabase.from("payment_transactions").insert({
      booking_id: booking.id,
      merchant_order_id: orderId,
      duitku_reference: snapToken,
      payment_method: "MIDTRANS_SNAP",
      payment_method_name: "Midtrans",
      amount: paymentAmount,
      status: "pending",
      payment_url: paymentUrl,
      expires_at: paymentExpiresAt,
      is_inline: true,
    });

    // Handle multi-room bookings
    if (room_ids && room_ids.length > 0) {
      const bookingRooms = room_ids.map((rid: string, idx: number) => ({
        booking_id: booking.id,
        room_id: rid,
        price_per_night: Math.round(paymentAmount / total_nights / room_ids.length),
        room_number: (rooms[idx]?.room_numbers as string[] | null)?.[0] || '',
      }));
      await supabase.from("booking_rooms").insert(bookingRooms);
    }

    // Send WhatsApp (fire and forget)
    try {
      const waMessage = `✅ *Booking Berhasil Dibuat!*\n\nKode: *${bookingCode}*\nKamar: ${roomNames}\nCheck-in: ${check_in}\nTotal: Rp ${paymentAmount.toLocaleString('id-ID')}\n\nSilakan lanjutkan pembayaran melalui link yang diberikan.\n⏰ Bayar sebelum 1 jam`;
      await supabase.functions.invoke("send-whatsapp", {
        body: { phone: guest_phone || guest_email, message: waMessage, type: "booking_confirmation" },
      });
    } catch (waError: unknown) {
      log("warn", "Failed to send WhatsApp", { requestId, error: (waError as Error).message });
    }

    log("info", "Booking created successfully", { requestId, bookingId: booking.id, bookingCode });

    return new Response(JSON.stringify({
      success: true,
      booking: {
        id: booking.id,
        booking_code: bookingCode,
        status: "pending_payment",
        payment_url: paymentUrl,
        payment_expires_at: paymentExpiresAt,
        total_price: paymentAmount,
        guest_name,
        guest_email,
        room_name: roomNames,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    log("error", "Error creating booking", { requestId, error: (error as Error).message });
    return new Response(JSON.stringify({ error: "Internal server error", detail: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
