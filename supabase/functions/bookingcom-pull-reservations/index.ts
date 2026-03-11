import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOOKINGCOM_API_BASE = 'https://supply-xml.booking.com/hotels/xml';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Try to get credentials from ota_connections table first
    let username: string | undefined;
    let password: string | undefined;
    let hotelId: string | undefined;

    const { data: otaConn } = await supabase
      .from('ota_connections')
      .select('hotel_id, username, password_encrypted')
      .eq('provider', 'booking_com')
      .eq('is_active', true)
      .maybeSingle();

    if (otaConn?.hotel_id && otaConn?.username && otaConn?.password_encrypted) {
      username = otaConn.username;
      password = otaConn.password_encrypted;
      hotelId = otaConn.hotel_id;
      console.log('[Booking.com Pull] Using credentials from ota_connections');
    } else {
      username = Deno.env.get('BOOKINGCOM_USERNAME');
      password = Deno.env.get('BOOKINGCOM_PASSWORD');
      hotelId = Deno.env.get('BOOKINGCOM_HOTEL_ID');
      console.log('[Booking.com Pull] Using credentials from environment variables');
    }

    if (!username || !password || !hotelId) {
      throw new Error('Booking.com credentials not configured. Set them in OTA Connection settings or environment variables.');
    }

    const { last_change } = await req.json();
    const lastChangeDate = last_change || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`[Booking.com Pull] Fetching reservations since ${lastChangeDate}`);

    const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_ReadRQ xmlns="http://www.opentravel.org/OTA/2003/05"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opentravel.org/OTA/2003/05 OTA_ReadRQ.xsd"
  Version="2.001">
  <ReadRequests>
    <HotelReadRequest HotelCode="${hotelId}">
      <SelectionCriteria SelectionType="Undelivered" Start="${lastChangeDate}" End="${new Date().toISOString().split('T')[0]}"/>
    </HotelReadRequest>
  </ReadRequests>
