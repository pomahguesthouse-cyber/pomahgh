// Mock Pricing Processor - For testing UI only
// Copy this to supabase/functions/pricing-processor/index.ts temporarily
// Replace with full implementation for production

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
    const body = await req.json();
    console.log('Mock pricing processor called:', body);

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mock processor executed successfully',
        result: {
          events_processed: 3,
          prices_updated: 2,
          approvals_created: 1,
          errors: 0,
          processing_time_ms: 1200
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
