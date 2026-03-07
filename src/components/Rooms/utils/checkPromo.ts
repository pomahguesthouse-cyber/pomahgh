import type { Room } from "@/hooks/useRooms";
import { calculateDynamicPrice } from "./calculateDynamicPrice";

export const checkPromo = (room: Room): boolean => {
  // Check if there's an active promotion from room_promotions table
  return !!room.active_promotion;
};

export const getDisplayPrice = (room: Room): number => {
  return room.final_price || room.price_per_night;
};

export const getDynamicDisplayPrice = (
  room: Room,
  checkIn?: Date | null,
  checkOut?: Date | null
): { price: number; hasDateRange: boolean } => {
  const activePromo = room.active_promotion;
  const result = calculateDynamicPrice(room, checkIn, checkOut, activePromo);
  return { price: result.averagePrice, hasDateRange: result.hasDateRange };
};
