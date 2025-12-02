import { useMemo } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { RoomInfo } from "../types";

export const useCalendarData = () => {
  const { bookings, updateBooking, isUpdating } = useAdminBookings();
  const { rooms } = useAdminRooms();
  const { unavailableDates, addUnavailableDates, removeUnavailableDates } = useRoomAvailability();

  // Group rooms by type - transform to RoomInfo format
  const roomsByType = useMemo<Record<string, RoomInfo[]>>(() => {
    if (!rooms) return {};
    const grouped: Record<string, RoomInfo[]> = {};
    rooms.forEach((room) => {
      if (!grouped[room.name]) {
        grouped[room.name] = [];
      }
      // Transform room_numbers into RoomInfo objects
      if (room.room_numbers && room.room_numbers.length > 0) {
        room.room_numbers.forEach((num) => {
          grouped[room.name].push({
            roomType: room.name,
            roomNumber: num,
            roomId: room.id,
          });
        });
      }
    });
    return grouped;
  }, [rooms]);

  // Get all room numbers
  const allRoomNumbers = useMemo<RoomInfo[]>(() => {
    if (!rooms) return [];
    const roomNums: RoomInfo[] = [];
    rooms.forEach((room) => {
      if (room.room_numbers && room.room_numbers.length > 0) {
        room.room_numbers.forEach((num) => {
          roomNums.push({
            roomType: room.name,
            roomNumber: num,
            roomId: room.id,
          });
        });
      }
    });
    return roomNums;
  }, [rooms]);

  return {
    bookings,
    rooms,
    roomsByType,
    allRoomNumbers,
    unavailableDates,
    updateBooking,
    isUpdating,
    addUnavailableDates,
    removeUnavailableDates,
  };
};
