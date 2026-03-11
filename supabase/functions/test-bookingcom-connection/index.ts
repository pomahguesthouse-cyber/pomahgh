import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hotel_id, username, password } = await req.json();

    if (!hotel_id || !username || !password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Hotel ID, username, dan password wajib diisi' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    // Test with a simple OTA_HotelAvailRQ to check credentials
    const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_ReadRQ xmlns="http://www.opentravel.org/OTA/2003/05" Version="2.001">
  <ReadRequests>
    <HotelReadRequest HotelCode="${hotel_id}">
      <SelectionCriteria SelectionType="Undelivered" Start="${new Date().toISOString().split('T')[0]}" End="${new Date().toISOString().split('T')[0]}"/>
    </HotelReadRequest>
  </ReadRequests>
</OTA_ReadRQ>`;

    const response = await fetch('https://supply-xml.booking.com/hotels/xml/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': 'Basic ' + btoa(`${username}:${password}`),
      },
      body: xmlPayload,
    });

    const duration = Date.now() - startTime;
    const responseText = await response.text();

    if (response.status === 401 || response.status === 403) {
      return new Response(
        JSON.stringify({ success: false, message: 'Autentikasi gagal. Periksa username dan password.', http_status: response.status, duration_ms: duration }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 404) {
      return new Response(
        JSON.stringify({ success: false, message: 'Hotel ID tidak ditemukan. Pastikan properti sudah aktif di Booking.com Connectivity Partner.', http_status: response.status, duration_ms: duration }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const success = response.ok && !responseText.includes('<Error');

    return new Response(
      JSON.stringify({
        success,
        message: success ? 'Koneksi ke Booking.com berhasil!' : `Booking.com response error (HTTP ${response.status})`,
        http_status: response.status,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
