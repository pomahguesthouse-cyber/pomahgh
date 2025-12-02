import { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { Booking } from "../types";
import { toast } from "sonner";

interface DragData {
  booking: Booking;
  sourceRoomNumber: string;
  sourceRoomId: string;
}

interface DropData {
  roomId: string;
  roomNumber: string;
  date: Date;
}

interface Room {
  id: string;
  name: string;
  room_numbers?: string[];
}

export const useDragDrop = (
  rooms: Room[],
  onBookingMove: (booking: Booking, newRoomId: string, newRoomNumber: string) => void
) => {
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    if (data?.booking) {
      setActiveBooking(data.booking);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBooking(null);

    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as DropData;

    if (!dragData?.booking || !dropData?.roomNumber) return;

    // Skip if dropped on same room
    if (dragData.sourceRoomNumber === dropData.roomNumber) return;

    // Check room type compatibility (same room type only)
    const sourceRoom = rooms.find(r => r.id === dragData.sourceRoomId);
    const targetRoom = rooms.find(r => r.id === dropData.roomId);

    if (sourceRoom?.name !== targetRoom?.name) {
      toast.error("Hanya bisa pindah ke kamar dengan tipe yang sama");
      return;
    }

    // Trigger the move callback
    onBookingMove(dragData.booking, dropData.roomId, dropData.roomNumber);
  };

  return {
    activeBooking,
    handleDragStart,
    handleDragEnd,
  };
};
