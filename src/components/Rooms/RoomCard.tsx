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
    <Link to={`/rooms/${slug}`}>
      <Card
        className="
          overflow-hidden 
          transition-all duration-300 
          hover:-translate-y-2 
          cursor-pointer group
          shadow-[0_2px_10px_rgba(0,0,0,0.08)]
          hover:shadow-[0_12px_28px_rgba(0,0,0,0.14)]
          rounded-2xl
          bg-white
          flex flex-col
        "
      >
        {/* IMAGE */}
        <div className="overflow-hidden h-64 flex-shrink-0">
          <img
            src={images?.[0] || "/placeholder.png"}
            alt={room.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </div>
        {/* CONTENT */}
        <CardContent className="p-4 sm:p-6 flex flex-col flex-grow">
          {/* TITLE + PRICE */}
          <div className="flex justify-between items-start mb-3 gap-4">
            <RoomCardInfo room={room} availability={availability} isAvailabilityLoaded={isAvailabilityLoaded} />
            <RoomCardPrice room={room} hasPromo={hasPromo} displayPrice={displayPrice} />
          </div>

          {/* DESCRIPTION */}
          <div className="mb-4 min-h-[60px]">
            <p className="text-sm text-muted-foreground leading-relaxed">{room.description}</p>
          </div>

          {/* FEATURES */}
          <div className="mb-4 flex-grow">
            <RoomFeatures features={room.features} roomFeatures={roomFeatures} />
          </div>

          {/* BUTTON */}
          <Button
            className="
              w-full 
              bg-gradient-to-r from-amber-500 to-yellow-400 
              text-black 
              font-semibold 
              shadow-lg 
              hover:shadow-xl 
              hover:brightness-110 
              active:scale-[0.98] 
              transition-all 
              duration-200
              mt-auto
            "
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBookRoom(room);
            }}
            disabled={isUnavailable}
          >
            {isUnavailable ? "Tidak Tersedia" : "Book Now"}
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
};
