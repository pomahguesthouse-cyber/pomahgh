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
          h-[540px]
          cursor-pointer group
          rounded-2xl
          shadow-[0_3px_10px_rgba(0,0,0,0.06)]
          hover:shadow-[0_12px_28px_rgba(0,0,0,0.13)]
          bg-white
        "
      >
        {/* IMAGE */}
        <div className="overflow-hidden h-72 relative">
          <img
            src={images?.[0] || "/placeholder.png"}
            className="
              w-full h-full object-cover 
              transition-transform duration-700 
              group-hover:scale-110
            "
          />

          {/* BADGE UNAVAILABLE */}
          {isUnavailable && (
            <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-3 py-1 rounded-full shadow-md">
              Tidak Tersedia
            </div>
          )}
        </div>

        {/* CONTENT */}
        <CardContent className="p-5 flex flex-col h-[calc(540px-18rem)]">
          {/* TITLE + PRICE */}
          <div className="flex justify-between items-start mb-2">
            <RoomCardInfo room={room} availability={availability} isAvailabilityLoaded={isAvailabilityLoaded} />
            <RoomCardPrice room={room} hasPromo={hasPromo} displayPrice={displayPrice} />
          </div>

          {/* DESCRIPTION */}
          <p
            className="
    text-sm text-muted-foreground 
    mb-3 
    line-clamp-2
    overflow-hidden
  "
          >
            {room.description}
          </p>

          {/* FEATURES – tampil penuh, tidak di modal */}
          <div className="flex-grow overflow-y-hidden">
            <RoomFeatures features={room.features} roomFeatures={roomFeatures} layout="compact" />
          </div>

          {/* ACTION BUTTON */}
          <Button
            className="
              w-full mt-4 
              bg-gradient-to-r from-amber-500 to-yellow-400
              text-black font-semibold shadow-lg 
              hover:shadow-xl hover:brightness-110 
              active:scale-[0.98] transition-all duration-200
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
