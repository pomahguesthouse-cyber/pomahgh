import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoomCardImage } from "./RoomCardImage";
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
  onViewTour,
}: RoomCardProps) => {
  const isUnavailable = isAvailabilityLoaded && availability !== undefined && availability === 0;

  return (
    <Link to={`/rooms/${room.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
      <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full cursor-pointer">
        <RoomCardImage
          room={room}
          images={images}
          hasPromo={hasPromo}
          onViewTour={onViewTour}
        />

        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex justify-between items-start mb-2 sm:mb-3">
            <RoomCardInfo
              room={room}
              availability={availability}
              isAvailabilityLoaded={isAvailabilityLoaded}
            />

            <RoomCardPrice
              room={room}
              hasPromo={hasPromo}
              displayPrice={displayPrice}
            />
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
            {room.description}
          </p>

          <RoomFeatures features={room.features} roomFeatures={roomFeatures} />

          <div className="flex gap-2">
            <Button 
              variant="luxury" 
              className="flex-1" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBookRoom(room);
              }}
              disabled={isUnavailable}
            >
              {isUnavailable ? "Tidak Tersedia" : "Book Now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
