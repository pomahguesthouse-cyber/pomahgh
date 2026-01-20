import { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { format, addDays, startOfDay } from "date-fns";
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
}

interface UnavailableDate {
  room_id: string;
  room_number?: string | null;
  unavailable_date: string;
}

interface GhostPreview {
  bookingId: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
}

interface UndoSnapshot {
  booking: Booking;
  prevRoomId: string;
  prevRoomNumber: string;
  prevCheckIn: string;
  prevCheckOut: string;
}

export const useDragDrop = (
  rooms: Room[],
  bookings: Booking[] | undefined,
  unavailableDates: UnavailableDate[] | undefined,
  onBookingMove: (
    booking: Booking,
    roomId: string,
    roomNumber: string,
    checkIn: string,
    checkOut: string,
  ) => Promise<void>,
) => {
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [ghostPreview, setGhostPreview] = useState<GhostPreview | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);

  const today = startOfDay(new Date());

  // 📳 Haptic helper (mobile only)
  const haptic = (pattern: number | number[]) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // =====================
  // DRAG START
  // =====================
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    if (!data?.booking) return;

    setActiveBooking(data.booking);
    haptic(10);
  };

  // =====================
  // DRAG END
  // =====================
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveBooking(null);
    setGhostPreview(null);

    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as DropData;

    if (!dragData?.booking || !dropData?.roomNumber) return;

    const dropDate = startOfDay(dropData.date);
    const dropDateStr = format(dropDate, "yyyy-MM-dd");

    const isSameRoom = dragData.sourceRoomNumber === dropData.roomNumber;
    const isSameDate = dropDateStr === dragData.booking.check_in;

    // 🧘 NO-OP: tidak ada perubahan → silent exit
    if (isSameRoom && isSameDate) {
      return;
    }

    // 🚫 Prevent drag ke tanggal lampau
    if (dropDate < today) {
      haptic([30, 30, 30]);
      toast.error("Tidak bisa memindahkan booking ke tanggal yang sudah lewat");
      return;
    }

    // 🔒 Room type validation
    const sourceRoom = rooms.find((r) => r.id === dragData.sourceRoomId);
    const targetRoom = rooms.find((r) => r.id === dropData.roomId);

    if (sourceRoom?.name !== targetRoom?.name) {
      haptic([30, 30]);
      toast.error("Hanya bisa pindah ke kamar dengan tipe yang sama");
      return;
    }

    const newCheckIn = dropDateStr;
    const newCheckOut = format(addDays(dropDate, dragData.booking.total_nights), "yyyy-MM-dd");

    // ❌ Booking conflict check
    const hasConflict = (bookings || []).some((b) => {
      if (b.id === dragData.booking.id) return false;
      if (b.status === "cancelled" || b.status === "no_show") return false;

      const sameRoom =
        b.allocated_room_number === dropData.roomNumber ||
        b.booking_rooms?.some((br) => br.room_number === dropData.roomNumber);

      if (!sameRoom) return false;

      return newCheckIn < b.check_out && newCheckOut > b.check_in;
    });

    if (hasConflict) {
      haptic([40, 20, 40]);
      toast.error("Kamar sudah ada booking di tanggal tersebut");
      return;
    }

    // 🚫 Blocked date check
    const isBlocked = (unavailableDates || []).some((ud) => {
      if (ud.room_number !== dropData.roomNumber) return false;
      return ud.unavailable_date >= newCheckIn && ud.unavailable_date < newCheckOut;
    });

    if (isBlocked) {
      haptic([40, 20, 40]);
      toast.error("Ada tanggal yang diblokir");
      return;
    }

    // =====================
    // SNAPSHOT (UNDO)
    // =====================
    const snapshot: UndoSnapshot = {
      booking: dragData.booking,
      prevRoomId: dragData.sourceRoomId,
      prevRoomNumber: dragData.sourceRoomNumber,
      prevCheckIn: dragData.booking.check_in,
      prevCheckOut: dragData.booking.check_out,
    };

    setUndoSnapshot(snapshot);
    haptic(20);

    // =====================
    // OPTIMISTIC COMMIT
    // =====================
    await onBookingMove(dragData.booking, dropData.roomId, dropData.roomNumber, newCheckIn, newCheckOut);

    toast.success("Booking dipindahkan", {
      action: {
        label: "Undo",
        onClick: async () => {
          if (!snapshot) return;

          haptic(15);
          await onBookingMove(
            snapshot.booking,
            snapshot.prevRoomId,
            snapshot.prevRoomNumber,
            snapshot.prevCheckIn,
            snapshot.prevCheckOut,
          );
        },
      },
    });
  };

  // =====================
  // GHOST PREVIEW (dipanggil saat drag-over cell)
  // =====================
  const updateGhostPreview = (bookingId: string, roomNumber: string, date: Date, nights: number) => {
    const checkIn = format(date, "yyyy-MM-dd");
    const checkOut = format(addDays(date, nights), "yyyy-MM-dd");

    setGhostPreview({
      bookingId,
      roomNumber,
      checkIn,
      checkOut,
    });
  };

  return {
    activeBooking,
    ghostPreview,
    handleDragStart,
    handleDragEnd,
    updateGhostPreview,
  };
};
