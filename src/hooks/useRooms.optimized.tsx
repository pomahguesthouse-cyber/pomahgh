import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

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
  promo_price: number | null;
  promo_start_date: string | null;
  promo_end_date: string | null;
  // Add other price fields...
  active_promotion?: RoomPromotion | null;
}

// Optimized memoized price calculation
const getDayPrice = (room: Room, dayOfWeek: number): number => {
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

// Memoized current price calculation
const getCurrentPrice = useMemo(() => (room: Room, activePromo?: RoomPromotion | null): number => {
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
  return getDayPrice(room, dayOfWeek);
}, []);

export const useRooms = () => {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      // Fetch rooms with specific fields only
      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select(`
          id, name, slug, description, price_per_night, max_guests, 
          features, image_url, image_urls, virtual_tour_url, available,
          size_sqm, room_count, room_numbers, allotment, base_price,
          final_price, promo_price, promo_start_date, promo_end_date,
          sunday_price, monday_price, tuesday_price, wednesday_price,
          thursday_price, friday_price, saturday_price
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

      // Optimized promotion mapping using Map
      const promosByRoom = new Map<string, RoomPromotion>();
      promotions?.forEach((promo) => {
        if (!promosByRoom.has(promo.room_id)) {
          promosByRoom.set(promo.room_id, promo as RoomPromotion);
        }
      });
      
      // Calculate current price for each room
      return (rooms as Room[]).map(room => {
        const activePromo = promosByRoom.get(room.id) || null;
        return {
          ...room,
          active_promotion: activePromo,
          final_price: getCurrentPrice(room, activePromo)
        };
      });
    },
    // Cache configuration
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};