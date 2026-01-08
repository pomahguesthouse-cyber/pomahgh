import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoomWithPricing {
  id: string;
  name: string;
  base_price: number | null;
  price_per_night: number;
  min_auto_price: number | null;
  max_auto_price: number | null;
  auto_pricing_enabled: boolean;
}

interface CompetitorSurvey {
  price: number;
  competitor_room_id: string;
}

interface PricingResult {
  room_id: string;
  room_name: string;
  previous_price: number;
  new_price: number;
  competitor_avg: number;
  reason: string;
  updated: boolean;
}

const calculateRecommendedPrice = (
  currentPrice: number,
  competitorAvg: number,
  minPrice: number | null,
  maxPrice: number | null
): { newPrice: number; reason: string } => {
  // Target: 5% below competitor average to be competitive
  let targetPrice = competitorAvg * 0.95;
  let reason = `Target 5% di bawah rata-rata kompetitor (Rp ${Math.round(competitorAvg).toLocaleString('id-ID')})`;

  // Apply min/max boundaries
  if (minPrice && targetPrice < minPrice) {
    targetPrice = minPrice;
    reason = `Dibatasi harga minimum (Rp ${minPrice.toLocaleString('id-ID')})`;
  } else if (maxPrice && targetPrice > maxPrice) {
    targetPrice = maxPrice;
    reason = `Dibatasi harga maksimum (Rp ${maxPrice.toLocaleString('id-ID')})`;
  }

  // Round to nearest 10000 (Indonesian pricing convention)
  const newPrice = Math.round(targetPrice / 10000) * 10000;

  return { newPrice, reason };
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting auto-pricing process...');

    // 1. Fetch rooms with auto-pricing enabled
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, name, base_price, price_per_night, min_auto_price, max_auto_price, auto_pricing_enabled')
      .eq('auto_pricing_enabled', true);

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
      throw roomsError;
    }

    if (!rooms || rooms.length === 0) {
      console.log('No rooms with auto-pricing enabled');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No rooms with auto-pricing enabled',
          results: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${rooms.length} rooms with auto-pricing enabled`);

    const results: PricingResult[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    for (const room of rooms as RoomWithPricing[]) {
      console.log(`Processing room: ${room.name} (${room.id})`);

      // 2. Find competitor rooms mapped to this room
      const { data: competitorRooms, error: compRoomsError } = await supabase
        .from('competitor_rooms')
        .select('id')
        .eq('comparable_room_id', room.id)
        .eq('is_active', true);

      if (compRoomsError) {
        console.error(`Error fetching competitor rooms for ${room.name}:`, compRoomsError);
        continue;
      }

      if (!competitorRooms || competitorRooms.length === 0) {
        console.log(`No competitor rooms mapped for ${room.name}`);
        results.push({
          room_id: room.id,
          room_name: room.name,
          previous_price: room.base_price || room.price_per_night,
          new_price: room.base_price || room.price_per_night,
          competitor_avg: 0,
          reason: 'Tidak ada kamar kompetitor yang ter-mapping',
          updated: false
        });
        continue;
      }

      const competitorRoomIds = competitorRooms.map(cr => cr.id);

      // 3. Get price surveys from last 7 days
      const { data: surveys, error: surveysError } = await supabase
        .from('competitor_price_surveys')
        .select('price, competitor_room_id')
        .in('competitor_room_id', competitorRoomIds)
        .gte('survey_date', sevenDaysAgoStr);

      if (surveysError) {
        console.error(`Error fetching surveys for ${room.name}:`, surveysError);
        continue;
      }

      if (!surveys || surveys.length === 0) {
        console.log(`No recent surveys for ${room.name}`);
        results.push({
          room_id: room.id,
          room_name: room.name,
          previous_price: room.base_price || room.price_per_night,
          new_price: room.base_price || room.price_per_night,
          competitor_avg: 0,
          reason: 'Tidak ada data survey 7 hari terakhir',
          updated: false
        });
        continue;
      }

      // 4. Calculate average competitor price
      const totalPrice = (surveys as CompetitorSurvey[]).reduce((sum, s) => sum + Number(s.price), 0);
      const competitorAvg = totalPrice / surveys.length;

      console.log(`Competitor average for ${room.name}: Rp ${competitorAvg.toLocaleString('id-ID')}`);

      // 5. Calculate recommended price
      const currentPrice = room.base_price || room.price_per_night;
      const { newPrice, reason } = calculateRecommendedPrice(
        currentPrice,
        competitorAvg,
        room.min_auto_price,
        room.max_auto_price
      );

      // 6. Update price if different
      const priceChanged = newPrice !== currentPrice;
      
      if (priceChanged) {
        console.log(`Updating ${room.name} price: Rp ${currentPrice.toLocaleString('id-ID')} -> Rp ${newPrice.toLocaleString('id-ID')}`);
        
        const { error: updateError } = await supabase
          .from('rooms')
          .update({ base_price: newPrice })
          .eq('id', room.id);

        if (updateError) {
          console.error(`Error updating price for ${room.name}:`, updateError);
          continue;
        }

        // 7. Log the adjustment
        const { error: logError } = await supabase
          .from('pricing_adjustment_logs')
          .insert({
            room_id: room.id,
            previous_price: currentPrice,
            new_price: newPrice,
            competitor_avg_price: competitorAvg,
            adjustment_reason: reason,
            adjustment_type: 'auto'
          });

        if (logError) {
          console.error(`Error logging adjustment for ${room.name}:`, logError);
        }
      }

      results.push({
        room_id: room.id,
        room_name: room.name,
        previous_price: currentPrice,
        new_price: newPrice,
        competitor_avg: competitorAvg,
        reason,
        updated: priceChanged
      });
    }

    const updatedCount = results.filter(r => r.updated).length;
    console.log(`Auto-pricing complete. ${updatedCount}/${results.length} rooms updated.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Auto-pricing selesai. ${updatedCount} kamar diupdate.`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto-pricing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});