import { format } from "date-fns";
import { Booking } from "../types";

interface UnavailableDate {
  room_id: string;
  room_number?: string;
  unavailable_date: string;
  reason?: string;
}

export const useCalendarHelpers = (
  bookings: Booking[] | undefined,
  unavailableDates: UnavailableDate[]
) => {
  // Get booking for specific room and date
  const getBookingForCell = (roomNumber: string, date: Date): Booking | null => {
    if (!bookings) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    
    const matchingBookings = bookings.filter((booking) => {
      if (booking.status === "cancelled") return false;
      const checkIn = booking.check_in;
      const checkOut = booking.check_out;
      const isInRange = dateStr >= checkIn && dateStr < checkOut;
      if (!isInRange) return false;
      const isPrimaryRoom = booking.allocated_room_number === roomNumber;
      const isInBookingRooms = booking.booking_rooms?.some((br) => br.room_number === roomNumber);
      return isPrimaryRoom || isInBookingRooms;
    });

    return matchingBookings[0] || null;
  };

  // Check if date is blocked
  const isDateBlocked = (roomId: string, roomNumber: string, date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.some(
      (d) => d.room_id === roomId && d.room_number === roomNumber && d.unavailable_date === dateStr
    );
  };

  // Get block reason
  const getBlockReason = (roomId: string, roomNumber: string, date: Date): string | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.find(
      (d) => d.room_id === roomId && d.room_number === roomNumber && d.unavailable_date === dateStr
    )?.reason;
  };

  // Check if this is the first day of a booking
  const isBookingStart = (booking: Booking, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return dateStr === booking.check_in;
  };

  // Check if this is the last day of a booking
  const isBookingEnd = (booking: Booking, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const checkOutDate = new Date(booking.check_out);
    checkOutDate.setDate(checkOutDate.getDate() - 1);
    return dateStr === format(checkOutDate, "yyyy-MM-dd");
  };

  return {
    getBookingForCell,
    isDateBlocked,
    getBlockReason,
    isBookingStart,
    isBookingEnd,
  };
};
