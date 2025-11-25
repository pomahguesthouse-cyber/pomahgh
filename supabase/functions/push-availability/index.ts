import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.203.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { queue_id } = await req.json();

    // 1. Get queue entry with channel manager and room details
    const { data: queueEntry, error: queueError } = await supabase
      .from('availability_sync_queue')
      .select('*, channel_managers(*), rooms(name, slug)')
      .eq('id', queue_id)
      .single();

    if (queueError) {
      console.error('[Push] Error fetching queue entry:', queueError);
      throw queueError;
    }

    console.log(`[Push] Processing queue ${queue_id} for ${queueEntry.channel_managers?.name}`);

    // 2. Mark as processing
    await supabase
      .from('availability_sync_queue')
      .update({ 
        status: 'processing', 
        last_attempt_at: new Date().toISOString() 
      })
      .eq('id', queue_id);

    const startTime = Date.now();
    let success = false;
    let errorMessage = null;
    let responsePayload: any = null;
    let httpStatus: number | null = null;
    let requestPayload: any = null;

    try {
      const cm = queueEntry.channel_managers;
      
      // Build request payload
      requestPayload = buildChannelManagerPayload(cm, queueEntry);

      console.log(`[Push] Sending to ${cm.name}:`, { 
        room: queueEntry.rooms?.name,
        dates: Object.keys(queueEntry.availability_data).length 
      });

      // Send request based on type
      let response: Response;
      
      if (cm.type === 'api') {
        // API-based channel manager
        const apiKey = Deno.env.get(cm.api_key_secret) || '';
        
        response = await fetch(cm.api_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${cm.auth_type === 'bearer' ? 'Bearer ' : ''}${apiKey}`
          },
          body: JSON.stringify(requestPayload)
        });

        httpStatus = response.status;
        
        try {
          responsePayload = await response.json();
        } catch {
          responsePayload = await response.text();
        }
        
        success = response.ok;

      } else if (cm.type === 'webhook') {
        // Webhook-based channel manager
        const webhookSecret = Deno.env.get(cm.webhook_secret) || '';
        const signature = await signPayload(requestPayload, webhookSecret);
        
        response = await fetch(cm.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature
          },
          body: JSON.stringify(requestPayload)
        });

        httpStatus = response.status;
        
        try {
          responsePayload = await response.json();
        } catch {
          responsePayload = await response.text();
        }
        
        success = response.ok;
      }

      if (!success) {
        errorMessage = `HTTP ${httpStatus}: ${JSON.stringify(responsePayload)}`;
        console.error(`[Push] Failed:`, errorMessage);
      } else {
        console.log(`[Push] Success for queue ${queue_id}`);
      }

    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      success = false;
      console.error(`[Push] Exception:`, errorMessage);
    }

    const duration = Date.now() - startTime;

    // 5. Update queue status
    const newStatus = success ? 'success' : 'failed';
    const newRetryCount = queueEntry.retry_count + 1;
    const shouldRetry = !success && newRetryCount < queueEntry.channel_managers.max_retries;

    await supabase
      .from('availability_sync_queue')
      .update({
        status: shouldRetry ? 'pending' : newStatus,
        retry_count: newRetryCount,
        error_message: errorMessage,
        next_retry_at: shouldRetry 
          ? new Date(Date.now() + queueEntry.channel_managers.retry_delay_seconds * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', queue_id);

    // 6. Log the sync
    await supabase
      .from('availability_sync_logs')
      .insert({
        sync_queue_id: queue_id,
        channel_manager_id: queueEntry.channel_manager_id,
        room_id: queueEntry.room_id,
        request_payload: requestPayload,
        response_payload: responsePayload,
        http_status_code: httpStatus,
        duration_ms: duration,
        success,
        error_message: errorMessage
      });

    // 7. Update channel manager last sync
    if (success) {
      await supabase
        .from('channel_managers')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success'
        })
        .eq('id', queueEntry.channel_manager_id);
    }

    return new Response(
      JSON.stringify({
        queue_id,
        success,
        duration_ms: duration,
        status: newStatus,
        will_retry: shouldRetry
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Push] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper: Build payload based on channel manager
function buildChannelManagerPayload(cm: any, queueEntry: any) {
  const availability = Object.entries(queueEntry.availability_data).map(([date, count]) => ({
    date,
    available: count
  }));

  // Generic format (can be customized per channel manager)
  return {
    property_id: Deno.env.get('PROPERTY_ID') || 'default',
    room_type_id: queueEntry.rooms?.slug || 'unknown',
    room_name: queueEntry.rooms?.name || 'Unknown Room',
    availability,
    updated_at: new Date().toISOString()
  };
}

// Helper: Sign webhook payload with HMAC-SHA256
async function signPayload(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const keyData = encoder.encode(secret);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
