import type { Room, RoomPromotion } from "@/hooks/useRooms";
import { eachDayOfInterval } from "date-fns";

export const calculateDynamicPrice = (
  room: Room,
  checkIn?: Date | null,
  checkOut?: Date | null,
  activePromo?: RoomPromotion | null
): { averagePrice: number; hasDateRange: boolean } => {
  const basePrice = room.price_per_night;
  
  // Jika tidak ada tanggal, gunakan harga dasar + cek promo hari ini
  if (!checkIn || !checkOut) {
    const todayStr = new Date().toISOString().split("T")[0];
    
    if (activePromo && todayStr >= activePromo.start_date && todayStr <= activePromo.end_date) {
      if (activePromo.promo_price) {
        return { averagePrice: activePromo.promo_price, hasDateRange: false };
      }
      if (activePromo.discount_percentage) {
        return { 
          averagePrice: basePrice * (1 - activePromo.discount_percentage / 100), 
          hasDateRange: false 
        };
      }
    }
    
    return { averagePrice: basePrice, hasDateRange: false };
  }

  // Hitung harga rata-rata untuk rentang tanggal
  const checkOutMinusOne = new Date(checkOut);
  checkOutMinusOne.setDate(checkOutMinusOne.getDate() - 1);
  
  if (checkOutMinusOne < checkIn) {
    return { averagePrice: basePrice, hasDateRange: true };
  }
  
  const nights = eachDayOfInterval({ start: checkIn, end: checkOutMinusOne });
  
  let totalPrice = 0;
  for (const night of nights) {
    const nightStr = night.toISOString().split("T")[0];
    let nightPrice = basePrice;
    
    // Cek promo untuk malam ini
    if (activePromo && nightStr >= activePromo.start_date && nightStr <= activePromo.end_date) {
      if (activePromo.promo_price) {
        nightPrice = activePromo.promo_price;
      } else if (activePromo.discount_percentage) {
        nightPrice = nightPrice * (1 - activePromo.discount_percentage / 100);
      }
    }
    
    totalPrice += nightPrice;
  }

  return { averagePrice: totalPrice / nights.length, hasDateRange: true };
};
