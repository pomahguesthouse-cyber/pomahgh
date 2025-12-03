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
    <Link to={`/rooms/${room.slug}`}>
      <Card className="h-[520px] flex flex-col overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
        <RoomCardImage
          room={room}
          images={images}
          hasPromo={hasPromo}
          onViewTour={onViewTour}
        />

        <CardContent className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-2">
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

          <RoomFeatures
            features={room.features}
            roomFeatures={roomFeatures}
          />

          <div className="mt-auto flex gap-2">
            <Button
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
