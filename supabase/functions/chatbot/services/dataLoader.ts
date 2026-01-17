import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { HotelData } from '../lib/types.ts';
import { DEFAULT_HOTEL_SETTINGS } from '../lib/types.ts';

/**
 * Load all hotel data in parallel for efficiency
 */
export async function loadHotelData(supabase: SupabaseClient): Promise<HotelData> {
  const [
    { data: settings },
    { data: rooms },
    { data: addons },
    { data: facilities },
    { data: nearbyLocations },
    { data: knowledgeBase },
    { data: trainingExamples }
  ] = await Promise.all([
    supabase.from("hotel_settings").select("*").single(),
    supabase.from("rooms")
      .select("id, name, description, price_per_night, max_guests, features, size_sqm")
      .eq("available", true)
      .order("price_per_night"),
    supabase.from("room_addons")
      .select("id, name, description, price, price_type, category, room_id, max_quantity, extra_capacity")
      .eq("is_active", true)
      .order("display_order"),
    supabase.from("facilities")
      .select("title, description")
      .eq("is_active", true),
    supabase.from("nearby_locations")
      .select("name, category, distance_km, travel_time_minutes")
      .eq("is_active", true)
      .order("distance_km")
      .limit(10),
    supabase.from("chatbot_knowledge_base")
      .select("title, content, category")
      .eq("is_active", true)
      .order("category"),
    supabase.from("chatbot_training_examples")
      .select("question, ideal_answer, category")
      .eq("is_active", true)
      .order("display_order")
  ]);

  return {
    settings: settings || DEFAULT_HOTEL_SETTINGS,
    rooms: rooms || [],
    addons: addons || [],
    facilities: facilities || [],
    nearbyLocations: nearbyLocations || [],
    knowledgeBase: knowledgeBase || [],
    trainingExamples: trainingExamples || []
  };
}
