import type { Room } from "@/hooks/useRooms";

export const checkPromo = (room: Room): boolean => {
  if (!room.promo_price || !room.promo_start_date || !room.promo_end_date) {
    return false;
  }
  const now = new Date();
  return now >= new Date(room.promo_start_date) && now <= new Date(room.promo_end_date);
};

export const getDisplayPrice = (room: Room): number => {
  return room.final_price || room.price_per_night;
};
