import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { Room } from "@/hooks/useRooms";
import type { RoomFeature } from "./types";

interface RoomCardProps {
  room: Room;
  features: RoomFeature[] | undefined;
  availability: Record<string, number> | undefined;
  onBook: (room: Room) => void;
  onTour: (room: Room) => void;
}

export default function RoomCard({ room, features, availability, onBook, onTour }: RoomCardProps) {
  const [hovered, setHovered] = useState(false);

  const availableCount = availability?.[room.id];
  const isAvailable = availableCount === undefined || availableCount > 0;

  // Filter features that this room has
  const roomFeatures = features?.filter(f => room.features?.includes(f.feature_key)) || [];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="p-2"
    >
      <Card
        className={`rounded-2xl overflow-visible transition-shadow duration-300 ${hovered ? "shadow-xl" : "shadow-md"}`}
        style={{ filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.15))" }}
      >
        <CardContent className="p-0">
          <div className="relative w-full h-52 overflow-hidden rounded-t-2xl">
            <img src={room.image_url} alt={room.name} className="w-full h-full object-cover" />

            {!isAvailable && (
              <div className="absolute top-2 left-2 bg-red-600 text-white text-sm px-3 py-1 rounded-full shadow-lg">
                Tidak Tersedia
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            <h3 className="text-lg font-semibold">{room.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>

            <div className="flex flex-wrap gap-2 mt-2">
              {roomFeatures.slice(0, 4).map((f) => (
                <span key={f.id} className="text-xs bg-secondary px-2 py-1 rounded-md">
                  {f.label}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Mulai dari</p>
                <p className="text-xl font-bold">Rp {(room.price_per_night || 0).toLocaleString('id-ID')}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onTour(room)}>
                  360° Tour
                </Button>
                <Button size="sm" disabled={!isAvailable} onClick={() => onBook(room)}>
                  Book Now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
