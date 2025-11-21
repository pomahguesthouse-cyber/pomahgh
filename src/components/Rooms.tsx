import { useRooms } from "@/hooks/useRooms";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useState } from "react";

// Skeleton Loader
const RoomSkeleton = () => (
  <div className="w-full p-4 animate-pulse">
    <div className="h-40 bg-gray-200 rounded-2xl mb-4" />
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
  </div>
);

// Room Card Component
const RoomCard = ({ room }) => {
  const [loaded, setLoaded] = useState(false);
  const { name, price, images, availableRooms } = room;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-2"
    >
      <Card className="rounded-3xl shadow-xl hover:shadow-2xl transition-all overflow-hidden w-[92%] mx-auto">
        <CardContent className="p-4">
          <div className="relative w-full h-40 overflow-hidden rounded-xl mb-3 shadow-lg">
            <img
              src={images?.[0]}
              alt={name}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={(e) => {
                e.target.src = "/placeholder.jpg";
                setLoaded(true);
              }}
            />
          </div>

          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-lg">{name}</h3>
            {availableRooms <= 2 && (
              <Badge className="bg-red-500 text-white animate-pulse">Sisa {availableRooms}</Badge>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-2">Mulai dari:</p>
          <p className="font-bold text-xl">Rp {price.toLocaleString()}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main Rooms Component
export default function Rooms() {
  const { rooms, isLoading } = useRooms();

  // FIX: auto-handled loading block
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <RoomSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
      {rooms?.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  );
}
