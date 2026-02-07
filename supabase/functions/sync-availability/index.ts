import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  room_id: string;
  date_from: string;
  date_to: string;
  triggered_by?: string;
  booking_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { room_id, date_from, date_to, triggered_by, booking_id }: SyncRequest = await req.json();

    console.log(`[Sync] Starting availability sync for room ${room_id} from ${date_from} to ${date_to}`);

    // 1. Calculate availability
    const { data: availabilityData, error: calcError } = await supabase
      .rpc('calculate_room_availability', {
        p_room_id: room_id,
        p_date_from: date_from,
        p_date_to: date_to
      });

    if (calcError) {
      console.error('[Sync] Error calculating availability:', calcError);
      throw calcError;
    }

    // Transform to date: count map
    interface AvailabilityRow { availability_date: string; available_count: number }
    const availabilityMap = (availabilityData || []).reduce((acc: Record<string, number>, row: AvailabilityRow) => {
      acc[row.availability_date] = row.available_count;
      return acc;
    }, {} as Record<string, number>);

    console.log(`[Sync] Calculated availability for ${Object.keys(availabilityMap).length} dates`);

    // 2. Get active channel managers
    const { data: channelManagers, error: cmError } = await supabase
      .from('channel_managers')
      .select('*')
      .eq('is_active', true);

    if (cmError) {
      console.error('[Sync] Error fetching channel managers:', cmError);
      throw cmError;
    }

    if (!channelManagers || channelManagers.length === 0) {
      console.log('[Sync] No active channel managers found');
      return new Response(
        JSON.stringify({ message: 'No active channel managers', availabilityMap }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Sync] Found ${channelManagers.length} active channel managers`);

    // 3. Create sync queue entries for each channel manager
    const queueEntries = channelManagers.map(cm => ({
      channel_manager_id: cm.id,
      room_id,
      date_from,
      date_to,
      availability_data: availabilityMap,
      status: 'pending',
      triggered_by: triggered_by || 'manual',
      booking_id
    }));

    const { data: queueData, error: queueError } = await supabase
      .from('availability_sync_queue')
      .insert(queueEntries)
      .select();

    if (queueError) {
      console.error('[Sync] Error creating queue entries:', queueError);
      throw queueError;
    }

    console.log(`[Sync] Created ${queueData?.length || 0} sync queue entries`);

    // 4. Process queue entries (invoke push function) - non-blocking
    if (queueData) {
      const pushPromises = queueData.map(async (queueEntry: any) => {
        try {
          const { error } = await supabase.functions.invoke('push-availability', {
            body: { queue_id: queueEntry.id }
          });

          if (error) {
            console.error(`[Sync] Failed to invoke push for queue ${queueEntry.id}:`, error);
            return { queue_id: queueEntry.id, success: false };
          }

          return { queue_id: queueEntry.id, success: true };
        } catch (error) {
          console.error(`[Sync] Exception pushing queue ${queueEntry.id}:`, error);
          return { queue_id: queueEntry.id, success: false };
        }
      });

      // Don't await - let them run in background
      Promise.allSettled(pushPromises).then(results => {
        console.log(`[Sync] Push results:`, results);
      });
    }

    return new Response(
      JSON.stringify({
        message: 'Availability sync initiated',
        room_id,
        availability_count: Object.keys(availabilityMap).length,
        sync_queue_count: queueData?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Sync] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
