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
    const { 
      api_endpoint, 
      auth_type, 
      api_key_secret 
    } = await req.json();

    if (!api_endpoint) {
      throw new Error("API endpoint is required");
    }

    // Build headers based on auth type
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Pomah-Guesthouse/1.0'
    };

    if (api_key_secret) {
      if (auth_type === 'bearer') {
        headers['Authorization'] = `Bearer ${api_key_secret}`;
      } else if (auth_type === 'api_key') {
        headers['X-API-Key'] = api_key_secret;
      } else if (auth_type === 'basic') {
        headers['Authorization'] = `Basic ${btoa(api_key_secret)}`;
      }
    }

    console.log(`Testing connection to: ${api_endpoint}`);
    const startTime = Date.now();

    // Test connection with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(api_endpoint, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText.substring(0, 500) };
      }

      return new Response(
        JSON.stringify({
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          duration_ms: duration,
          response_preview: responseData,
          message: response.ok 
            ? `✓ Connection successful! (${duration}ms)` 
            : `✗ Connection failed: ${response.status} ${response.statusText}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      const error = fetchError as Error;
      if (error.name === 'AbortError') {
        throw new Error('Connection timeout after 10 seconds');
      }
      throw error;
    }

  } catch (error) {
    console.error('Test connection error:', error);
    const err = error as Error;
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `✗ Connection failed: ${err.message}`,
        error: err.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});
