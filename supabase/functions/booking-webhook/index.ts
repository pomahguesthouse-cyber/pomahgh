import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-booking-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    const expectedSecret = Deno.env.get('BOOKING_WEBHOOK_SECRET');
    
    if (expectedSecret && secret !== expectedSecret) {
      log('error', 'Invalid webhook secret', { requestId, providedSecret: secret?.slice(0, 10) + '***' });
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
    
    // Try multiple parsing methods
    if (contentType.includes('application/xml') || contentType.includes('text/xml') || rawBody.trim().startsWith('<')) {
      reservationData = parseBookingXml(rawBody);
    } else {
      // Try JSON first
      try {
        reservationData = await req.json();
      } catch {
        // Try parsing as form data
        const params = new URLSearchParams(rawBody);
        if (params.has('reservation_id') || params.has('confirmation_number')) {
          reservationData = Object.fromEntries(params);
        } else {
          reservationData = JSON.parse(rawBody);
        }
      }
    }

    if (!reservationData) {
      log('error', 'Failed to parse reservation data', { requestId, rawBody: rawBody.slice(0, 500) });
      return new Response(
        JSON.stringify({ error: 'Invalid payload', received: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine notification type
    const notificationType = determineNotificationType(reservationData, rawBody);
    
    log('info', 'Processing notification', { requestId, type: notificationType });

    // Process based on type
    let result;
    switch (notificationType) {
      case 'reservation':
        result = await processReservation(supabase, reservationData, requestId);
        break;
      case 'modification':
        result = await processModification(supabase, reservationData, requestId);
        break;
      case 'cancellation':
        result = await processCancellation(supabase, reservationData, requestId);
        break;
      default:
        result = { processed: false, reason: 'Unknown notification type' };
    }

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

type NotificationType = 'reservation' | 'modification' | 'cancellation' | 'unknown';

function determineNotificationType(data: Record<string, unknown>, rawBody: string): NotificationType {
  const jsonStr = JSON.stringify(data).toLowerCase();
  const xmlLower = rawBody.toLowerCase();
  
  if (xmlLower.includes('cancel') || jsonStr.includes('"status":"cancel"') || jsonStr.includes('"cancelled"')) {
    return 'cancellation';
  }
  if (xmlLower.includes('modification') || jsonStr.includes('"modification"') || jsonStr.includes('"updated"')) {
    return 'modification';
  }
  if (xmlLower.includes('reservation') || jsonStr.includes('"reservation_id"') || jsonStr.includes('"confirmation_number"')) {
    return 'reservation';
  }
  
  return 'unknown';
}

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
  roomType?: string;
  totalPrice?: number;
  currency?: string;
  status?: string;
  guests?: number;
  guestCount?: number;
  numberOfGuests?: number;
  specialRequests?: string;
  remark?: string;
  firstname?: string;
  lastname?: string;
}

function parseBookingXml(xml: string): ReservationData | null {
  try {
    // Booking.com XML format - try CDATA and regular tags
    const getValue = (tag: string): string => {
      // Try CDATA format: <tag><![CDATA[value]]></tag>
      let regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([^\\]]*)\\]\\]></${tag}>`, 'i');
      let match = xml.match(regex);
      if (match) return match[1].trim();
      
      // Try regular: <tag>value</tag>
      regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
      match = xml.match(regex);
      if (match) return match[1].trim();
      
      return '';
    };

    const getAttr = (tag: string, attr: string): string => {
      const regex = new RegExp(`<${tag}[^>]*${attr}=['"]([^'"]*)['"]`, 'i');
      const match = xml.match(regex);
      return match ? match[1] : '';
    };

    // Check if this is a reservation notification
    if (!xml.includes('Reservation') && !xml.includes('reservations') && !xml.includes('booking')) {
      log('info', 'Not a reservation notification', { xmlPreview: xml.slice(0, 200) });
      return null;
    }

    const firstname = getValue('firstname') || getValue('first_name') || getValue('given_name');
    const lastname = getValue('lastname') || getValue('last_name') || getValue('family_name');
    const guestName = getValue('guest_name') || `${firstname} ${lastname}`.trim() || getValue('name');

    const reservation: ReservationData = {
      bookingId: getValue('reservation_id') || getAttr('reservation', 'id') || getValue('id'),
      confirmationNumber: getValue('confirmation_number') || getValue('confirmationcode') || getValue('booking_id'),
      guestName,
      guestEmail: getValue('email') || getValue('guest_email') || getValue('mail'),
      guestPhone: getValue('phone') || getValue('telephone') || getValue('mobile') || getValue('phone_number'),
      checkIn: getValue('checkin') || getValue('check_in_date') || getValue('arrival') || getValue('check_in'),
      checkOut: getValue('checkout') || getValue('check_out_date') || getValue('departure') || getValue('check_out'),
      roomTypeId: getValue('roomtype_id') || getValue('room_type_id') || getValue('room_id'),
      roomTypeName: getValue('roomtype_name') || getValue('room_type_name') || getValue('room_type') || getValue('accommodation_type'),
      roomType: getValue('roomtype_name') || getValue('room_type') || getValue('accommodation_type'),
      totalPrice: parseFloat(getValue('total_price') || getValue('price') || getValue('amount') || getValue('total_amount') || '0'),
      currency: getValue('currency') || 'IDR',
      status: getValue('status') || getValue('booking_status') || 'confirmed',
      guests: parseInt(getValue('guests') || getValue('number_of_guests') || getValue('guest_count') || '1'),
      guestCount: parseInt(getValue('guests') || getValue('number_of_guests') || '1'),
      numberOfGuests: parseInt(getValue('guests') || getValue('number_of_guests') || '1'),
      specialRequests: getValue('remark') || getValue('special_requests') || getValue('requests') || getValue('comment'),
      remark: getValue('remark') || getValue('note'),
      firstname,
      lastname
    };

    // Parse dates - Booking.com format: YYYY-MM-DD
    if (reservation.checkIn) {
      reservation.checkIn = normalizeDate(reservation.checkIn);
    }
    if (reservation.checkOut) {
      reservation.checkOut = normalizeDate(reservation.checkOut);
    }

    return reservation;
  } catch (error) {
    log('error', 'XML parsing error', { error: error.message });
    return null;
  }
}

function normalizeDate(dateStr: string): string {
  // Handle various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  // Try DD-MM-YYYY format
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    const year = parts[0].length === 4 ? parts[0] : parts[2];
    const month = parts[1];
    const day = parts[0].length === 4 ? parts[2] : parts[1];
    const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  
  return dateStr;
}

async function processReservation(
  supabase: ReturnType<typeof createClient>, 
  data: ReservationData,
  requestId: string
) {
  const { bookingId, confirmationNumber, guestName, guestEmail, guestPhone, checkIn, checkOut, roomTypeName, roomType, totalPrice, status, guests, guestCount, numberOfGuests, specialRequests, remark, firstname, lastname } = data;

  const finalGuestName = guestName || `${firstname || ''} ${lastname || ''}`.trim() || 'Guest';
  const finalGuestCount = guests || guestCount || numberOfGuests || 1;

  log('info', 'Processing reservation', { 
    requestId, 
    bookingId, 
    confirmationNumber, 
    guestName: finalGuestName,
    checkIn, 
    checkOut 
  });

  // Check if booking already exists
  if (bookingId || confirmationNumber) {
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('ota_booking_id', bookingId || confirmationNumber)
      .maybeSingle();

    if (existing) {
      log('info', 'Booking already exists, skipping', { requestId, bookingId });
      return { processed: true, action: 'already_exists', bookingId: existing.id };
    }
  }

  // Find the room by name/type
  let roomId: string | null = null;
  const searchRoomName = roomTypeName || roomType;
  
  if (searchRoomName) {
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name, slug')
      .ilike('name', `%${searchRoomName}%`)
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

  // Generate booking code if not provided
  const bookingCode = confirmationNumber || `BKG${Date.now().toString(36).toUpperCase()}`;

  // Determine booking status
  let bookingStatus = 'pending_payment';
  let paymentStatus = 'unpaid';
  
  if (status === 'confirmed' || status === 'booked' || status === 'active') {
    bookingStatus = 'confirmed';
    paymentStatus = 'paid'; // Booking.com usually handles payment
  }

  // Create the booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      booking_code: bookingCode,
      room_id: roomId,
      guest_name: finalGuestName,
      guest_email: guestEmail || '',
      guest_phone: guestPhone || '',
      check_in: checkIn,
      check_out: checkOut,
      total_nights: totalNights,
      total_price: totalPrice || 0,
      num_guests: finalGuestCount,
      status: bookingStatus,
      payment_status: paymentStatus,
      booking_source: 'booking.com',
      ota_booking_id: bookingId || confirmationNumber,
      special_requests: specialRequests || remark || null,
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
    guestName: finalGuestName 
  });

  // Send WhatsApp notification to managers
  await sendManagerNotification(supabase, {
    bookingCode,
    guestName: finalGuestName,
    checkIn: checkIn!,
    checkOut: checkOut!,
    totalNights,
    totalPrice: totalPrice || 0,
    guests: finalGuestCount,
    specialRequests: specialRequests || remark
  }, requestId);

  return { 
    processed: true, 
    action: 'created',
    bookingId: booking.id,
    bookingCode 
  };
}

async function processModification(
  supabase: ReturnType<typeof createClient>, 
  data: ReservationData,
  requestId: string
) {
  const { bookingId, confirmationNumber, checkIn, checkOut, roomTypeName, totalPrice, status } = data;

  log('info', 'Processing modification', { requestId, bookingId, confirmationNumber });

  // Find existing booking
  const { data: existing } = await supabase
    .from('bookings')
    .select('*')
    .eq('ota_booking_id', bookingId || confirmationNumber || '')
    .maybeSingle();

  if (!existing) {
    // If not found, create new booking
    return processReservation(supabase, data, requestId);
  }

  // Calculate nights if dates provided
  let totalNights = existing.total_nights;
  if (checkIn && checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    totalNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Update booking
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      check_in: checkIn || existing.check_in,
      check_out: checkOut || existing.check_out,
      total_nights: totalNights,
      total_price: totalPrice || existing.total_price,
      status: status === 'cancelled' ? 'cancelled' : existing.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id);

  if (updateError) {
    log('error', 'Failed to update booking', { requestId, error: updateError.message });
    return { error: updateError.message, processed: false };
  }

  log('info', 'Booking modified successfully', { requestId, bookingId: existing.id });

  return { 
    processed: true, 
    action: 'modified',
    bookingId: existing.id
  };
}

async function processCancellation(
  supabase: ReturnType<typeof createClient>, 
  data: ReservationData,
  requestId: string
) {
  const { bookingId, confirmationNumber } = data;

  log('info', 'Processing cancellation', { requestId, bookingId, confirmationNumber });

  // Find existing booking
  const { data: existing } = await supabase
    .from('bookings')
    .select('*')
    .eq('ota_booking_id', bookingId || confirmationNumber || '')
    .maybeSingle();

  if (!existing) {
    log('warn', 'Booking not found for cancellation', { requestId, bookingId });
    return { processed: false, error: 'Booking not found' };
  }

  // Update booking status to cancelled
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      payment_status: 'refunded',
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id);

  if (updateError) {
    log('error', 'Failed to cancel booking', { requestId, error: updateError.message });
    return { error: updateError.message, processed: false };
  }

  log('info', 'Booking cancelled successfully', { requestId, bookingId: existing.id });

  // Send cancellation notification
  await sendManagerNotification(supabase, {
    bookingCode: existing.booking_code,
    guestName: existing.guest_name,
    checkIn: existing.check_in,
    checkOut: existing.check_out,
    totalNights: existing.total_nights,
    totalPrice: existing.total_price,
    guests: existing.num_guests,
    isCancelled: true
  }, requestId);

  return { 
    processed: true, 
    action: 'cancelled',
    bookingId: existing.id
  };
}

async function sendManagerNotification(
  supabase: ReturnType<typeof createClient>,
  data: {
    bookingCode: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    totalNights: number;
    totalPrice: number;
    guests: number;
    specialRequests?: string;
    isCancelled?: boolean;
  },
  requestId: string
) {
  try {
    const { data: settings } = await supabase
      .from('hotel_settings')
      .select('whatsapp_manager_numbers, hotel_name')
      .single();

    const managerNumbers = (settings?.whatsapp_manager_numbers as Array<{ phone: string; name: string }>) || [];

    for (const manager of managerNumbers) {
      let message: string;
      
      if (data.isCancelled) {
        message = `❌ *Booking Dibatalkan!*\n\n` +
          `Kode: *${data.bookingCode}*\n` +
          `Tamu: ${data.guestName}\n` +
          `Check-in: ${data.checkIn}\n` +
          `Check-out: ${data.checkOut}\n\n` +
          `📱 Via Booking.com`;
      } else {
        message = `🎉 *Booking Baru dari Booking.com!*\n\n` +
          `Kode: *${data.bookingCode}*\n` +
          `Tamu: ${data.guestName}\n` +
          `Check-in: ${data.checkIn}\n` +
          `Check-out: ${data.checkOut}\n` +
          `Malam: ${data.totalNights}\n` +
          `Total: Rp ${data.totalPrice.toLocaleString('id-ID')}\n` +
          `Tamu: ${data.guests} orang\n\n` +
          `${data.specialRequests ? `Catatan: ${data.specialRequests}\n\n` : ''}` +
          `📱 Via Booking.com`;
      }

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
}
