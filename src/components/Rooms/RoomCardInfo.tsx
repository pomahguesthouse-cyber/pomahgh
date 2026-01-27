import { Users, Ruler } from "lucide-react";
import type { RoomCardInfoProps } from "./types";

export const RoomCardInfo = ({ room, availability, isAvailabilityLoaded }: RoomCardInfoProps) => {
  return (
    <div className="flex-1 min-w-0 pr-2">
      <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-cormorant font-semibold tracking-wide text-foreground mb-0.5 sm:mb-1 truncate">
        {room.name}
      </h3>
      
      <div className="flex items-center gap-1 text-muted-foreground text-[10px] sm:text-xs mb-0.5 sm:mb-1">
        <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        <span>{room.max_guests} Tamu</span>
      </div>

      {room.size_sqm && (
        <div className="flex items-center gap-1 text-muted-foreground text-[10px] sm:text-xs mb-0.5 sm:mb-1">
          <Ruler className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          <span>{room.size_sqm} m²</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-1 sm:mb-2">
        {isAvailabilityLoaded && availability !== undefined && (
          availability > 0 ? (
            <span className="text-[10px] sm:text-xs font-bold animate-fade-in" style={{ color: '#1f8893' }}>
              {availability} kamar tersisa
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs font-medium text-red-500 animate-pulse">
              Tidak Tersedia
            </span>
          )
        )}
      </div>
    </div>
  );
};
