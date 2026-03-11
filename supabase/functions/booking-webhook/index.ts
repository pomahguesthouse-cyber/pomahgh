import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-booking-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const log = (level: 'info' | 'error' | 'warn', message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'booking-webhook',
    message,
    ...data
  }));
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    // Validate webhook secret
    const authHeader = req.headers.get('x-booking-secret') || req.headers.get('authorization');
    const expectedSecret = Deno.env.get('BOOKING_WEBHOOK_SECRET');
    
    if (expectedSecret && authHeader !== expectedSecret) {
      log('error', 'Invalid webhook secret', { requestId, providedSecret: authHeader?.slice(0, 10) + '***' });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request - Booking.com can send XML or JSON
    const contentType = req.headers.get('content-type') || '';
    let rawBody = await req.text();
    
    log('info', 'Received Booking.com webhook', { 
      requestId, 
      contentType,
      bodyLength: rawBody.length
    });

    let reservationData;
    
    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      // Parse XML
      reservationData = parseBookingXml(rawBody);
    } else {
      // Assume JSON
      try {
        reservationData = await req.json();
      } catch {
        reservationData = JSON.parse(rawBody);
      }
    }

    if (!reservationData) {
      log('error', 'Failed to parse reservation data', { requestId, rawBody: rawBody.slice(0, 200) });
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process the reservation
    const result = await processReservation(supabase, reservationData, requestId);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log('error', 'Webhook error', { requestId, error: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface ReservationData {
  bookingId?: string;
  confirmationNumber?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn?: string;
  checkOut?: string;
  roomTypeId?: string;
  roomTypeName?: string;
  totalPrice?: number;
  currency?: string;
  status?: string;
  guests?: number;
  specialRequests?: string;
}

function parseBookingXml(xml: string): ReservationData | null {
  try {
    // Simple XML parsing for Booking.com reservation format
    const getValue = (tag: string): string => {
      const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([^\\]]*)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
      const match = xml.match(regex);
      return match ? (match[1] || match[2] || '').trim() : '';
    };

    const getAttr = (tag: string, attr: string): string => {
      const regex = new RegExp(`<${tag}[^>]*${attr}=['"]([^'"]*)['"]`, 'i');
      const match = xml.match(regex);
      return match ? match[1] : '';
    };

    // Check if this is a reservation notification
    if (!xml.includes('Reservation') && !xml.includes('reservations')) {
      log('info', 'Not a reservation notification', { xmlPreview: xml.slice(0, 200) });
      return null;
    }

    const reservation: ReservationData = {
      bookingId: getValue('reservation_id') || getAttr('reservation', 'id'),
      confirmationNumber: getValue('confirmation_number'),
      guestName: getValue('guest_name') || getValue('firstname') + ' ' + getValue('lastname'),
      guestEmail: getValue('email') || getValue('guest_email'),
      guestPhone: getValue('phone') || getValue('telephone'),
      checkIn: getValue('checkin') || getValue('check_in_date'),
      checkOut: getValue('checkout') || getValue('check_out_date'),
      roomTypeId: getValue('roomtype_id') || getValue('room_type_id'),
      roomTypeName: getValue('roomtype_name') || getValue('room_type'),
      totalPrice: parseFloat(getValue('total_price') || getValue('price') || '0'),
      currency: getValue('currency') || 'IDR',
      status: getValue('status') || 'confirmed',
      guests: parseInt(getValue('guests') || getValue('number_of_guests') || '1'),
      specialRequests: getValue('remark') || getValue('special_requests')
    };

    // Parse dates - Booking.com format: YYYY-MM-DD
    if (reservation.checkIn) {
      const checkInDate = new Date(reservation.checkIn);
      if (!isNaN(checkInDate.getTime())) {
        reservation.checkIn = checkInDate.toISOString().split('T')[0];
      }
    }
    if (reservation.checkOut) {
      const checkOutDate = new Date(reservation.checkOut);
      if (!isNaN(checkOutDate.getTime())) {
        reservation.checkOut = checkOutDate.toISOString().split('T')[0];
      }
    }

    return reservation;
  } catch (error) {
    log('error', 'XML parsing error', { error: error.message });
    return null;
  }
}

async function processReservation(
  supabase: ReturnType<typeof createClient>, 
  data: ReservationData,
  requestId: string
) {
  const { bookingId, confirmationNumber, guestName, guestEmail, guestPhone, checkIn, checkOut, roomTypeName, totalPrice, status, guests, specialRequests } = data;

  log('info', 'Processing reservation', { 
    requestId, 
    bookingId, 
    confirmationNumber, 
    guestName,
    checkIn, 
    checkOut 
  });

  // Find the room by name/type
  let roomId: string | null = null;
  
  if (roomTypeName) {
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name, slug')
      .ilike('name', `%${roomTypeName}%`)
      .limit(1)
      .single();
    
    if (rooms) {
      roomId = rooms.id;
      log('info', 'Found room', { requestId, roomId, roomName: rooms.name });
    }
  }

  // If no room found, use first available room
  if (!roomId) {
    const { data: firstRoom } = await supabase
      .from('rooms')
      .select('id')
      .limit(1)
      .single();
    
    if (firstRoom) {
      roomId = firstRoom.id;
      log('warn', 'Using default room', { requestId, roomId });
    }
  }

  if (!roomId) {
    log('error', 'No room available', { requestId });
    return { error: 'No room available', processed: false };
  }

  // Calculate nights
  const checkInDate = new Date(checkIn!);
  const checkOutDate = new Date(checkOut!);
  const totalNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  // Generate booking code
  const bookingCode = `BKG${Date.now().toString(36).toUpperCase()}`;

  // Determine booking status
  let bookingStatus = 'pending_payment';
  let paymentStatus = 'unpaid';
  
  if (status === 'confirmed' || status === 'booked') {
    bookingStatus = 'confirmed';
    paymentStatus = 'paid'; // Booking.com usually handles payment
  }

  // Create the booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      booking_code: bookingCode,
      room_id: roomId,
      guest_name: guestName || 'Guest',
      guest_email: guestEmail || '',
      guest_phone: guestPhone || '',
      check_in: checkIn,
      check_out: checkOut,
      total_nights: totalNights,
      total_price: totalPrice || 0,
      num_guests: guests || 1,
      status: bookingStatus,
      payment_status: paymentStatus,
      booking_source: 'booking.com',
      ota_booking_id: bookingId || confirmationNumber,
      special_requests: specialRequests || null,
      ota_name: 'booking.com'
    })
    .select()
    .single();

  if (bookingError) {
    log('error', 'Failed to create booking', { 
      requestId, 
      error: bookingError.message,
      bookingId 
    });
    return { error: bookingError.message, processed: false };
  }

  log('info', 'Booking created successfully', { 
    requestId, 
    bookingId: booking.id,
    bookingCode,
    guestName 
  });

  // Send WhatsApp notification to managers
  try {
    const { data: settings } = await supabase
      .from('hotel_settings')
      .select('whatsapp_manager_numbers, hotel_name')
      .single();

    const managerNumbers = (settings?.whatsapp_manager_numbers as Array<{ phone: string; name: string }>) || [];

    for (const manager of managerNumbers) {
      const message = `🎉 *Booking Baru dari Booking.com!*\n\n` +
        `Kode: *${bookingCode}*\n` +
        `Tamu: ${guestName}\n` +
        `Check-in: ${checkIn}\n` +
        `Check-out: ${checkOut}\n` +
        `Malam: ${totalNights}\n` +
        `Total: Rp ${(totalPrice || 0).toLocaleString('id-ID')}\n` +
        `Tamu: ${guests || 1} orang\n\n` +
        `${specialRequests ? `Catatan: ${specialRequests}\n` : ''}` +
        `📱 Via Booking.com`;

      await supabase.functions.invoke('send-whatsapp', { 
        body: { phone: manager.phone, message } 
      }).catch(err => {
        log('warn', 'Failed to send WhatsApp notification', { 
          requestId, 
          error: err.message 
        });
      });
    }
  } catch (e) {
    log('warn', 'Notification error', { requestId, error: e.message });
  }

  return { 
    processed: true, 
    bookingId: booking.id,
    bookingCode 
  };
}
