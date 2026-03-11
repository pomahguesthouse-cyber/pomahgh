import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const contentType = req.headers.get('content-type') || '';
    let body: string;
    
    if (contentType.includes('xml')) {
      body = await req.text();
    } else {
      body = await req.text();
    }

    console.log(`[Booking.com Webhook] Received notification, content-type: ${contentType}`);

    // Log the incoming webhook
    await supabase.from('bookingcom_sync_logs').insert({
      sync_type: 'webhook',
      direction: 'inbound',
      request_payload: { body: body.substring(0, 5000), content_type: contentType },
      success: true,
      duration_ms: Date.now() - startTime,
    });

    // Trigger pull reservations to get the latest data
    try {
      await supabase.functions.invoke('bookingcom-pull-reservations', {
        body: { last_change: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().split('T')[0] }
      });
      console.log('[Booking.com Webhook] Triggered reservation pull');
    } catch (pullError) {
      console.error('[Booking.com Webhook] Failed to trigger pull:', pullError);
    }

    // Return success (Booking.com expects HTTP 200)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelResNotifRS xmlns="http://www.opentravel.org/OTA/2003/05" Version="1.0">
  <Success/>
</OTA_HotelResNotifRS>`,
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Booking.com Webhook] Error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelResNotifRS xmlns="http://www.opentravel.org/OTA/2003/05" Version="1.0">
  <Errors>
    <Error Type="1" Code="450">Internal server error</Error>
  </Errors>
</OTA_HotelResNotifRS>`,
      { headers: { ...corsHeaders, 'Content-Type': 'application/xml' }, status: 500 }
    );
  }
});
