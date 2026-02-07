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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[Retry] Starting retry job for failed syncs');

    // Get pending retries that are due
    const { data: pendingRetries, error } = await supabase
      .from('availability_sync_queue')
      .select('id')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .limit(50);

    if (error) {
      console.error('[Retry] Error fetching pending retries:', error);
      throw error;
    }

    const retryCount = pendingRetries?.length || 0;
    console.log(`[Retry] Found ${retryCount} pending retries`);

    if (retryCount === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending retries', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each retry by invoking push-availability
    const results = await Promise.allSettled(
      (pendingRetries || []).map(async (entry: { id: string }) => {
        try {
          const { error } = await supabase.functions.invoke('push-availability', {
            body: { queue_id: entry.id }
          });

          if (error) {
            console.error(`[Retry] Failed to invoke push for ${entry.id}:`, error);
            return false;
          }

          return true;
        } catch (error) {
          console.error(`[Retry] Exception invoking push for ${entry.id}:`, error);
          return false;
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failedCount = results.length - successCount;

    console.log(`[Retry] Retry job completed: ${successCount} successful, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        message: 'Retry job completed',
        processed: results.length,
        successful: successCount,
        failed: failedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Retry] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
