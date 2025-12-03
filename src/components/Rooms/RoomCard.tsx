import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function RoomCard({ room, features, availability, onBook, onTour }) {
  const [hovered, setHovered] = useState(false);

  const isAvailable = availability?.[room.id]?.is_available;

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
            <img src={room.image} alt={room.name} className="w-full h-full object-cover" />

            {!isAvailable && (
              <div className="absolute top-2 left-2 bg-red-600 text-white text-sm px-3 py-1 rounded-full shadow-lg">
                Not Available
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            <h3 className="text-lg font-semibold">{room.name}</h3>
            <p className="text-sm text-gray-600">{room.description}</p>

            <div className="flex flex-wrap gap-2 mt-2">
              {features?.[room.id]?.map((f, i) => (
                <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded-md">
                  {f.name}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <div>
                <p className="text-sm text-gray-500">Start from</p>
                <p className="text-xl font-bold">Rp {room.price.toLocaleString()}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onTour(room)}>
                  Virtual Tour
                </Button>
                <Button disabled={!isAvailable} onClick={() => onBook(room)}>
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
