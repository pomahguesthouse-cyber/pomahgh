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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting pricing event processor...');

    // Get unprocessed events
    const { data: events, error: fetchError } = await supabase
      .from('pricing_events')
      .select('*')
      .eq('processed', false)
      .lt('retry_count', 3)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) throw fetchError;

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No events to process',
          result: { events_processed: 0, prices_updated: 0, approvals_created: 0, errors: 0, processing_time_ms: Date.now() - startTime }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${events.length} pricing events to process`);

    let processed = 0, pricesUpdated = 0, approvalsCreated = 0, errors = 0;

    for (const event of events) {
      try {
        await supabase.from('pricing_events').update({
          processing_started_at: new Date().toISOString(),
          status: 'processing'
        }).eq('id', event.id);

        if (event.event_type === 'booking_change' || event.event_type === 'occupancy_update') {
          const result = await processOccupancyEvent(supabase, event);
          if (result.priceUpdated) pricesUpdated++;
          if (result.approvalCreated) approvalsCreated++;
        }

        await supabase.from('pricing_events').update({
          processed: true,
          processing_completed_at: new Date().toISOString(),
          status: 'completed'
        }).eq('id', event.id);

        processed++;
      } catch (error) {
        errors++;
        console.error(`❌ Error processing event ${event.id}:`, error);
        await supabase.from('pricing_events').update({
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: (event.retry_count || 0) + 1,
          status: (event.retry_count || 0) + 1 >= 3 ? 'failed' : 'pending'
        }).eq('id', event.id);
      }
    }

    const result = { events_processed: processed, prices_updated: pricesUpdated, approvals_created: approvalsCreated, errors, processing_time_ms: Date.now() - startTime };
    console.log('✅ Pricing processor completed:', result);

    return new Response(
      JSON.stringify({ success: true, message: `Processed ${processed} events`, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Pricing processor error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error', processing_time_ms: Date.now() - startTime }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processOccupancyEvent(supabase: ReturnType<typeof createClient>, event: Record<string, unknown>) {
  const today = new Date().toISOString().split('T')[0];
  const roomId = event.room_id as string;

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, base_price, price_per_night, min_auto_price, max_auto_price, auto_pricing_enabled')
    .eq('id', roomId)
    .single();

  if (!room || !room.auto_pricing_enabled) {
    console.log(`⏭️ Room ${roomId} skipped - auto_pricing disabled or not found`);
    return { priceUpdated: false, approvalCreated: false };
  }

  const { data: occupancyData, error: occError } = await supabase.rpc('calculate_real_time_occupancy', {
    p_room_id: roomId,
    p_date: today
  });

  if (occError || !occupancyData || occupancyData.length === 0) {
    console.error('Occupancy calc error:', occError);
    return { priceUpdated: false, approvalCreated: false };
  }

  const occupancy = occupancyData[0];
  console.log(`📊 ${room.name}: ${occupancy.occupancy_rate}% occupancy (${occupancy.booked_units}/${occupancy.total_allotment})`);

  let multiplier = 1.0;
  if (occupancy.occupancy_rate >= 95) multiplier = 1.5;
  else if (occupancy.occupancy_rate >= 85) multiplier = 1.3;
  else if (occupancy.occupancy_rate >= 70) multiplier = 1.15;
  else if (occupancy.occupancy_rate <= 30) multiplier = 0.85;

  const basePrice = room.base_price || room.price_per_night;
  if (!basePrice || basePrice <= 0) return { priceUpdated: false, approvalCreated: false };

  const newPrice = Math.round((basePrice * multiplier) / 10000) * 10000;
  if (newPrice === basePrice) return { priceUpdated: false, approvalCreated: false };

  let finalPrice = newPrice;
  if (room.min_auto_price && finalPrice < room.min_auto_price) finalPrice = room.min_auto_price;
  if (room.max_auto_price && finalPrice > room.max_auto_price) finalPrice = room.max_auto_price;

  const changePercentage = Math.abs((finalPrice - basePrice) / basePrice * 100);
  console.log(`💰 ${room.name}: ${basePrice} → ${finalPrice} (${changePercentage.toFixed(1)}%, ${multiplier}x)`);

  if (changePercentage > 10) {
    await supabase.from('price_approvals').insert({
      room_id: roomId,
      old_price: basePrice,
      new_price: finalPrice,
      price_change_percentage: changePercentage,
      status: 'pending',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      pricing_factors: { occupancy_rate: occupancy.occupancy_rate, demand_score: occupancy.demand_score, multiplier, trigger: 'occupancy_update' }
    });

    await sendWhatsAppNotification(supabase, room, basePrice, finalPrice, occupancy);
    console.log(`⏳ Approval needed for ${room.name}`);
    return { priceUpdated: false, approvalCreated: true };
  }

  // Auto-approve ≤10% changes
  await supabase.from('rooms').update({ base_price: finalPrice }).eq('id', roomId);
  await supabase.from('pricing_adjustment_logs').insert({
    room_id: roomId,
    previous_price: basePrice,
    new_price: finalPrice,
    adjustment_reason: `Occupancy-based: ${occupancy.occupancy_rate.toFixed(1)}% (${changePercentage.toFixed(1)}% change, auto-approved)`,
    adjustment_type: 'auto'
  });

  // Update price_cache
  await supabase.from('price_cache').upsert({
    room_id: roomId,
    date: today,
    cached_price: finalPrice,
    occupancy_rate: occupancy.occupancy_rate,
    demand_score: occupancy.demand_score,
    cached_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  }, { onConflict: 'room_id,date' });

  console.log(`✅ Auto-approved: ${room.name} ${basePrice} → ${finalPrice}`);
  return { priceUpdated: true, approvalCreated: false };
}

async function sendWhatsAppNotification(supabase: ReturnType<typeof createClient>, room: Record<string, unknown>, oldPrice: number, newPrice: number, occupancy: Record<string, unknown>) {
  try {
    const { data: settings } = await supabase.from('hotel_settings').select('whatsapp_number, hotel_name').single();
    if (!settings?.whatsapp_number) return;

    const changePercent = ((newPrice - oldPrice) / oldPrice * 100);
    const direction = changePercent > 0 ? '⬆️ INCREASE' : '⬇️ DECREASE';

    const message = `🔄 *PRICE CHANGE APPROVAL NEEDED*

🏨 ${settings.hotel_name || 'Hotel'}
🛏️ Room: ${room.name}
${direction}: ${Math.abs(changePercent).toFixed(1)}%

💰 Price Details:
• Old: Rp ${oldPrice.toLocaleString('id-ID')}
• New: Rp ${newPrice.toLocaleString('id-ID')}

📊 Triggered by:
• Occupancy: ${(occupancy.occupancy_rate as number).toFixed(1)}%
• Booked: ${occupancy.booked_units}/${occupancy.total_allotment} units

🔘 Reply to approve:
APPROVE ${room.id}

🔘 Reply to reject:
REJECT ${room.id} [reason]

⏰ Expires in 30 minutes`;

    await supabase.functions.invoke('send-whatsapp', {
      body: { phone: settings.whatsapp_number, message, type: 'admin' }
    });
    console.log('📱 WhatsApp notification sent');
  } catch (error) {
    console.error('WhatsApp error:', error);
  }
}
