import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [openQuickView, setOpenQuickView] = useState(false);

  const isUnavailable = isAvailabilityLoaded && availability !== undefined && availability === 0;

  const slug = room.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <>
      <Link to={`/rooms/${slug}`}>
        <Card
          className="
            overflow-hidden 
            transition-all duration-300 
            hover:-translate-y-2 
            h-[520px]                 /* 🔥 fix tinggi card */
            cursor-pointer group
            shadow-[0_2px_10px_rgba(0,0,0,0.08)] 
            hover:shadow-[0_12px_28px_rgba(0,0,0,0.14)]  /* ✨ soft Airbnb shadow */
            rounded-2xl
          "
        >
          {/* IMAGE HEIGHT LEBIH PANJANG */}
          <div className="overflow-hidden h-72">
            <img
              src={images?.[0] || "/placeholder.png"}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>

          <CardContent className="p-4 sm:p-6 flex flex-col h-[calc(520px-18rem)]">
            <div className="flex justify-between items-start mb-2">
              <RoomCardInfo room={room} availability={availability} isAvailabilityLoaded={isAvailabilityLoaded} />
              <RoomCardPrice room={room} hasPromo={hasPromo} displayPrice={displayPrice} />
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2 flex-shrink-0">
              {room.description}
            </p>

            {/* FEATURES */}
            <div className="flex-grow overflow-hidden">
              <RoomFeatures features={room.features} roomFeatures={roomFeatures} />
            </div>

            {/* BUTTONS */}
            <div className="flex gap-2 mt-4">
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

              <Button
                className="
                  flex-1 
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
              className="
                w-full bg-gradient-to-r from-amber-500 to-yellow-400 
                text-black font-semibold shadow-lg hover:brightness-110 
                transition-all duration-200 active:scale-[0.98]
              "
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
