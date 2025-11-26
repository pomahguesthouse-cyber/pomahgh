import type { RoomCardPriceProps } from "./types";

export const RoomCardPrice = ({ room, hasPromo, displayPrice }: RoomCardPriceProps) => {
  return (
    <div className="text-right flex-shrink-0">
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
        Rp {displayPrice.toLocaleString("id-ID")}
      </p>

      <p className="text-xs text-muted-foreground">per night</p>
    </div>
  );
};
