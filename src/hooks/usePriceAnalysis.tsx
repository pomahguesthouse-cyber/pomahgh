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

interface RoomWithPricing {
  id: string;
  name: string;
  price_per_night: number;
  min_auto_price: number | null;
  max_auto_price: number | null;
}

const getCurrentPrice = (room: RoomWithPricing, activePromo?: RoomPromotion | null): number => {
  if (activePromo) {
    if (activePromo.promo_price) return activePromo.promo_price;
    if (activePromo.discount_percentage) {
      return Math.round(room.price_per_night * (1 - activePromo.discount_percentage / 100));
    }
  }
  return room.price_per_night;
};

export const usePriceAnalysis = () => {
  const { data: analysis = [], isLoading, error, refetch } = useQuery({
    queryKey: ['price-analysis'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name, price_per_night, min_auto_price, max_auto_price')
        .eq('available', true);

      if (roomsError) throw roomsError;

      const { data: promotions } = await supabase
        .from('room_promotions')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('priority', { ascending: false });

      const promosByRoom = new Map<string, RoomPromotion>();
      promotions?.forEach((promo) => {
        if (!promosByRoom.has(promo.room_id)) {
          promosByRoom.set(promo.room_id, promo as RoomPromotion);
        }
      });

      const { data: competitorRooms, error: compError } = await supabase
        .from('competitor_rooms')
        .select('id, comparable_room_id')
        .eq('is_active', true)
        .not('comparable_room_id', 'is', null);

      if (compError) throw compError;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fromDate = sevenDaysAgo.toISOString().split('T')[0];

      const { data: surveys, error: surveyError } = await supabase
        .from('competitor_price_surveys')
        .select('competitor_room_id, price')
        .gte('survey_date', fromDate);

      if (surveyError) throw surveyError;

      const results: RoomPriceAnalysis[] = [];

      for (const room of rooms || []) {
        const mappedCompRoomIds = (competitorRooms || [])
          .filter(cr => cr.comparable_room_id === room.id)
          .map(cr => cr.id);

        const relevantSurveys = (surveys || [])
          .filter(s => mappedCompRoomIds.includes(s.competitor_room_id))
          .map(s => Number(s.price));

        const activePromo = promosByRoom.get(room.id);
        const ourPrice = getCurrentPrice(room, activePromo);

        if (relevantSurveys.length === 0) {
          results.push({
            room_id: room.id, room_name: room.name, our_price: ourPrice,
            competitor_avg: 0, competitor_min: 0, competitor_max: 0, survey_count: 0,
            price_position: 'competitive', position_percentage: 100,
            recommendation: 'Tidak ada data kompetitor', suggested_price: ourPrice
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

        if (room.min_auto_price && suggestedPrice < room.min_auto_price) suggestedPrice = room.min_auto_price;
        if (room.max_auto_price && suggestedPrice > room.max_auto_price) suggestedPrice = room.max_auto_price;

        results.push({
          room_id: room.id, room_name: room.name, our_price: ourPrice,
          competitor_avg: Math.round(competitorAvg), competitor_min: competitorMin,
          competitor_max: competitorMax, survey_count: relevantSurveys.length,
          price_position: pricePosition, position_percentage: Math.round(positionPercentage),
          recommendation, suggested_price: suggestedPrice
        });
      }

      return results;
    }
  });

  return { analysis, isLoading, error, refetch };
};
