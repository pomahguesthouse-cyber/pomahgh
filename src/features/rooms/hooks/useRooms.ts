/**
 * useRooms hook
 * Fetches all available rooms with active promotions
 */
import { useQuery } from "@tanstack/react-query";
import { roomService } from "../services";
import { roomMapper } from "../mappers";

export const useRooms = () => {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const rooms = await roomService.getAll();
      return rooms;
    },
  });
};
