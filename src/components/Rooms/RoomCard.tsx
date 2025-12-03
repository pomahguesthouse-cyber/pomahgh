import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [openQuickView, setOpenQuickView] = useState(false);

  const isUnavailable = isAvailabilityLoaded && availability !== undefined && availability === 0;

  const slug = room.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <>
      {/* CARD WRAPPER */}
      <Link to={`/rooms/${slug}`}>
        <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full cursor-pointer group">
          {/* IMAGE WITH ZOOM */}
          <div className="overflow-hidden">
            <img
              src={images?.[0] || "/placeholder.png"}
              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>

          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex justify-between items-start mb-2 sm:mb-3">
              <RoomCardInfo room={room} availability={availability} isAvailabilityLoaded={isAvailabilityLoaded} />

              <RoomCardPrice room={room} hasPromo={hasPromo} displayPrice={displayPrice} />
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">{room.description}</p>

            <RoomFeatures features={room.features} roomFeatures={roomFeatures} />

            {/* BUTTONS */}
            <div className="flex gap-2 mt-4">
              {/* QUICK VIEW */}
              <Button
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenQuickView(true);
                }}
              >
                Quick View
              </Button>

              {/* PREMIUM BOOK BUTTON */}
              <Button
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all duration-200"
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

      {/* QUICK VIEW MODAL */}
      <Dialog open={openQuickView} onOpenChange={setOpenQuickView}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{room.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <img src={images?.[0] || "/placeholder.png"} className="w-full h-56 object-cover rounded-lg" />

            <p className="text-sm text-muted-foreground">{room.description}</p>

            <RoomFeatures features={room.features} roomFeatures={roomFeatures} />

            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold shadow-lg hover:brightness-110 transition-all duration-200 active:scale-[0.98]"
              onClick={() => onBookRoom(room)}
            >
              Book Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
