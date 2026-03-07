/**
 * useRoomDetail hook
 * Fetches a single room by slug with active promotions
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RoomPromotion } from "../types";

const getCurrentPrice = (room: Record<string, unknown>, activePromo?: RoomPromotion | null): number => {
  const basePrice = room.price_per_night as number;

  if (activePromo) {
    const todayStr = new Date().toISOString().split("T")[0];
    if (todayStr >= activePromo.start_date && todayStr <= activePromo.end_date) {
      if (activePromo.promo_price) {
        return activePromo.promo_price;
      }
      if (activePromo.discount_percentage) {
        return basePrice * (1 - activePromo.discount_percentage / 100);
      }
    }
  }

  return basePrice;
};

export const useRoomDetail = (roomSlug: string) => {
  return useQuery({
    queryKey: ["room-detail", roomSlug],
    queryFn: async () => {
      const { data: room, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("slug", roomSlug)
        .maybeSingle();

      if (error) throw error;
      if (!room) throw new Error("Room not found");

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