</OTA_ReadRQ>`;

    const response = await fetch(`${BOOKINGCOM_API_BASE}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': 'Basic ' + btoa(`${username}:${password}`),
      },
      body: xmlPayload,
    });

    const responseText = await response.text();
    const duration = Date.now() - startTime;

    await supabase.from('bookingcom_sync_logs').insert({
      sync_type: 'pull_reservations',
      direction: 'inbound',
      request_payload: { xml: xmlPayload },
      response_payload: { body: responseText.substring(0, 5000) },
      http_status_code: response.status,
      success: response.ok,
      error_message: response.ok ? null : responseText.substring(0, 500),
      duration_ms: duration,
    });

    if (!response.ok) {
      const errorDetail = response.status === 404
        ? 'Endpoint tidak ditemukan. Pastikan Hotel ID benar dan properti sudah aktif di Booking.com Connectivity Partner.'
        : response.status === 401 || response.status === 403
        ? 'Autentikasi gagal. Periksa username dan password Booking.com.'
        : `Booking.com API error: ${response.status}`;
      
      return new Response(
        JSON.stringify({ 
          error: errorDetail,
          http_status: response.status,
          response_body: responseText.substring(0, 500),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const reservations = parseReservationsXML(responseText);
    console.log(`[Booking.com Pull] Found ${reservations.length} reservations`);

    const results = [];
    for (const reservation of reservations) {
      try {
        const result = await processReservation(supabase, reservation, hotelId);
        results.push(result);
      } catch (err) {
        console.error(`[Booking.com Pull] Error processing reservation:`, err);
        results.push({
          booking_id: reservation.confirmationNumber,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${reservations.length} reservations`,
        results,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Booking.com Pull] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

interface ParsedReservation {
  confirmationNumber: string;
  status: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  roomTypeCode: string;
  ratePlanCode: string;
  numGuests: number;
  totalPrice: number;
  currency: string;
}

function parseReservationsXML(xml: string): ParsedReservation[] {
  const reservations: ParsedReservation[] = [];
  const resRegex = /<HotelReservation[^>]*>([\s\S]*?)<\/HotelReservation>/gi;
  let match;

  while ((match = resRegex.exec(xml)) !== null) {
    const resXml = match[1];

    const getAttr = (tag: string, attr: string): string => {
      const r = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
      const m = resXml.match(r);
      return m ? m[1] : '';
    };

    const getTag = (tag: string): string => {
      const r = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
      const m = resXml.match(r);
      return m ? m[1] : '';
    };

    const status = getAttr('HotelReservation', 'ResStatus') || 'Commit';
    const confirmationNumber = getAttr('UniqueID', 'ID') || 
                               getAttr('HotelReservationID', 'ResID_Value') || '';

    reservations.push({
      confirmationNumber,
      status,
      guestName: `${getTag('GivenName')} ${getTag('Surname')}`.trim(),
      guestEmail: getAttr('Email', 'EmailType') ? getTag('Email') : 
                  (resXml.match(/<Email[^>]*>([^<]*)<\/Email>/i)?.[1] || ''),
      guestPhone: getTag('PhoneNumber') || getAttr('Telephone', 'PhoneNumber') || '',
      checkIn: getAttr('TimeSpan', 'Start') || getAttr('StayDateRange', 'Start') || '',
      checkOut: getAttr('TimeSpan', 'End') || getAttr('StayDateRange', 'End') || '',
      roomTypeCode: getAttr('RoomType', 'RoomTypeCode') || getAttr('RoomStay', 'RoomTypeCode') || '',
      ratePlanCode: getAttr('RatePlan', 'RatePlanCode') || '',
      numGuests: parseInt(getAttr('GuestCount', 'Count') || '1', 10),
      totalPrice: parseFloat(getAttr('Total', 'AmountAfterTax') || getAttr('AmountPercent', 'Amount') || '0'),
      currency: getAttr('Total', 'CurrencyCode') || 'IDR',
    });
  }

  return reservations;
}

async function processReservation(
  supabase: ReturnType<typeof createClient>,
  reservation: ParsedReservation,
  _hotelId: string
) {
  const { data: mapping } = await supabase
    .from('bookingcom_room_mappings')
    .select('room_id')
    .eq('bookingcom_room_id', reservation.roomTypeCode)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!mapping) {
    return {
      booking_id: reservation.confirmationNumber,
      success: false,
      error: `No room mapping for Booking.com room ${reservation.roomTypeCode}`
    };
  }

  const bookingCode = `BDC-${reservation.confirmationNumber}`;
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('booking_code', bookingCode)
    .limit(1)
    .maybeSingle();

  const checkIn = reservation.checkIn;
  const checkOut = reservation.checkOut;
  const nights = Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (reservation.status === 'Cancel' || reservation.status === 'Cancelled') {
    if (existingBooking) {
      await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancellation_reason: 'Cancelled via Booking.com' })
        .eq('id', existingBooking.id);
      return { booking_id: bookingCode, success: true, action: 'cancelled' };
    }
    return { booking_id: bookingCode, success: true, action: 'skip_cancel_not_found' };
  }

  if (existingBooking) {
    await supabase
      .from('bookings')
      .update({
        check_in: checkIn,
        check_out: checkOut,
        total_nights: nights,
        total_price: reservation.totalPrice,
        num_guests: reservation.numGuests,
        guest_name: reservation.guestName,
        guest_email: reservation.guestEmail || 'bookingcom@guest.booking.com',
        guest_phone: reservation.guestPhone,
        status: 'confirmed',
        payment_status: 'paid',
      })
      .eq('id', existingBooking.id);

    return { booking_id: bookingCode, success: true, action: 'updated' };
  }

  const { error: insertError } = await supabase
    .from('bookings')
    .insert({
      booking_code: bookingCode,
      room_id: mapping.room_id,
      check_in: checkIn,
      check_out: checkOut,
      total_nights: nights,
      total_price: reservation.totalPrice,
      num_guests: reservation.numGuests,
      guest_name: reservation.guestName,
      guest_email: reservation.guestEmail || 'bookingcom@guest.booking.com',
      guest_phone: reservation.guestPhone,
      status: 'confirmed',
      payment_status: 'paid',
      booking_source: 'ota',
      ota_name: 'Booking.com',
      remark: `Booking.com Confirmation: ${reservation.confirmationNumber}`,
    });

  if (insertError) throw insertError;

  return { booking_id: bookingCode, success: true, action: 'created' };
}
