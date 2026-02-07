// Pricing Event Processor
// Cron job to process pricing events queue every 5 minutes
// Edge Function: pricing-processor

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingResult {
  events_processed: number;
  prices_updated: number;
  approvals_created: number;
  errors: number;
  processing_time_ms: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting pricing event processor...');

    // Get unprocessed events with high priority first
    const { data: events, error: fetchError } = await supabase
      .from('pricing_events')
      .select('*')
      .eq('processed', false)
      .lt('retry_count', 3)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      console.error('❌ Error fetching pricing events:', fetchError);
      throw fetchError;
    }

    if (!events || events.length === 0) {
      console.log('✅ No unprocessed pricing events');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No events to process',
          result: {
            events_processed: 0,
            prices_updated: 0,
            approvals_created: 0,
            errors: 0,
            processing_time_ms: Date.now() - startTime
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${events.length} pricing events to process`);

    let processed = 0;
    let pricesUpdated = 0;
    let approvalsCreated = 0;
    let errors = 0;

    // Process each event
    for (const event of events) {
      try {
        console.log(`⚙️ Processing event ${event.id} (type: ${event.event_type}, priority: ${event.priority})`);

        // Mark as processing
        await supabase
          .from('pricing_events')
          .update({
            processing_started_at: new Date().toISOString(),
            status: 'processing'
          })
          .eq('id', event.id);

        // Handle different event types
        switch (event.event_type) {
          case 'booking_change':
          case 'occupancy_update':
            const occupancyResult = await processOccupancyEvent(supabase, event);
            if (occupancyResult.priceUpdated) pricesUpdated++;
            if (occupancyResult.approvalCreated) approvalsCreated++;
            break;

          case 'competitor_change':
            const competitorResult = await processCompetitorEvent(supabase, event);
            if (competitorResult.priceUpdated) pricesUpdated++;
            if (competitorResult.approvalCreated) approvalsCreated++;
            break;

          case 'time_trigger':
            await processTimeTrigger(supabase, event);
            break;

          case 'manual_override':
            await processManualOverride(supabase, event);
            break;

          default:
            console.log(`⚠️ Unknown event type: ${event.event_type}`);
        }

        // Mark as completed
        await supabase
          .from('pricing_events')
          .update({
            processed: true,
            processing_completed_at: new Date().toISOString(),
            status: 'completed'
          })
          .eq('id', event.id);

        processed++;
        console.log(`✅ Event ${event.id} processed successfully`);

      } catch (error) {
        console.error(`❌ Error processing event ${event.id}:`, error);
        errors++;
        
        // Update event with error
        await supabase
          .from('pricing_events')
          .update({
            processed: false,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            retry_count: event.retry_count + 1,
            status: event.retry_count + 1 >= 3 ? 'failed' : 'pending'
          })
          .eq('id', event.id);
      }
    }

    const result: ProcessingResult = {
      events_processed: processed,
      prices_updated: pricesUpdated,
      approvals_created: approvalsCreated,
      errors: errors,
      processing_time_ms: Date.now() - startTime
    };

    console.log('✅ Pricing processor completed:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processed} events, ${pricesUpdated} prices updated, ${approvalsCreated} approvals created`,
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Pricing processor error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Process occupancy-based pricing event
async function processOccupancyEvent(supabase: any, event: any): Promise<{ priceUpdated: boolean; approvalCreated: boolean }> {
  const roomId = event.room_id;
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`🏨 Processing occupancy event for room ${roomId}`);

  // Get current room data
  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, base_price, price_per_night, min_auto_price, max_auto_price, auto_pricing_enabled')
    .eq('id', roomId)
    .single();

  if (!room) {
    throw new Error(`Room not found: ${roomId}`);
  }

  if (!room.auto_pricing_enabled) {
    console.log(`⏭️ Auto-pricing disabled for room ${room.name}`);
    return { priceUpdated: false, approvalCreated: false };
  }

  // Calculate real-time occupancy
  const { data: occupancyData } = await supabase.rpc('calculate_real_time_occupancy', {
    p_room_id: roomId,
    p_date: today
  });

  if (!occupancyData || occupancyData.length === 0) {
    throw new Error('Failed to calculate occupancy');
  }

  const occupancy = occupancyData[0];
  console.log(`📊 Occupancy for ${room.name}: ${occupancy.occupancy_rate.toFixed(1)}% (${occupancy.booked_units}/${occupancy.total_allotment})`);

  // Calculate new price based on occupancy
  let multiplier = 1.0;
  if (occupancy.occupancy_rate >= 95) multiplier = 1.5;
  else if (occupancy.occupancy_rate >= 85) multiplier = 1.3;
  else if (occupancy.occupancy_rate >= 70) multiplier = 1.15;
  else if (occupancy.occupancy_rate <= 30) multiplier = 0.85;

  const basePrice = room.base_price || room.price_per_night;
  const newPrice = Math.round((basePrice * multiplier) / 10000) * 10000;

  console.log(`💰 Price calculation: ${basePrice} x ${multiplier} = ${newPrice}`);

  // Check if price actually changed
  if (newPrice === basePrice) {
    console.log(`⏭️ Price unchanged (${newPrice})`);
    return { priceUpdated: false, approvalCreated: false };
  }

  // Apply min/max constraints
  let finalPrice = newPrice;
  if (room.min_auto_price && finalPrice < room.min_auto_price) {
    finalPrice = room.min_auto_price;
    console.log(`📏 Constrained to min price: ${finalPrice}`);
  }
  if (room.max_auto_price && finalPrice > room.max_auto_price) {
    finalPrice = room.max_auto_price;
    console.log(`📏 Constrained to max price: ${finalPrice}`);
  }

  // Calculate change percentage
  const changePercentage = Math.abs((finalPrice - basePrice) / basePrice * 100);
  console.log(`📈 Price change: ${changePercentage.toFixed(1)}%`);

  // Check if approval is needed (> 10% change)
  if (changePercentage > 10) {
    console.log(`🔄 Creating price approval request (${changePercentage.toFixed(1)}% > 10%)`);
    
    // Create approval request
    await supabase
      .from('price_approvals')
      .insert({
        room_id: roomId,
        old_price: basePrice,
        new_price: finalPrice,
        price_change_percentage: changePercentage,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        pricing_factors: {
          occupancy_rate: occupancy.occupancy_rate,
          demand_score: occupancy.demand_score,
          trigger: 'occupancy_update'
        }
      });

    // Send WhatsApp notification
    await sendWhatsAppApprovalNotification(supabase, room, basePrice, finalPrice, occupancy);

    return { priceUpdated: false, approvalCreated: true };
  }

  // Auto-approve small changes
  console.log(`✅ Auto-approving price change (${changePercentage.toFixed(1)}% <= 10%)`);
  
  // Update room price
  await supabase
    .from('rooms')
    .update({ base_price: finalPrice })
    .eq('id', roomId);

  // Log the adjustment
  await supabase
    .from('pricing_adjustment_logs')
    .insert({
      room_id: roomId,
      previous_price: basePrice,
      new_price: finalPrice,
      competitor_avg_price: 0,
      adjustment_reason: `Occupancy-based: ${occupancy.occupancy_rate.toFixed(1)}% (${changePercentage.toFixed(1)}% change)`,
      adjustment_type: 'auto'
    });

  // Update price cache
  await supabase.rpc('update_price_cache', {
    p_room_id: roomId,
    p_date: today,
    p_price_per_night: finalPrice,
    p_base_price: basePrice,
    p_occupancy_rate: occupancy.occupancy_rate,
    p_competitor_avg_price: 0,
    p_pricing_factors: {
      occupancy_rate: occupancy.occupancy_rate,
      demand_score: occupancy.demand_score,
      multiplier: multiplier
    },
    p_valid_minutes: 15
  });

  return { priceUpdated: true, approvalCreated: false };
}

// Process competitor-based pricing event
async function processCompetitorEvent(supabase: any, event: any): Promise<{ priceUpdated: boolean; approvalCreated: boolean }> {
  // Similar to occupancy event but based on competitor price changes
  console.log(`🏢 Processing competitor event for room ${event.room_id}`);
  
  // Implementation similar to processOccupancyEvent
  // Uses competitor average price from surveys
  
  return { priceUpdated: false, approvalCreated: false };
}

// Process time-based trigger
async function processTimeTrigger(supabase: any, event: any): Promise<void> {
  console.log(`⏰ Processing time trigger for room ${event.room_id}`);
  
  // Recalculate pricing based on time of day, day of week, etc.
  // This could be used for scheduled price updates
}

// Process manual override
async function processManualOverride(supabase: any, event: any): Promise<void> {
  console.log(`👤 Processing manual override for room ${event.room_id}`);
  
  // Log manual price changes
  // Create approval if needed
}

// Send WhatsApp approval notification
async function sendWhatsAppApprovalNotification(
  supabase: any, 
  room: any, 
  oldPrice: number, 
  newPrice: number,
  occupancy: any
): Promise<void> {
  try {
    const { data: settings } = await supabase
      .from('hotel_settings')
      .select('whatsapp_number, hotel_name')
      .single();

    if (!settings?.whatsapp_number) {
      console.log('⚠️ No WhatsApp number configured for approvals');
      return;
    }

    const changePercent = ((newPrice - oldPrice) / oldPrice * 100);
    const direction = changePercent > 0 ? '⬆️ INCREASE' : '⬇️ DECREASE';

    const message = `🔄 *PRICE CHANGE APPROVAL NEEDED*

🏨 ${settings.hotel_name}
🛏️ Room: ${room.name}
${direction}: ${Math.abs(changePercent).toFixed(1)}%

💰 Price Details:
• Old: Rp ${oldPrice.toLocaleString('id-ID')}
• New: Rp ${newPrice.toLocaleString('id-ID')}
• Diff: Rp ${Math.abs(newPrice - oldPrice).toLocaleString('id-ID')}

📊 Triggered by:
• Occupancy: ${occupancy.occupancy_rate.toFixed(1)}%
• Booked: ${occupancy.booked_units}/${occupancy.total_allotment} units

🔘 Reply to approve:
APPROVE ${room.id}

🔘 Reply to reject:
REJECT ${room.id} [reason]

⏰ Expires in 30 minutes

_Auto-generated by pricing system_`;

    // Invoke send-whatsapp function
    await supabase.functions.invoke('send-whatsapp', {
      body: {
        phone: settings.whatsapp_number,
        message: message,
        type: 'admin'
      }
    });

    console.log(`📱 WhatsApp approval notification sent to ${settings.whatsapp_number}`);

  } catch (error) {
    console.error('❌ Error sending WhatsApp notification:', error);
    // Don't throw - approval record already created
  }
}
