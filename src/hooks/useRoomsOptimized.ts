// Optimized Rooms Hook - Simplified pricing
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type { Room, RoomPromotion } from '@/hooks/useRooms';

const getCurrentPrice = (room: any, activePromo?: any): number => {
  if (activePromo) {
    if (activePromo.promo_price) return activePromo.promo_price;
    if (activePromo.discount_percentage) {
      return room.price_per_night * (1 - activePromo.discount_percentage / 100);
    }
  }
  return room.price_per_night;
};

export const useRoomsOptimized = () => {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select("*")
        .eq("available", true)
        .order("price_per_night", { ascending: true });

      if (roomsError) throw roomsError;
      
      const { data: promotions, error: promosError } = await supabase
        .from("room_promotions")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("priority", { ascending: false });

      if (promosError) throw promosError;

      const promosByRoom = new Map<string, any>();
      promotions?.forEach((promo) => {
        if (!promosByRoom.has(promo.room_id)) {
          promosByRoom.set(promo.room_id, promo);
        }
      });
      
      return rooms.map((room: any) => {
        const activePromo = promosByRoom.get(room.id) || null;
        return {
          ...room,
          active_promotion: activePromo,
          final_price: getCurrentPrice(room, activePromo)
        };
      });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};
