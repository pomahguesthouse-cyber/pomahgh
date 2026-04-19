import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * booking-webhook
 *
 * Channel Manager (Booking.com OTA) integration has been REMOVED.
 *
 * Reason: parser bugs (normalizeDate DD-MM-YYYY swap, double body-stream read
 * via req.text() then req.json()) caused unreliable date parsing and silent
 * failures. Until a properly tested OTA integration is reintroduced, this
 * endpoint only acknowledges incoming requests so external callers do not
 * receive 5xx errors.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-booking-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Read body once (single stream consumption — fixes previous req.text()+req.json() bug)
  let bodyPreview = '';
  try {
    const text = await req.text();
    bodyPreview = text.slice(0, 500);
  } catch {
    // ignore
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'booking-webhook',
    level: 'info',
    message: 'Channel Manager disabled — request acknowledged but not processed',
    method: req.method,
    contentType: req.headers.get('content-type'),
    bodyPreview,
  }));

  return new Response(
    JSON.stringify({
      success: true,
      processed: false,
      reason: 'Channel Manager integration disabled',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
