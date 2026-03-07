import type { Room, RoomPromotion } from "@/hooks/useRooms";
import { eachDayOfInterval } from "date-fns";

/**
 * Get the price for a single night based on the room's pricing_priority order.
 * The first pricing source in the priority list that has an active value wins.
 */
const getNightPrice = (
  basePrice: number,
  activePromo: RoomPromotion | null | undefined,
  nightStr: string,
  pricingPriority: string[]
): number => {
  for (const source of pricingPriority) {
    switch (source) {
      case "promo":
        if (activePromo && nightStr >= activePromo.start_date && nightStr <= activePromo.end_date) {
          if (activePromo.promo_price) return activePromo.promo_price;
          if (activePromo.discount_percentage) return basePrice * (1 - activePromo.discount_percentage / 100);
        }
        break;
      case "dynamic":
        // Dynamic pricing would be resolved here if active
        // Currently handled externally via price_cache
        break;
      case "base":
      default:
        return basePrice;
    }
  }
  return basePrice;
};

export const calculateDynamicPrice = (
  room: Room,
  checkIn?: Date | null,
  checkOut?: Date | null,
  activePromo?: RoomPromotion | null
): { averagePrice: number; hasDateRange: boolean } => {
  const basePrice = room.price_per_night;
  const pricingPriority = (room as any).pricing_priority || ["base", "promo", "dynamic"];

  if (!checkIn || !checkOut) {
    const todayStr = new Date().toISOString().split("T")[0];
    const price = getNightPrice(basePrice, activePromo, todayStr, pricingPriority);
    return { averagePrice: price, hasDateRange: false };
  }

  const checkOutMinusOne = new Date(checkOut);
  checkOutMinusOne.setDate(checkOutMinusOne.getDate() - 1);

  if (checkOutMinusOne < checkIn) {
    return { averagePrice: basePrice, hasDateRange: true };
  }

  const nights = eachDayOfInterval({ start: checkIn, end: checkOutMinusOne });
  let totalPrice = 0;

  for (const night of nights) {
    const nightStr = night.toISOString().split("T")[0];
    totalPrice += getNightPrice(basePrice, activePromo, nightStr, pricingPriority);
  }

  return { averagePrice: totalPrice / nights.length, hasDateRange: true };
};
