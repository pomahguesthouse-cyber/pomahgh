import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_CHANGE_THRESHOLD = 10; // 10% threshold

interface PriceSurvey {
  id: string;
  competitor_room_id: string;
  price: number;
  survey_date: string;
  competitor_room?: {
    id: string;
    room_name: string;
    comparable_room_id: string | null;
    competitor_hotel?: {
      name: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting price change check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all competitor rooms with their latest 2 surveys
    const { data: competitorRooms, error: roomsError } = await supabase
      .from("competitor_rooms")
      .select(`
        id,
        room_name,
        comparable_room_id,
        competitor_hotel:competitor_hotels(name)
      `)
      .eq("is_active", true);

    if (roomsError) {
      console.error("Error fetching competitor rooms:", roomsError);
      throw roomsError;
    }

    console.log(`Found ${competitorRooms?.length || 0} active competitor rooms`);

    const notifications: {
      competitor_room_id: string;
      previous_price: number;
      new_price: number;
      price_change_percent: number;
      our_room_id: string | null;
    }[] = [];

    // For each competitor room, get the latest 2 surveys
    for (const room of competitorRooms || []) {
      const { data: surveys, error: surveysError } = await supabase
        .from("competitor_price_surveys")
        .select("id, price, survey_date")
        .eq("competitor_room_id", room.id)
        .order("survey_date", { ascending: false })
        .limit(2);

      if (surveysError) {
        console.error(`Error fetching surveys for room ${room.id}:`, surveysError);
        continue;
      }

      // Need at least 2 surveys to compare
      if (!surveys || surveys.length < 2) {
        continue;
      }

      const latestPrice = Number(surveys[0].price);
      const previousPrice = Number(surveys[1].price);

      if (previousPrice === 0) continue;

      const priceChangePercent = ((latestPrice - previousPrice) / previousPrice) * 100;

      console.log(`Room ${room.room_name}: ${previousPrice} -> ${latestPrice} (${priceChangePercent.toFixed(1)}%)`);

      // Check if change exceeds threshold (either direction)
      if (Math.abs(priceChangePercent) >= PRICE_CHANGE_THRESHOLD) {
        // Check if we already have a notification for this exact change
        const { data: existingNotif } = await supabase
          .from("price_change_notifications")
          .select("id")
          .eq("competitor_room_id", room.id)
          .eq("previous_price", previousPrice)
          .eq("new_price", latestPrice)
          .single();

        if (!existingNotif) {
          notifications.push({
            competitor_room_id: room.id,
            previous_price: previousPrice,
            new_price: latestPrice,
            price_change_percent: Math.round(priceChangePercent * 10) / 10,
            our_room_id: room.comparable_room_id,
          });

          console.log(`Created notification for ${room.room_name}: ${priceChangePercent.toFixed(1)}% change`);
        }
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("price_change_notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
        throw insertError;
      }

      console.log(`Inserted ${notifications.length} new notifications`);
    } else {
      console.log("No significant price changes detected");
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notifications.length,
        message: notifications.length > 0 
          ? `Created ${notifications.length} price change notifications`
          : "No significant price changes detected",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-price-changes:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
