import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { HotelData } from '../lib/types.ts';
import { DEFAULT_HOTEL_SETTINGS } from '../lib/types.ts';
import { cache, CACHE_KEYS, CACHE_TTL, getOrLoad } from '../lib/cache.ts';

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
export async function loadHotelData(
  supabase: SupabaseClient, 
  forceRefresh = false
): Promise<HotelData> {
  
  // Try to get from cache first
  if (!forceRefresh) {
    const cached = cache.get<HotelData>(CACHE_KEYS.HOTEL_DATA);
    if (cached) {
      console.log('📦 Using cached hotel data');
      return cached;
    }
  }

  console.log('🔄 Fetching fresh hotel data from database');

  // Parallel fetch all data
  const [
    { data: settings },
    { data: rooms },
    { data: addons },
    { data: facilities },
    { data: nearbyLocations },
    { data: knowledgeBase },
    { data: trainingExamples },
    { data: faqPatternsRaw },
    { data: insightsRaw }
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
      .select("title, content, category, summary")
      .eq("is_active", true)
      .order("category"),
    supabase.from("chatbot_training_examples")
      .select("question, ideal_answer, category")
      .eq("is_active", true)
      .order("display_order"),
    // FAQ patterns from WhatsApp learning (top patterns with responses)
    supabase.from("whatsapp_faq_patterns")
      .select("canonical_question, best_response, category, occurrence_count")
      .not("best_response", "is", null)
      .eq("is_promoted_to_training", false)
      .gte("occurrence_count", 2)
      .order("occurrence_count", { ascending: false })
      .limit(10),
    // Top improvement suggestions from recent conversation insights
    supabase.from("whatsapp_conversation_insights")
      .select("suggested_improvements")
      .not("suggested_improvements", "eq", "[]")
      .order("analyzed_at", { ascending: false })
      .limit(10)
  ]);

  // Extract unique high-priority improvement suggestions
  const improvementMap = new Map<string, { area: string; suggestion: string; priority: string }>();
  for (const insight of (insightsRaw || [])) {
    const improvements = insight.suggested_improvements as Array<{ area: string; suggestion: string; priority: string }>;
    if (Array.isArray(improvements)) {
      for (const imp of improvements) {
        if (imp.area && imp.suggestion && (imp.priority === 'high' || imp.priority === 'medium')) {
          const key = imp.area.toLowerCase();
          if (!improvementMap.has(key)) {
            improvementMap.set(key, imp);
          }
        }
      }
    }
  }

  const hotelData: HotelData = {
    settings: settings || DEFAULT_HOTEL_SETTINGS,
    rooms: rooms || [],
    addons: addons || [],
    facilities: facilities || [],
    nearbyLocations: nearbyLocations || [],
    knowledgeBase: knowledgeBase || [],
    trainingExamples: trainingExamples || [],
    faqPatterns: (faqPatternsRaw || []).filter((p: { best_response: string | null }) => p.best_response),
    learningInsights: Array.from(improvementMap.values()).slice(0, 5),
  };

  // Cache the result
  cache.set(CACHE_KEYS.HOTEL_DATA, hotelData, CACHE_TTL.HOTEL_DATA);
  console.log(`✅ Hotel data cached for ${CACHE_TTL.HOTEL_DATA / 1000}s`);

  return hotelData;
}

/**
 * Invalidate hotel data cache
 * Call this when admin updates hotel settings, rooms, etc.
 */
export function invalidateHotelDataCache(): void {
  cache.invalidate('hotel');
  console.log('🗑️ Hotel data cache invalidated');
}
