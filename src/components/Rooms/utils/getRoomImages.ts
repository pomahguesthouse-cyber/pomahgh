import deluxeRoom from "@/assets/room-deluxe.jpg";
import villaRoom from "@/assets/room-villa.jpg";
import type { Room } from "@/hooks/room/useRooms";

const fallbackImages: Record<string, string> = {
  "Deluxe Ocean View": deluxeRoom,
  "Private Pool Villa": villaRoom,
};

export const getRoomImages = (room: Room): string[] => {
  if (room.image_urls && room.image_urls.length > 0) {
    return room.image_urls;
  }
  return [fallbackImages[room.name] || room.image_url];
};












