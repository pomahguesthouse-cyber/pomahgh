import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RoomPriceAnalysis {
  room_id: string;
  room_name: string;
  our_price: number;
  competitor_avg: number;
  competitor_min: number;
  competitor_max: number;
  survey_count: number;
  price_position: 'budget' | 'competitive' | 'premium';
  position_percentage: number;
  recommendation: string;
  suggested_price: number;
}

interface RoomPromotion {
  id: string;
  room_id: string;
  promo_price: number | null;
  discount_percentage: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  priority: number;
}

// Helper: Get price for a specific day of the week
const getDayPrice = (room: any, dayOfWeek: number): number => {
  const dayPrices = [
    room.sunday_price,
    room.monday_price,
    room.tuesday_price,
    room.wednesday_price,
    room.thursday_price,
    room.friday_price,
    room.saturday_price,
  ];
  return dayPrices[dayOfWeek] || room.price_per_night;
};

// Helper: Calculate current price with promotions and day-of-week pricing
const getCurrentPrice = (room: any, activePromo?: RoomPromotion | null): number => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Priority 1: Active promotion from room_promotions table
  if (activePromo) {
    if (activePromo.promo_price) return activePromo.promo_price;
    if (activePromo.discount_percentage) {
      const basePrice = getDayPrice(room, today.getDay());
      return Math.round(basePrice * (1 - activePromo.discount_percentage / 100));
    }
  }

  // Priority 2: Legacy promo fields on rooms table
  if (room.promo_price && room.promo_start_date && room.promo_end_date) {
    if (todayStr >= room.promo_start_date && todayStr <= room.promo_end_date) {
      return room.promo_price;
    }
  }

  // Priority 3: Day-of-week pricing
  return getDayPrice(room, today.getDay());
};

export const usePriceAnalysis = () => {
  const { data: analysis = [], isLoading, error, refetch } = useQuery({
    queryKey: ['price-analysis'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch our rooms with all pricing fields
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select(`
          id, name, base_price, price_per_night, 
          min_auto_price, max_auto_price, auto_pricing_enabled,
          promo_price, promo_start_date, promo_end_date,
          monday_price, tuesday_price, wednesday_price, 
          thursday_price, friday_price, saturday_price, sunday_price
        `)
        .eq('available', true);

      if (roomsError) throw roomsError;

      // 2. Fetch active promotions
      const { data: promotions } = await supabase
        .from('room_promotions')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('priority', { ascending: false });

      // Map promotions to rooms (first one wins due to priority ordering)
      const promosByRoom = new Map<string, RoomPromotion>();
      promotions?.forEach((promo) => {
        if (!promosByRoom.has(promo.room_id)) {
          promosByRoom.set(promo.room_id, promo as RoomPromotion);
        }
      });

      // 3. Fetch competitor rooms with mapping
      const { data: competitorRooms, error: compError } = await supabase
        .from('competitor_rooms')
        .select('id, comparable_room_id')
        .eq('is_active', true)
        .not('comparable_room_id', 'is', null);

      if (compError) throw compError;

      // 4. Get surveys from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fromDate = sevenDaysAgo.toISOString().split('T')[0];

      const { data: surveys, error: surveyError } = await supabase
        .from('competitor_price_surveys')
        .select('competitor_room_id, price')
        .gte('survey_date', fromDate);

      if (surveyError) throw surveyError;

      // 5. Build analysis per room
      const results: RoomPriceAnalysis[] = [];

      for (const room of rooms || []) {
        // Find competitor rooms mapped to this room
        const mappedCompRoomIds = (competitorRooms || [])
          .filter(cr => cr.comparable_room_id === room.id)
          .map(cr => cr.id);

        // Get surveys for these competitor rooms
        const relevantSurveys = (surveys || [])
          .filter(s => mappedCompRoomIds.includes(s.competitor_room_id))
          .map(s => Number(s.price));

        // Calculate final price with promotions and day-of-week pricing
        const activePromo = promosByRoom.get(room.id);
        const ourPrice = getCurrentPrice(room, activePromo);

        if (relevantSurveys.length === 0) {
          results.push({
            room_id: room.id,
            room_name: room.name,
            our_price: ourPrice,
            competitor_avg: 0,
            competitor_min: 0,
            competitor_max: 0,
            survey_count: 0,
            price_position: 'competitive',
            position_percentage: 100,
            recommendation: 'Tidak ada data kompetitor',
            suggested_price: ourPrice
          });
          continue;
        }

        const competitorAvg = relevantSurveys.reduce((a, b) => a + b, 0) / relevantSurveys.length;
        const competitorMin = Math.min(...relevantSurveys);
        const competitorMax = Math.max(...relevantSurveys);
        const positionPercentage = (ourPrice / competitorAvg) * 100;

        let pricePosition: 'budget' | 'competitive' | 'premium';
        let recommendation: string;
        let suggestedPrice: number;

        if (positionPercentage < 85) {
          pricePosition = 'budget';
          recommendation = 'Harga terlalu rendah, pertimbangkan menaikkan harga';
          suggestedPrice = Math.round((competitorAvg * 0.9) / 10000) * 10000;
        } else if (positionPercentage > 115) {
          pricePosition = 'premium';
          recommendation = 'Harga premium, pastikan value sesuai atau pertimbangkan penyesuaian';
          suggestedPrice = Math.round((competitorAvg * 1.05) / 10000) * 10000;
        } else {
          pricePosition = 'competitive';
          recommendation = 'Harga kompetitif dengan pasar';
          suggestedPrice = ourPrice;
        }

        // Apply min/max constraints
        if (room.min_auto_price && suggestedPrice < room.min_auto_price) {
          suggestedPrice = room.min_auto_price;
        }
        if (room.max_auto_price && suggestedPrice > room.max_auto_price) {
          suggestedPrice = room.max_auto_price;
        }

        results.push({
          room_id: room.id,
          room_name: room.name,
          our_price: ourPrice,
          competitor_avg: Math.round(competitorAvg),
          competitor_min: competitorMin,
          competitor_max: competitorMax,
          survey_count: relevantSurveys.length,
          price_position: pricePosition,
          position_percentage: Math.round(positionPercentage),
          recommendation,
          suggested_price: suggestedPrice
        });
      }

      return results;
    }
  });

  return {
    analysis,
    isLoading,
    error,
    refetch
  };
};