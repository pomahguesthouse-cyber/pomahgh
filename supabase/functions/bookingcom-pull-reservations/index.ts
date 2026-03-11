import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PCI-compliant endpoint for reservation data (per Booking.com docs)
const BOOKINGCOM_SECURE_BASE = 'https://secure-supply-xml.booking.com/hotels/xml';

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

    // Get credentials from ota_connections or env vars
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
      throw new Error('Booking.com credentials not configured.');
    }

    const authHeader = 'Basic ' + btoa(`${username}:${password}`);

    // ── Step 1: GET /OTA_HotelResNotif to fetch new/modified reservations ──
    console.log(`[Booking.com Pull] Step 1: Fetching undelivered reservations via GET /OTA_HotelResNotif`);

    const fetchUrl = `${BOOKINGCOM_SECURE_BASE}/OTA_HotelResNotif?hotel_id=${hotelId}`;
    const fetchResponse = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/xml',
      },
    });

    const responseText = await fetchResponse.text();
    const duration = Date.now() - startTime;

    // Log the fetch attempt
    await supabase.from('bookingcom_sync_logs').insert({
      sync_type: 'pull_reservations',
      direction: 'inbound',
      request_payload: { url: fetchUrl, method: 'GET' },
      response_payload: { body: responseText.substring(0, 5000) },
      http_status_code: fetchResponse.status,
      success: fetchResponse.ok,
      error_message: fetchResponse.ok ? null : responseText.substring(0, 500),
      duration_ms: duration,
    });

    if (!fetchResponse.ok) {
      const errorDetail = fetchResponse.status === 404
        ? 'Endpoint tidak ditemukan. Pastikan Hotel ID benar dan properti sudah aktif di Booking.com Connectivity Partner.'
        : fetchResponse.status === 401 || fetchResponse.status === 403
        ? 'Autentikasi gagal. Periksa username dan password Booking.com.'
        : `Booking.com API error: ${fetchResponse.status}`;

      return new Response(
        JSON.stringify({ error: errorDetail, http_status: fetchResponse.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Parse reservations from OTA_HotelResNotifRQ response
    const reservations = parseReservationsXML(responseText);
    console.log(`[Booking.com Pull] Found ${reservations.length} reservations`);

    if (reservations.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No new reservations', results: [], duration_ms: duration }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 2: Process each reservation ──
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

    // ── Step 3: POST acknowledgement back to Booking.com ──
    // Booking.com requires acknowledgement within 5 minutes, otherwise
    // they will send the reservation via email as fallback.
    console.log(`[Booking.com Pull] Step 3: Sending acknowledgement for ${reservations.length} reservations`);

    const ackXml = buildAcknowledgementXML(reservations);
    
    try {
      const ackResponse = await fetch(`${BOOKINGCOM_SECURE_BASE}/OTA_HotelResNotif`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': authHeader,
        },
        body: ackXml,
      });

      const ackResponseText = await ackResponse.text();

      await supabase.from('bookingcom_sync_logs').insert({
        sync_type: 'pull_ack',
        direction: 'outbound',
        request_payload: { xml: ackXml.substring(0, 3000) },
        response_payload: { body: ackResponseText.substring(0, 3000) },
        http_status_code: ackResponse.status,
        success: ackResponse.ok,
        error_message: ackResponse.ok ? null : ackResponseText.substring(0, 500),
        duration_ms: Date.now() - startTime,
      });

      if (!ackResponse.ok) {
        console.error(`[Booking.com Pull] Acknowledgement failed: ${ackResponse.status}`);
      } else {
        console.log(`[Booking.com Pull] Acknowledgement successful`);
      }
    } catch (ackError) {
      console.error(`[Booking.com Pull] Acknowledgement error:`, ackError);
      // Log but don't fail the whole operation - reservations are already saved
      await supabase.from('bookingcom_sync_logs').insert({
        sync_type: 'pull_ack',
        direction: 'outbound',
        request_payload: { xml: ackXml.substring(0, 3000) },
        success: false,
        error_message: ackError instanceof Error ? ackError.message : 'Ack failed',
        duration_ms: Date.now() - startTime,
      });
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${reservations.length} reservations`,
        results,
        duration_ms: Date.now() - startTime,
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

// ── Acknowledgement XML Builder ──
// Per Booking.com docs: POST back OTA_HotelResNotifRS with Success for each reservation
function buildAcknowledgementXML(reservations: ParsedReservation[]): string {
  const resIdElements = reservations.map(r => {
    const resType = r.status === 'Cancel' || r.status === 'Cancelled' ? 'Cancel' : 'Commit';
    return `    <HotelReservation ResStatus="${resType}">
      <UniqueID Type="14" ID="${r.confirmationNumber}"/>
    </HotelReservation>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelResNotifRS xmlns="http://www.opentravel.org/OTA/2003/05" Version="1.0">
  <Success/>
  <HotelReservations>
${resIdElements}
  </HotelReservations>
</OTA_HotelResNotifRS>`;
}

// ── XML Parser ──
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
  specialRequests: string;
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

    const status = getAttr('HotelReservation', 'ResStatus') || 
                   match[0].match(/ResStatus="([^"]*)"/)?.[1] || 'Commit';
    const confirmationNumber = getAttr('UniqueID', 'ID') || 
                               getAttr('HotelReservationID', 'ResID_Value') || '';

    if (!confirmationNumber) continue;

    reservations.push({
      confirmationNumber,
      status,
      guestName: `${getTag('GivenName')} ${getTag('Surname')}`.trim(),
      guestEmail: resXml.match(/<Email[^>]*>([^<]*)<\/Email>/i)?.[1] || '',
      guestPhone: getTag('PhoneNumber') || getAttr('Telephone', 'PhoneNumber') || '',
      checkIn: getAttr('TimeSpan', 'Start') || getAttr('StayDateRange', 'Start') || '',
      checkOut: getAttr('TimeSpan', 'End') || getAttr('StayDateRange', 'End') || '',
      roomTypeCode: getAttr('RoomType', 'RoomTypeCode') || getAttr('RoomStay', 'RoomTypeCode') || '',
      ratePlanCode: getAttr('RatePlan', 'RatePlanCode') || '',
      numGuests: parseInt(getAttr('GuestCount', 'Count') || '1', 10),
      totalPrice: parseFloat(getAttr('Total', 'AmountAfterTax') || getAttr('AmountPercent', 'Amount') || '0'),
      currency: getAttr('Total', 'CurrencyCode') || 'IDR',
      specialRequests: getTag('SpecialRequest') || getTag('Text') || '',
    });
  }

  return reservations;
}

// ── Process & Upsert Reservation ──
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
    .maybeSingle();

  if (!mapping) {
    // Also try matching by rate plan code
    const { data: rateMapping } = await supabase
      .from('bookingcom_room_mappings')
      .select('room_id')
      .eq('bookingcom_rate_id', reservation.ratePlanCode)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!rateMapping) {
      return {
        booking_id: reservation.confirmationNumber,
        success: false,
        error: `No room mapping for Booking.com room ${reservation.roomTypeCode} / rate ${reservation.ratePlanCode}`
      };
    }
    
    return await upsertBooking(supabase, reservation, rateMapping.room_id);
  }

  return await upsertBooking(supabase, reservation, mapping.room_id);
}

async function upsertBooking(
  supabase: ReturnType<typeof createClient>,
  reservation: ParsedReservation,
  roomId: string
) {
  const bookingCode = `BDC-${reservation.confirmationNumber}`;
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('booking_code', bookingCode)
    .limit(1)
    .maybeSingle();

  const checkIn = reservation.checkIn;
  const checkOut = reservation.checkOut;
  const nights = Math.max(1, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  ));

  // Handle cancellation
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

  // Handle modification
  if (reservation.status === 'Modify' && existingBooking) {
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
        special_requests: reservation.specialRequests || null,
      })
      .eq('id', existingBooking.id);
    return { booking_id: bookingCode, success: true, action: 'modified' };
  }

  // Update existing or create new
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
        special_requests: reservation.specialRequests || null,
      })
      .eq('id', existingBooking.id);
    return { booking_id: bookingCode, success: true, action: 'updated' };
  }

  const { error: insertError } = await supabase
    .from('bookings')
    .insert({
      booking_code: bookingCode,
      room_id: roomId,
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
      special_requests: reservation.specialRequests || null,
      remark: `Booking.com Confirmation: ${reservation.confirmationNumber}`,
    });

  if (insertError) throw insertError;

  return { booking_id: bookingCode, success: true, action: 'created' };
}
