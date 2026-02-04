import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoomCardInfo } from "./RoomCardInfo";
import { RoomCardPrice } from "./RoomCardPrice";
import { RoomFeatures } from "./RoomFeatures";
import type { RoomCardProps } from "./types";
import familyChoiceIcon from "@/assets/family-choice-icon.png";
import { useState } from "react";

export const RoomCard = ({
  room,
  hasPromo,
  displayPrice,
  images,
  availability,
  isAvailabilityLoaded,
  roomFeatures,
  isBestPrice,
  hasDateRange,
  onBookRoom,
}: RoomCardProps) => {
  const isUnavailable = isAvailabilityLoaded && availability !== undefined && availability === 0;
  const [isHovered, setIsHovered] = useState(false);

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
          overflow-visible 
          shadow-[0_2px_10px_rgba(0,0,0,0.08)]
          hover:shadow-[0_12px_28px_rgba(0,0,0,0.14)]
        "
      >
        {/* IMAGE */}
        <div className="overflow-hidden h-60 sm:h-64 rounded-t-2xl relative">
          <img
            src={images?.[0] || "/placeholder.png"}
            alt={room.name}
            className="
              w-full h-full object-cover 
              transition-transform duration-700 
              group-hover:scale-110
            "
          />
          
          {/* Family Choice Badge - untuk kamar >= 4 tamu */}
          {room.max_guests >= 4 && (
            <div className="absolute bottom-2 left-2 z-10">
              <img 
                src={familyChoiceIcon} 
                alt="Family Choice" 
                className="w-20 h-auto drop-shadow-lg"
              />
            </div>
          )}
        </div>

        <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
          {/* TITLE + PRICE */}
          <div className="flex justify-between items-start">
            <RoomCardInfo room={room} availability={availability} isAvailabilityLoaded={isAvailabilityLoaded} />
            <RoomCardPrice room={room} hasPromo={hasPromo} displayPrice={displayPrice} isBestPrice={isBestPrice} hasDateRange={hasDateRange} />
          </div>

          {/* DESCRIPTION */}
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{room.description}</p>

          {/* FEATURES */}
          <div className="flex-grow">
            <RoomFeatures features={room.features} roomFeatures={roomFeatures} />
          </div>

          {/* BUTTON */}
          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all duration-200 overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => {
              e.preventDefault();
              onBookRoom(room);
            }}
            disabled={isUnavailable}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={isUnavailable ? "unavailable" : hasDateRange ? "select" : "check"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {isUnavailable 
                  ? "Tidak Tersedia" 
                  : hasDateRange 
                    ? "Pilih Kamar" 
                    : "Cek Ketersediaan"}
              </motion.span>
            </AnimatePresence>
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
};
