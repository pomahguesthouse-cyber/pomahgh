import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RoomPromotion {
  id: string;
  room_id: string;
  name: string;
  description: string | null;
  promo_price: number | null;
  discount_percentage: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  min_nights: number;
  promo_code: string | null;
  badge_text: string;
  badge_color: string;
  priority: number;
}

export interface Room {
  id: string;
  name: string;
  slug?: string | null;
  description: string;
  price_per_night: number;
  max_guests: number;
  features: string[];
  image_url: string;
  image_urls: string[] | null;
  virtual_tour_url: string | null;
  available: boolean;
  size_sqm: number | null;
  room_count: number;
  room_numbers: string[] | null;
  allotment: number;
  base_price: number | null;
  final_price: number | null;
  transition_effect?: string | null;
  floor_plan_url?: string | null;
  floor_plan_enabled?: boolean | null;
  is_non_refundable?: boolean | null;
  updated_at?: string;
  created_at?: string;
  active_promotion?: RoomPromotion | null;
  pricing_priority?: string[];
}

const getCurrentPrice = (room: Room, activePromo?: RoomPromotion | null): number => {
  const priority = room.pricing_priority || ["base", "promo", "dynamic"];
  
  for (const source of priority) {
    switch (source) {
      case "promo":
        if (activePromo) {
          if (activePromo.promo_price) return activePromo.promo_price;
          if (activePromo.discount_percentage) return room.price_per_night * (1 - activePromo.discount_percentage / 100);
        }
        break;
      case "dynamic":
        // Dynamic pricing resolved externally
        break;
      case "base":
      default:
        return room.price_per_night;
    }
  }
  return room.price_per_night;
};

export const useRooms = () => {
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
      
      // Fetch active promotions
      const { data: promotions, error: promosError } = await supabase
        .from("room_promotions")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("priority", { ascending: false });

      if (promosError) throw promosError;

      const promosByRoom = new Map<string, RoomPromotion>();
      promotions?.forEach((promo) => {
        if (!promosByRoom.has(promo.room_id)) {
          promosByRoom.set(promo.room_id, promo as RoomPromotion);
        }
      });
      
      return (rooms as Room[]).map(room => {
        const activePromo = promosByRoom.get(room.id) || null;
        return {
          ...room,
          active_promotion: activePromo,
          final_price: getCurrentPrice(room, activePromo)
        };
      });
    },
  });
};
