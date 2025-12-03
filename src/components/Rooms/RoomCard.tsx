import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoomCardInfo } from "./RoomCardInfo";
import { RoomCardPrice } from "./RoomCardPrice";
import { RoomFeatures } from "./RoomFeatures";
import type { RoomCardProps } from "./types";

export const RoomCard = ({
  room,
  hasPromo,
  displayPrice,
  images,
  availability,
  isAvailabilityLoaded,
  roomFeatures,
  onBookRoom,
}: RoomCardProps) => {
  const isUnavailable = isAvailabilityLoaded && availability !== undefined && availability === 0;

  const slug = room.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <Link to={`/rooms/${slug}`} className="block">
      <Card
        className="
          relative
          transition-all duration-300 
          hover:-translate-y-2 
          cursor-pointer group
          rounded-2xl
          bg-white

          /* IMPORTANT: do NOT clip shadow */
          overflow-visible 
          shadow-[0_2px_10px_rgba(0,0,0,0.08)]
          hover:shadow-[0_12px_28px_rgba(0,0,0,0.14)]
        "
      >
        {/* IMAGE */}
        <div className="overflow-hidden h-60 sm:h-64 rounded-t-2xl">
          <img
            src={images?.[0] || "/placeholder.png"}
            alt={room.name}
            className="
              w-full h-full object-cover 
              transition-transform duration-700 
              group-hover:scale-110
            "
          />
        </div>

        <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
          {/* TITLE + PRICE */}
          <div className="flex justify-between items-start">
            <RoomCardInfo room={room} availability={availability} isAvailabilityLoaded={isAvailabilityLoaded} />
            <RoomCardPrice room={room} hasPromo={hasPromo} displayPrice={displayPrice} />
          </div>

          {/* DESCRIPTION */}
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{room.description}</p>

          {/* FEATURES */}
          <div className="flex-grow">
            <RoomFeatures features={room.features} roomFeatures={roomFeatures} />
          </div>

          {/* BUTTON */}
          <Button
            className="
              w-full 
              bg-gradient-to-r from-amber-500 to-yellow-400 
              text-black font-semibold 
              shadow-lg hover:shadow-xl 
              hover:brightness-110 
              active:scale-[0.98] 
              transition-all duration-200
            "
            onClick={(e) => {
              e.preventDefault(); // prevent link navigation
              onBookRoom(room);
            }}
            disabled={isUnavailable}
          >
            {isUnavailable ? "Tidak Tersedia" : "Cek Ketersediaan"}
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
};
