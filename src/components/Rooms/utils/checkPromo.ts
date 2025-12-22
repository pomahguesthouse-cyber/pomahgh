import type { Room } from "@/hooks/useRooms";

export const checkPromo = (room: Room): boolean => {
  // First check if there's an active promotion from room_promotions table
  if ((room as any).active_promotion) {
    return true;
  }
  
  // Fallback to legacy promo fields on rooms table
  if (!room.promo_price || !room.promo_start_date || !room.promo_end_date) {
    return false;
  }
  const now = new Date();
  return now >= new Date(room.promo_start_date) && now <= new Date(room.promo_end_date);
};

export const getDisplayPrice = (room: Room): number => {
  return room.final_price || room.price_per_night;
};
