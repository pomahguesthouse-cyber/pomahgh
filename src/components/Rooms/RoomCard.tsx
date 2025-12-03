import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoomCardInfo } from "./RoomCardInfo";
import { RoomCardPrice } from "./RoomCardPrice";
import { RoomFeatures } from "./RoomFeatures";
import type { RoomCardProps } from "./types";

export default function RoomCard({
  room,
  hasPromo,
  displayPrice,
  images,
  availability,
  isAvailabilityLoaded,
  roomFeatures,
  onBookRoom,
}: RoomCardProps) {
  const slug = room.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const isUnavailable = isAvailabilityLoaded && availability === 0;

  return (
    <Card
      className="
        overflow-hidden rounded-2xl bg-white
        shadow-[0_2px_10px_rgba(0,0,0,0.06)]
        hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]
        transition-all duration-300 hover:-translate-y-1
        flex flex-col h-[600px]
      "
    >
      {/* --- IMAGE + LINK --- */}
      <Link to={`/rooms/${slug}`} className="block relative">
        {/* BADGES */}
        {hasPromo && (
          <Badge className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full z-20">Promo</Badge>
        )}

        {isUnavailable && (
          <Badge className="absolute top-3 right-3 bg-gray-800 text-white px-3 py-1 rounded-full z-20">Sold Out</Badge>
        )}

        {/* IMAGE */}
        <div className="h-64 overflow-hidden relative">
          <img
            src={images?.[0] || "/placeholder.png"}
            alt={room.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />

          {/* GRADIENT OVERLAY */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
        </div>
      </Link>

      {/* --- CONTENT AREA --- */}
      <CardContent className="p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* TITLE & PRICE */}
          <div className="flex justify-between items-start mb-4">
            <RoomCardInfo room={room} availability={availability} isAvailabilityLoaded={isAvailabilityLoaded} />
            <RoomCardPrice room={room} hasPromo={hasPromo} displayPrice={displayPrice} />
          </div>

          {/* DESCRIPTION */}
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{room.description}</p>

          {/* FEATURES */}
          <RoomFeatures features={room.features} roomFeatures={roomFeatures} />
        </div>

        {/* BUTTON */}
        <Button
          className="
            w-full mt-5
            bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold
            shadow-lg hover:shadow-xl hover:brightness-110
            active:scale-[0.98] transition-all
            py-5 rounded-xl
          "
          onClick={(e) => {
            e.stopPropagation();
            onBookRoom(room);
          }}
          disabled={isUnavailable}
        >
          {isUnavailable ? "Tidak Tersedia" : "Book Now"}
        </Button>
      </CardContent>
    </Card>
  );
}
