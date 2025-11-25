import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Room {
  id: string;
  name: string;
  slug?: string | null;
  description: string;
  price_per_night: number;
  max_guests: number;
  features: string[];
  image_url: string;
  image_urls: string[];
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
  monday_price: number | null;
  tuesday_price: number | null;
  wednesday_price: number | null;
  thursday_price: number | null;
  friday_price: number | null;
  saturday_price: number | null;
  sunday_price: number | null;
  floor_plan_url?: string | null;
  floor_plan_enabled?: boolean | null;
}

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

const getCurrentPrice = (room: Room): number => {
  const today = new Date();
  
  // Check if promo is active
  if (
    room.promo_price &&
    room.promo_start_date &&
    room.promo_end_date
  ) {
    const promoStart = new Date(room.promo_start_date);
    const promoEnd = new Date(room.promo_end_date);
    
    if (today >= promoStart && today <= promoEnd) {
      return room.promo_price;
    }
  }
  
  // Check day-of-week pricing
  const dayOfWeek = today.getDay();
  return getDayPrice(room, dayOfWeek);
};

export const useRooms = () => {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("available", true)
        .order("price_per_night", { ascending: true });

      if (error) throw error;
      
      // Calculate current price for each room
      return (data as Room[]).map(room => ({
        ...room,
        final_price: getCurrentPrice(room)
      }));
    },
  });
};
