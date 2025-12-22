import type { RoomCardPriceProps } from "./types";
import { Badge } from "@/components/ui/badge";

export const RoomCardPrice = ({ room, hasPromo, displayPrice }: RoomCardPriceProps) => {
  // Get active promotion from room_promotions table if available
  const activePromo = (room as any).active_promotion;
  const promoBadgeText = activePromo?.badge_text || "PROMO";
  const promoBadgeColor = activePromo?.badge_color || "#EF4444";

  return (
    <div className="text-right flex-shrink-0">
      {hasPromo && activePromo && (
        <Badge 
          className="mb-1 text-white text-[10px]" 
          style={{ backgroundColor: promoBadgeColor }}
        >
          {promoBadgeText}
        </Badge>
      )}
      
      <p className="text-xs text-muted-foreground">From</p>

      {hasPromo && (
        <p className="text-xs line-through text-muted-foreground">
          Rp {room.price_per_night.toLocaleString("id-ID")}
        </p>
      )}

      <p
        className={`text-base sm:text-lg md:text-xl font-bold ${
          hasPromo ? "text-red-500" : "text-primary"
        }`}
      >
        Rp {Math.round(displayPrice).toLocaleString("id-ID")}
      </p>

      <p className="text-xs text-muted-foreground">per night</p>
    </div>
  );
};
