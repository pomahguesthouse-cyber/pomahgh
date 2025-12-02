import { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { format, addDays, parseISO } from "date-fns";
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

interface UnavailableDate {
  room_id: string;
  room_number?: string | null;
  unavailable_date: string;
}

export const useDragDrop = (
  rooms: Room[],
  bookings: Booking[] | undefined,
  unavailableDates: UnavailableDate[] | undefined,
  onBookingMove: (
    booking: Booking,
    newRoomId: string,
    newRoomNumber: string,
    newCheckIn: string,
    newCheckOut: string
  ) => void
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

    const dropDateStr = format(dropData.date, "yyyy-MM-dd");
    const isSameRoom = dragData.sourceRoomNumber === dropData.roomNumber;
    const isSameDate = dropDateStr === dragData.booking.check_in;

    // Skip if no change (same room AND same date)
    if (isSameRoom && isSameDate) return;

    // Check room type compatibility (same room type only)
    const sourceRoom = rooms.find((r) => r.id === dragData.sourceRoomId);
    const targetRoom = rooms.find((r) => r.id === dropData.roomId);

    if (sourceRoom?.name !== targetRoom?.name) {
      toast.error("Hanya bisa pindah ke kamar dengan tipe yang sama");
      return;
    }

    // Calculate new dates
    const newCheckIn = dropDateStr;
    const newCheckOut = format(addDays(dropData.date, dragData.booking.total_nights), "yyyy-MM-dd");

    // Check for booking conflicts (excluding current booking)
    const hasConflict = (bookings || []).some((b) => {
      if (b.id === dragData.booking.id) return false;
      if (b.allocated_room_number !== dropData.roomNumber) return false;
      if (b.status === "cancelled") return false;

      // Check date overlap
      return newCheckIn < b.check_out && newCheckOut > b.check_in;
    });

    if (hasConflict) {
      toast.error("Tidak bisa pindah: kamar sudah ada booking di tanggal tersebut");
      return;
    }

    // Check blocked dates
    const isBlocked = (unavailableDates || []).some((ud) => {
      if (ud.room_number !== dropData.roomNumber) return false;
      return ud.unavailable_date >= newCheckIn && ud.unavailable_date < newCheckOut;
    });

    if (isBlocked) {
      toast.error("Tidak bisa pindah: ada tanggal yang diblokir");
      return;
    }

    // Trigger the move callback with new dates
    onBookingMove(dragData.booking, dropData.roomId, dropData.roomNumber, newCheckIn, newCheckOut);
  };

  return {
    activeBooking,
    handleDragStart,
    handleDragEnd,
  };
};
