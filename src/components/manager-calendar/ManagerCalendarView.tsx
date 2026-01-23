import React, { useMemo, useState } from "react";
import { format, addDays, startOfDay, differenceInDays, isWithinInterval, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  ManagerCalendarRoom,
  ManagerCalendarBooking,
  ManagerCalendarUnavailableDate,
} from "@/hooks/useManagerCalendarData";
import { cn } from "@/lib/utils";

interface ManagerCalendarViewProps {
  rooms: ManagerCalendarRoom[];
  bookings: ManagerCalendarBooking[];
  unavailableDates: ManagerCalendarUnavailableDate[];
  startDate: Date;
  onStartDateChange: (date: Date) => void;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-500",
  pending: "bg-yellow-500",
  checked_in: "bg-blue-500",
  checked_out: "bg-gray-400",
  cancelled: "bg-red-500",
  rejected: "bg-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  checked_in: "Check-in",
  checked_out: "Check-out",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const DAYS_TO_SHOW = 14; // Show 2 weeks for better mobile view

export const ManagerCalendarView: React.FC<ManagerCalendarViewProps> = ({
  rooms,
  bookings,
  unavailableDates,
  startDate,
  onStartDateChange,
}) => {
  const dates = useMemo(() => {
    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  const getBookingsForRoomNumber = (roomId: string, roomNumber: string) => {
    return bookings.filter((booking) => {
      // Check if booking is for this room type
      if (booking.room_id !== roomId) return false;
      
      // Check allocated room number
      if (booking.allocated_room_number === roomNumber) return true;
      
      // Check booking_rooms
      if (booking.booking_rooms?.some((br) => br.room_number === roomNumber)) return true;
      
      return false;
    });
  };

  const isDateBlocked = (roomId: string, roomNumber: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.some(
      (ud) =>
        ud.room_id === roomId &&
        (ud.room_number === roomNumber || ud.room_number === null) &&
        ud.unavailable_date === dateStr
    );
  };

  const getBookingForCell = (
    roomId: string,
    roomNumber: string,
    date: Date
  ): { booking: ManagerCalendarBooking; isStart: boolean; span: number; isTruncatedLeft: boolean } | null => {
    const roomBookings = getBookingsForRoomNumber(roomId, roomNumber);
    const firstVisibleDate = startOfDay(startDate);
    const firstVisibleStr = format(firstVisibleDate, "yyyy-MM-dd");
    
    for (const booking of roomBookings) {
      const checkIn = startOfDay(parseISO(booking.check_in));
      const checkOut = startOfDay(parseISO(booking.check_out));
      const cellDate = startOfDay(date);
      const dateStr = format(cellDate, "yyyy-MM-dd");
      
      if (cellDate >= checkIn && cellDate < checkOut) {
        const isCheckInCell = cellDate.getTime() === checkIn.getTime();
        
        // Handle truncated left: booking started before view range
        const isTruncatedLeft = checkIn < firstVisibleDate && dateStr === firstVisibleStr;
        
        const isStart = isCheckInCell || isTruncatedLeft;
        
        const daysRemaining = differenceInDays(checkOut, cellDate);
        const daysUntilEndOfView = DAYS_TO_SHOW - differenceInDays(cellDate, startDate);
        const span = Math.min(daysRemaining, daysUntilEndOfView);
        
        return { booking, isStart, span, isTruncatedLeft };
      }
    }
    
    return null;
  };

  const handlePrevWeek = () => {
    onStartDateChange(addDays(startDate, -7));
  };

  const handleNextWeek = () => {
    onStartDateChange(addDays(startDate, 7));
  };

  const handleToday = () => {
    onStartDateChange(startOfDay(new Date()));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Navigation */}
      <div className="flex items-center justify-between p-3 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            <Calendar className="h-4 w-4 mr-1" />
            Hari ini
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {format(startDate, "MMM yyyy", { locale: id })}
        </span>
      </div>

      {/* Calendar Grid */}
      <ScrollArea className="flex-1">
        <div className="min-w-[800px]">
          {/* Header Row - Dates */}
          <div className="flex border-b sticky top-0 bg-background z-5">
            <div className="w-32 min-w-32 p-2 border-r bg-muted font-medium text-xs">
              Kamar
            </div>
            {dates.map((date) => {
              const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "flex-1 min-w-14 p-1 text-center border-r text-xs",
                    isToday && "bg-primary/10",
                    isWeekend && "bg-muted/50"
                  )}
                >
                  <div className="font-medium">{format(date, "EEE", { locale: id })}</div>
                  <div className={cn("text-muted-foreground", isToday && "text-primary font-bold")}>
                    {format(date, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room Rows */}
          {rooms.map((room) => (
            <div key={room.id}>
              {/* Room Type Header */}
              <div className="flex border-b bg-muted/30">
                <div className="w-32 min-w-32 p-2 border-r font-medium text-sm truncate">
                  {room.name}
                </div>
                {dates.map((date) => (
                  <div key={date.toISOString()} className="flex-1 min-w-14 border-r" />
                ))}
              </div>

              {/* Individual Room Numbers */}
              {(room.room_numbers || []).map((roomNumber) => (
                <div key={`${room.id}-${roomNumber}`} className="flex border-b relative">
                  <div className="w-32 min-w-32 p-2 border-r text-xs text-muted-foreground bg-card">
                    {roomNumber}
                  </div>
                  {dates.map((date, dateIdx) => {
                    const isBlocked = isDateBlocked(room.id, roomNumber, date);
                    const bookingInfo = getBookingForCell(room.id, roomNumber, date);
                    const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

                    // Cell width constant (min-w-14 = 56px)
                    const cellWidth = 56;
                    
                    // Always render cell, but only show bar at start position
                    return (
                      <div
                        key={date.toISOString()}
                        className={cn(
                          "flex-1 min-w-14 h-10 border-r relative overflow-visible",
                          isToday && "bg-primary/5",
                          isBlocked && !bookingInfo && "bg-red-100 dark:bg-red-950"
                        )}
                      >
                        {/* Center divider line like admin calendar */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/30" />
                        
                        {/* Only render booking bar at start cell */}
                        {bookingInfo && bookingInfo.isStart && (
                          <div
                            className={cn(
                              "absolute top-1 bottom-1 text-white text-xs px-1.5 py-0.5 overflow-hidden z-10",
                              bookingInfo.isTruncatedLeft ? "rounded-r" : "rounded",
                              STATUS_COLORS[bookingInfo.booking.status] || "bg-gray-500"
                            )}
                            style={{
                              // Truncated left: start from 0, otherwise start from center
                              left: bookingInfo.isTruncatedLeft ? 0 : `${cellWidth / 2}px`,
                              // Width includes extra half-cell for truncated bookings
                              width: `${bookingInfo.span * cellWidth + (bookingInfo.isTruncatedLeft ? cellWidth / 2 : 0)}px`,
                            }}
                            title={`${bookingInfo.booking.guest_name} (${bookingInfo.booking.booking_code})`}
                          >
                            <div className="font-medium truncate">
                              {bookingInfo.booking.guest_name}
                            </div>
                            <div className="text-[10px] opacity-80 truncate">
                              {bookingInfo.booking.booking_code}
                            </div>
                          </div>
                        )}
                        {isBlocked && !bookingInfo && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-red-500">Blocked</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Legend */}
      <div className="p-3 border-t bg-card">
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(STATUS_LABELS).slice(0, 4).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded", STATUS_COLORS[status])} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-900" />
            <span className="text-muted-foreground">Blocked</span>
          </div>
        </div>
      </div>
    </div>
  );
};
