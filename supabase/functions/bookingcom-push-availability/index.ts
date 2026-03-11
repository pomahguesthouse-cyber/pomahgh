import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Booking.com OTA API base URL
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

    const username = Deno.env.get('BOOKINGCOM_USERNAME');
    const password = Deno.env.get('BOOKINGCOM_PASSWORD');
    const hotelId = Deno.env.get('BOOKINGCOM_HOTEL_ID');

    if (!username || !password || !hotelId) {
      throw new Error('Booking.com credentials not configured');
    }

    const { room_id, date_from, date_to } = await req.json();

    console.log(`[Booking.com Push] Starting for room ${room_id}, ${date_from} to ${date_to}`);

    // 1. Get room mappings
    const { data: mappings, error: mapError } = await supabase
      .from('bookingcom_room_mappings')
      .select('*, rooms(name, allotment)')
      .eq('room_id', room_id)
      .eq('is_active', true);

    if (mapError) throw mapError;

    if (!mappings || mappings.length === 0) {
      console.log('[Booking.com Push] No active mappings found for this room');
      return new Response(
        JSON.stringify({ message: 'No Booking.com mappings for this room', room_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Calculate availability
    const { data: availabilityData, error: calcError } = await supabase
      .rpc('calculate_room_availability', {
        p_room_id: room_id,
        p_date_from: date_from,
        p_date_to: date_to
      });

    if (calcError) throw calcError;

    // 3. Build OTA_HotelAvailNotifRQ XML for each mapping
    const results = [];

    for (const mapping of mappings) {
      const xmlPayload = buildAvailabilityXML(
        hotelId,
        mapping.bookingcom_room_id,
        mapping.bookingcom_rate_id,
        availabilityData || []
      );

      console.log(`[Booking.com Push] Sending availability for mapping ${mapping.id}`);

      try {
        const response = await fetch(`${BOOKINGCOM_API_BASE}/availability`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'Authorization': 'Basic ' + btoa(`${username}:${password}`),
          },
          body: xmlPayload,
        });

        const responseText = await response.text();
        const httpStatus = response.status;
        const success = response.ok && !responseText.includes('<Error');
        const duration = Date.now() - startTime;

        // Log to bookingcom_sync_logs
        await supabase.from('bookingcom_sync_logs').insert({
          sync_type: 'push_availability',
          direction: 'outbound',
          room_id,
          request_payload: { xml: xmlPayload, mapping_id: mapping.id },
          response_payload: { body: responseText },
          http_status_code: httpStatus,
          success,
          error_message: success ? null : responseText.substring(0, 500),
          duration_ms: duration,
        });

        results.push({
          mapping_id: mapping.id,
          bookingcom_room_id: mapping.bookingcom_room_id,
          success,
          http_status: httpStatus,
        });

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        await supabase.from('bookingcom_sync_logs').insert({
          sync_type: 'push_availability',
          direction: 'outbound',
          room_id,
          request_payload: { xml: xmlPayload, mapping_id: mapping.id },
          success: false,
          error_message: errorMsg,
          duration_ms: Date.now() - startTime,
        });
        results.push({ mapping_id: mapping.id, success: false, error: errorMsg });
      }
    }

    return new Response(
      JSON.stringify({ message: 'Booking.com availability push completed', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Booking.com Push] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function buildAvailabilityXML(
  hotelId: string,
  roomId: string,
  rateId: string,
  availability: Array<{ availability_date: string; available_count: number }>
): string {
  const statusMessages = availability.map(row => {
    const date = row.availability_date;
    const count = row.available_count;
    return `
      <StatusApplicationControl
        Start="${date}"
        End="${date}"
        InvTypeCode="${roomId}"
        RatePlanCode="${rateId}"/>
      <LengthsOfStay>
        <LengthOfStay MinMaxMessageType="SetMinLOS" Time="1"/>
      </LengthsOfStay>
      <BookingLimit>${count}</BookingLimit>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelAvailNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opentravel.org/OTA/2003/05 OTA_HotelAvailNotifRQ.xsd"
  Version="3.000">
  <AvailStatusMessages HotelCode="${hotelId}">
    ${availability.map(row => `
    <AvailStatusMessage>
      <StatusApplicationControl
        Start="${row.availability_date}"
        End="${row.availability_date}"
        InvTypeCode="${roomId}"
        RatePlanCode="${rateId}"/>
      <LengthsOfStay>
        <LengthOfStay MinMaxMessageType="SetMinLOS" Time="1"/>
      </LengthsOfStay>
      <RestrictionStatus Status="${row.available_count > 0 ? 'Open' : 'Close'}" Restriction="Arrival"/>
      <RestrictionStatus Status="${row.available_count > 0 ? 'Open' : 'Close'}" Restriction="Departure"/>
    </AvailStatusMessage>`).join('')}
  </AvailStatusMessages>
</OTA_HotelAvailNotifRQ>`;
}
