import { useState, useCallback, useEffect } from "react";
import { format, addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { Booking } from "../types";

/* =======================
   TYPES
======================= */

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

interface ResizePreview {
  previewDays: number;
  edge: "left" | "right" | null;
  isConflict: boolean;
}

/* =======================
   HOOK
======================= */

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
  const [isPreviewConflict, setIsPreviewConflict] = useState(false);

  /* =======================
     RESET
  ======================= */

  const resetState = useCallback(() => {
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
    setIsPreviewConflict(false);
  }, []);

  /* =======================
     CONFLICT CHECK (REALTIME)
  ======================= */

  const checkConflict = useCallback(
    (booking: Booking, newCheckIn: string, newCheckOut: string): boolean => {
      // booking overlap
      const bookingConflict = (bookings ?? []).some((b) => {
        if (b.id === booking.id) return false;
        if (b.status === "cancelled") return false;
        if (b.allocated_room_number !== booking.allocated_room_number) return false;

        return newCheckIn < b.check_out && newCheckOut > b.check_in;
      });

      if (bookingConflict) return true;

      // blocked dates
      const blockedConflict = (unavailableDates ?? []).some((ud) => {
        if (ud.room_number !== booking.allocated_room_number) return false;
        return ud.unavailable_date >= newCheckIn && ud.unavailable_date < newCheckOut;
      });

      return blockedConflict;
    },
    [bookings, unavailableDates],
  );

  /* =======================
     START RESIZE
  ======================= */

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
    setIsPreviewConflict(false);
  }, []);

  /* =======================
     MOUSE MOVE (LIVE PREVIEW)
  ======================= */

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizeState.isResizing || !resizeState.bookingId) return;

      const booking = bookings?.find((b) => b.id === resizeState.bookingId);
      if (!booking) return;

      const deltaX = e.clientX - resizeState.startX;
      const daysDelta = Math.round(deltaX / cellWidth);
      setPreviewDays(daysDelta);

      let newCheckIn = resizeState.originalCheckIn;
      let newCheckOut = resizeState.originalCheckOut;

      if (resizeState.edge === "left") {
        newCheckIn = format(addDays(parseISO(resizeState.originalCheckIn), daysDelta), "yyyy-MM-dd");
      } else {
        newCheckOut = format(addDays(parseISO(resizeState.originalCheckOut), daysDelta), "yyyy-MM-dd");
      }

      const conflict = checkConflict(booking, newCheckIn, newCheckOut);
      setIsPreviewConflict(conflict);
    },
    [resizeState, bookings, cellWidth, checkConflict],
  );

  /* =======================
     MOUSE UP (FINALIZE)
  ======================= */

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
      newCheckIn = format(addDays(parseISO(resizeState.originalCheckIn), previewDays), "yyyy-MM-dd");
    } else {
      newCheckOut = format(addDays(parseISO(resizeState.originalCheckOut), previewDays), "yyyy-MM-dd");
    }

    const checkIn = parseISO(newCheckIn);
    const checkOut = parseISO(newCheckOut);

    if (checkOut <= checkIn) {
      toast.error("Booking harus minimal 1 malam");
      resetState();
      return;
    }

    if (checkConflict(booking, newCheckIn, newCheckOut)) {
      toast.error("Tidak bisa resize: tanggal bentrok / diblokir");
      resetState();
      return;
    }

    onResizeComplete(booking, newCheckIn, newCheckOut);
    resetState();
  }, [resizeState, previewDays, bookings, resetState, checkConflict, onResizeComplete]);

  /* =======================
     GLOBAL LISTENERS
  ======================= */

  useEffect(() => {
    if (!resizeState.isResizing) return;

    globalThis.addEventListener("mousemove", handleMouseMove);
    globalThis.addEventListener("mouseup", handleMouseUp);

    return () => {
      globalThis.removeEventListener("mousemove", handleMouseMove);
      globalThis.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeState.isResizing, handleMouseMove, handleMouseUp]);

  /* =======================
     PREVIEW API
  ======================= */

  const getResizePreview = (bookingId: string): ResizePreview => {
    if (!resizeState.isResizing || resizeState.bookingId !== bookingId) {
      return { previewDays: 0, edge: null, isConflict: false };
    }

    return {
      previewDays,
      edge: resizeState.edge,
      isConflict: isPreviewConflict,
    };
  };

  return {
    isResizing: resizeState.isResizing,
    resizingBookingId: resizeState.bookingId,
    startResize,
    getResizePreview,
  };
};
