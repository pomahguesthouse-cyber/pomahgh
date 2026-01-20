import type { Room, RoomPromotion } from "@/hooks/room/useRooms";
import { eachDayOfInterval, getDay } from "date-fns";

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

export const calculateDynamicPrice = (
  room: Room,
  checkIn?: Date | null,
  checkOut?: Date | null,
  activePromo?: RoomPromotion | null
): { averagePrice: number; hasDateRange: boolean } => {
  const today = new Date();
  
  // Jika tidak ada tanggal, gunakan harga HARI INI
  if (!checkIn || !checkOut) {
    const dayOfWeek = today.getDay();
    const todayStr = today.toISOString().split("T")[0];
    
    // Cek promo aktif untuk hari ini
    if (activePromo) {
      if (todayStr >= activePromo.start_date && todayStr <= activePromo.end_date) {
        if (activePromo.promo_price) {
          return { averagePrice: activePromo.promo_price, hasDateRange: false };
        }
        if (activePromo.discount_percentage) {
          const basePrice = getDayPrice(room, dayOfWeek);
          return { 
            averagePrice: basePrice * (1 - activePromo.discount_percentage / 100), 
            hasDateRange: false 
          };
        }
      }
    }
    
    // Cek legacy promo untuk hari ini
    if (room.promo_price && room.promo_start_date && room.promo_end_date) {
      if (todayStr >= room.promo_start_date && todayStr <= room.promo_end_date) {
        return { averagePrice: room.promo_price, hasDateRange: false };
      }
    }
    
    return { averagePrice: getDayPrice(room, dayOfWeek), hasDateRange: false };
  }

  // Hitung harga rata-rata untuk rentang tanggal
  const checkOutMinusOne = new Date(checkOut);
  checkOutMinusOne.setDate(checkOutMinusOne.getDate() - 1);
  
  if (checkOutMinusOne < checkIn) {
    return { averagePrice: getDayPrice(room, checkIn.getDay()), hasDateRange: true };
  }
  
  const nights = eachDayOfInterval({ start: checkIn, end: checkOutMinusOne });
  
  let totalPrice = 0;
  for (const night of nights) {
    const dayOfWeek = getDay(night);
    const nightStr = night.toISOString().split("T")[0];
    let nightPrice = getDayPrice(room, dayOfWeek);
    
    // Cek promo untuk malam ini
    if (activePromo && nightStr >= activePromo.start_date && nightStr <= activePromo.end_date) {
      if (activePromo.promo_price) {
        nightPrice = activePromo.promo_price;
      } else if (activePromo.discount_percentage) {
        nightPrice = nightPrice * (1 - activePromo.discount_percentage / 100);
      }
    } else if (room.promo_price && room.promo_start_date && room.promo_end_date) {
      if (nightStr >= room.promo_start_date && nightStr <= room.promo_end_date) {
        nightPrice = room.promo_price;
      }
    }
    
    totalPrice += nightPrice;
  }

  return { averagePrice: totalPrice / nights.length, hasDateRange: true };
};












