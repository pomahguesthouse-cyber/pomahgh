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

export const usePriceAnalysis = () => {
  const { data: analysis = [], isLoading, error, refetch } = useQuery({
    queryKey: ['price-analysis'],
    queryFn: async () => {
      // 1. Fetch our rooms
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name, base_price, price_per_night, min_auto_price, max_auto_price, auto_pricing_enabled')
        .eq('available', true);

      if (roomsError) throw roomsError;

      // 2. Fetch competitor rooms with mapping
      const { data: competitorRooms, error: compError } = await supabase
        .from('competitor_rooms')
        .select('id, comparable_room_id')
        .eq('is_active', true)
        .not('comparable_room_id', 'is', null);

      if (compError) throw compError;

      // 3. Get surveys from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fromDate = sevenDaysAgo.toISOString().split('T')[0];

      const { data: surveys, error: surveyError } = await supabase
        .from('competitor_price_surveys')
        .select('competitor_room_id, price')
        .gte('survey_date', fromDate);

      if (surveyError) throw surveyError;

      // 4. Build analysis per room
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

        const ourPrice = room.base_price || room.price_per_night;

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