// Optimized Rooms Hook - Safe for Lovable.dev
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

// Re-export types from original
export type { Room, RoomPromotion } from '@/hooks/useRooms';

// Optimized getCurrentPrice function with memoization
const getCurrentPrice = useMemo(() => (room: any, activePromo?: any): number => {
  const today = new Date();
  
  // First priority: Check room_promotions table
  if (activePromo) {
    if (activePromo.promo_price) {
      return activePromo.promo_price;
    }
    if (activePromo.discount_percentage) {
      return room.price_per_night * (1 - activePromo.discount_percentage / 100);
    }
  }
  
  // Second priority: Check legacy promo fields
  if (room.promo_price && room.promo_start_date && room.promo_end_date) {
    const promoStart = new Date(room.promo_start_date);
    const promoEnd = new Date(room.promo_end_date);
    
    if (today >= promoStart && today <= promoEnd) {
      return room.promo_price;
    }
  }
  
  // Third priority: Check day-of-week pricing
  const dayOfWeek = today.getDay();
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
}, []);

// Optimized hook with better caching
export const useRoomsOptimized = () => {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      // Fetch rooms with specific fields (better than "*")
      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select(`
          id, name, slug, description, price_per_night, max_guests,
          features, image_url, image_urls, virtual_tour_url, available,
          size_sqm, room_count, room_numbers, allotment, base_price,
          final_price, promo_price, promo_start_date, promo_end_date,
          monday_price, tuesday_price, wednesday_price, thursday_price,
          friday_price, saturday_price, sunday_price
        `)
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

      // Optimized promotion mapping using Map for O(1) lookup
      const promosByRoom = new Map<string, any>();
      promotions?.forEach((promo) => {
        if (!promosByRoom.has(promo.room_id)) {
          promosByRoom.set(promo.room_id, promo);
        }
      });
      
      // Calculate current price for each room
      return rooms.map((room: any) => {
        const activePromo = promosByRoom.get(room.id) || null;
        return {
          ...room,
          active_promotion: activePromo,
          final_price: getCurrentPrice(room, activePromo)
        };
      });
    },
    // Better caching for performance
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};