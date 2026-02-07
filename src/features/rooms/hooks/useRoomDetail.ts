/**
 * useRoomDetail hook
 * Fetches a single room by slug with active promotions
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RoomPromotion } from "../types";

// Helper function to get day-of-week price
const getDayPrice = (room: Record<string, unknown>, dayOfWeek: number): number => {
  const dayPrices = [
    room.sunday_price as number | null,
    room.monday_price as number | null,
    room.tuesday_price as number | null,
    room.wednesday_price as number | null,
    room.thursday_price as number | null,
    room.friday_price as number | null,
    room.saturday_price as number | null,
  ];
  return dayPrices[dayOfWeek] || (room.price_per_night as number);
};

// Calculate current price with promo
const getCurrentPrice = (room: Record<string, unknown>, activePromo?: RoomPromotion | null): number => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0] as string;
  const dayOfWeek = today.getDay();
  const basePrice = getDayPrice(room, dayOfWeek);

  // Check active promotion from room_promotions table
  if (activePromo) {
    if (todayStr >= activePromo.start_date && todayStr <= activePromo.end_date) {
      if (activePromo.promo_price) {
        return activePromo.promo_price;
      }
      if (activePromo.discount_percentage) {
        return basePrice * (1 - activePromo.discount_percentage / 100);
      }
    }
  }

  // Fallback to legacy promo on rooms table
  if (room.promo_price && room.promo_start_date && room.promo_end_date) {
    if (todayStr >= (room.promo_start_date as string) && todayStr <= (room.promo_end_date as string)) {
      return room.promo_price as number;
    }
  }

  return basePrice;
};

export const useRoomDetail = (roomSlug: string) => {
  return useQuery({
    queryKey: ["room-detail", roomSlug],
    queryFn: async () => {
      // Fetch room data
      const { data: room, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("slug", roomSlug)
        .maybeSingle();

      if (error) throw error;
      if (!room) throw new Error("Room not found");

      // Fetch active promotions for this room
      const today = new Date().toISOString().split("T")[0];
      const { data: promotions } = await supabase
        .from("room_promotions")
        .select("*")
        .eq("room_id", room.id)
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("priority", { ascending: false });

      const activePromo = promotions && promotions.length > 0 ? promotions[0] as unknown as RoomPromotion : null;
      const finalPrice = getCurrentPrice(room as unknown as Record<string, unknown>, activePromo);

      return {
        ...room,
        active_promotion: activePromo,
        final_price: finalPrice
      };
    },
    enabled: !!roomSlug
  });
};
