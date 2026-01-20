import { useState, useCallback, useEffect } from "react";
import { format, addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { Booking } from "../types";

interface ResizeState {
  isResizing: boolean;
  bookingId: string | null;
  edge: "left" | "right" | null;
  startX: number;
  originalCheckIn: string;
  originalCheckOut: string;
  originalNights: number;
}

interface UnavailableDate {
  room_id: string;
  room_number?: string | null;
  unavailable_date: string;
}

export const useBookingResize = (
  bookings: Booking[] | undefined,
  unavailableDates: UnavailableDate[] | undefined,
  cellWidth: number,
  onResizeComplete: (booking: Booking, newCheckIn: string, newCheckOut: string) => void,
) => {
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    bookingId: null,
    edge: null,
    startX: 0,
    originalCheckIn: "",
    originalCheckOut: "",
    originalNights: 0,
  });

  const [previewDays, setPreviewDays] = useState(0);

  const resetState = () => {
    setResizeState({
      isResizing: false,
      bookingId: null,
      edge: null,
      startX: 0,
      originalCheckIn: "",
      originalCheckOut: "",
      originalNights: 0,
    });
    setPreviewDays(0);
  };

  const startResize = useCallback((e: React.MouseEvent, booking: Booking, edge: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();

    setResizeState({
      isResizing: true,
      bookingId: booking.id,
      edge,
      startX: e.clientX,
      originalCheckIn: booking.check_in,
      originalCheckOut: booking.check_out,
      originalNights: booking.total_nights,
    });

    setPreviewDays(0);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizeState.isResizing) return;

      const deltaX = e.clientX - resizeState.startX;
      const daysDelta = Math.round(deltaX / cellWidth);

      setPreviewDays(daysDelta);
    },
    [resizeState.isResizing, resizeState.startX, cellWidth],
  );

  const handleMouseUp = useCallback(() => {
    if (!resizeState.isResizing || !resizeState.bookingId) {
      resetState();
      return;
    }

    const booking = bookings?.find((b) => b.id === resizeState.bookingId);

    if (!booking || previewDays === 0) {
      resetState();
      return;
    }

    let newCheckIn = resizeState.originalCheckIn;
    let newCheckOut = resizeState.originalCheckOut;

    if (resizeState.edge === "left") {
      const baseDate = parseISO(resizeState.originalCheckIn);
      newCheckIn = format(addDays(baseDate, previewDays), "yyyy-MM-dd");
    } else {
      const baseDate = parseISO(resizeState.originalCheckOut);
      newCheckOut = format(addDays(baseDate, previewDays), "yyyy-MM-dd");
    }

    const checkIn = parseISO(newCheckIn);
    const checkOut = parseISO(newCheckOut);

    if (checkOut <= checkIn) {
      toast.error("Booking harus minimal 1 malam");
      resetState();
      return;
    }

    const hasConflict = (bookings || []).some((b) => {
      if (b.id === booking.id) return false;
      if (b.allocated_room_number !== booking.allocated_room_number) return false;
      if (b.status === "cancelled") return false;

      return newCheckIn < b.check_out && newCheckOut > b.check_in;
    });

    if (hasConflict) {
      toast.error("Tidak bisa resize: ada booking lain di tanggal tersebut");
      resetState();
      return;
    }

    const isBlocked = (unavailableDates || []).some((ud) => {
      if (ud.room_number !== booking.allocated_room_number) return false;
      return ud.unavailable_date >= newCheckIn && ud.unavailable_date < newCheckOut;
    });

    if (isBlocked) {
      toast.error("Tidak bisa resize: ada tanggal yang diblokir");
      resetState();
      return;
    }

    onResizeComplete(booking, newCheckIn, newCheckOut);
    resetState();
  }, [resizeState, previewDays, bookings, unavailableDates, onResizeComplete]);

  // 🌍 GLOBAL EVENT LISTENER (Deno-safe)
  useEffect(() => {
    if (!resizeState.isResizing) return;

    const target = globalThis;

    target.addEventListener("mousemove", handleMouseMove);
    target.addEventListener("mouseup", handleMouseUp);

    return () => {
      target.removeEventListener("mousemove", handleMouseMove);
      target.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeState.isResizing, handleMouseMove, handleMouseUp]);

  const getResizePreview = (bookingId: string) => {
    if (!resizeState.isResizing || resizeState.bookingId !== bookingId) {
      return { previewDays: 0, edge: null };
    }

    return {
      previewDays,
      edge: resizeState.edge,
    };
  };

  return {
    isResizing: resizeState.isResizing,
    resizingBookingId: resizeState.bookingId,
    startResize,
    getResizePreview,
  };
};












