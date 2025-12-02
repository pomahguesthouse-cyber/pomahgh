import { useState, useCallback, useRef } from "react";
import { Booking } from "../types";

interface BookingSnapshot {
  id: string;
  originalData: {
    check_in: string;
    check_out: string;
    room_id: string;
    allocated_room_number: string | null;
    total_nights: number;
  };
  timestamp: number;
}

interface UseBookingHistoryProps {
  updateBooking: (data: any) => Promise<void>;
  onUndoComplete?: () => void;
}

export const useBookingHistory = ({ updateBooking, onUndoComplete }: UseBookingHistoryProps) => {
  const [lastSnapshot, setLastSnapshot] = useState<BookingSnapshot | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveSnapshot = useCallback((booking: Booking) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLastSnapshot({
      id: booking.id,
      originalData: {
        check_in: booking.check_in,
        check_out: booking.check_out,
        room_id: booking.room_id,
        allocated_room_number: booking.allocated_room_number,
        total_nights: booking.total_nights,
      },
      timestamp: Date.now(),
    });

    // Auto-clear history after 10 seconds (longer than toast duration)
    timeoutRef.current = setTimeout(() => {
      setLastSnapshot(null);
    }, 10000);
  }, []);

  const undo = useCallback(async () => {
    if (!lastSnapshot || isUndoing) return false;

    try {
      setIsUndoing(true);
      
      await updateBooking({
        id: lastSnapshot.id,
        ...lastSnapshot.originalData,
      });

      setLastSnapshot(null);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      onUndoComplete?.();
      return true;
    } catch (error) {
      console.error("Error undoing booking change:", error);
      return false;
    } finally {
      setIsUndoing(false);
    }
  }, [lastSnapshot, isUndoing, updateBooking, onUndoComplete]);

  const clearHistory = useCallback(() => {
    setLastSnapshot(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    saveSnapshot,
    undo,
    clearHistory,
    hasUndoAction: !!lastSnapshot,
    isUndoing,
  };
};
