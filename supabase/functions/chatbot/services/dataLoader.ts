import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { HotelData } from "../lib/types.ts";
import { DEFAULT_HOTEL_SETTINGS } from "../lib/types.ts";
import { cache, CACHE_KEYS, CACHE_TTL } from "../lib/cache.ts";

/**
 * Load all hotel data with caching layer
 *
 * Uses in-memory TTL cache to reduce database queries:
 * - First request: ~7 DB queries
 * - Subsequent requests (within TTL): 0 DB queries
 *
 * @param supabase - Supabase client
 * @param forceRefresh - Force fresh data fetch (bypass cache)
 */
export async function loadHotelData(supabase: SupabaseClient, forceRefresh = false): Promise<HotelData> {
  // Try cache first
  if (!forceRefresh) {
    const cached = cache.get<HotelData>(CACHE_KEYS.HOTEL_DATA);
    if (cached) {
      console.log("📦 Using cached hotel data");
      return cached;
    }
  }

  console.log("🔄 Fetching fresh hotel data from database");

  // Fetch everything in parallel (fast & scalable)
  const [
    { data: settings },
    { data: rooms },
    { data: addons },
    { data: facilities },
    { data: nearbyLocations },
    { data: knowledgeBase },
    { data: trainingExamples },
  ] = await Promise.all([
    supabase.from("hotel_settings").select("*").single(),

    supabase
      .from("rooms")
      .select("id, name, description, price_per_night, max_guests, features, size_sqm")
      .eq("available", true)
      .order("price_per_night"),

    supabase
      .from("room_addons")
      .select("id, name, description, price, price_type, category, room_id, max_quantity, extra_capacity")
      .eq("is_active", true)
      .order("display_order"),

    supabase.from("facilities").select("title, description").eq("is_active", true),

    supabase
      .from("nearby_locations")
      .select("name, category, distance_km, travel_time_minutes")
      .eq("is_active", true)
      .order("distance_km")
      .limit(10),

    supabase.from("chatbot_knowledge_base").select("title, content, category").eq("is_active", true).order("category"),

    supabase
      .from("chatbot_training_examples")
      .select("question, ideal_answer, category")
      .eq("is_active", true)
      .order("display_order"),
  ]);

  const hotelData: HotelData = {
    settings: settings || DEFAULT_HOTEL_SETTINGS,
    rooms: rooms || [],
    addons: addons || [],
    facilities: facilities || [],
    nearbyLocations: nearbyLocations || [],
    knowledgeBase: knowledgeBase || [],
    trainingExamples: trainingExamples || [],
  };

  // Cache result
  cache.set(CACHE_KEYS.HOTEL_DATA, hotelData, CACHE_TTL.HOTEL_DATA);

  console.log(`✅ Hotel data cached for ${CACHE_TTL.HOTEL_DATA / 1000}s`);

  return hotelData;
}

/**
 * Invalidate hotel data cache
 * Call this when admin updates hotel settings, rooms, etc.
 */
export function invalidateHotelDataCache(): void {
  cache.invalidate("hotel");
  console.log("🗑️ Hotel data cache invalidated");
}
