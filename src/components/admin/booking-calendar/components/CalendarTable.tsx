import React, { useMemo, useRef, useEffect } from "react";
import { useVirtualizer, Virtualizer } from "@tanstack/react-virtual";
import { Booking, RoomInfo } from "../types";
import { CalendarHeaderRow } from "./CalendarHeaderRow";
import { RoomRow } from "./RoomRow";
import { isWIBToday } from "@/utils/wibTimezone";

interface CalendarTableProps {
  dates: Date[];
  cellWidth: number;
  roomsByType: Record<string, RoomInfo[]>;
  allRoomNumbers: RoomInfo[];
  getBookingForCell: (roomNumber: string, date: Date) => Booking | null;
  isDateBlocked: (roomId: string, roomNumber: string, date: Date) => boolean;
  getBlockReason: (roomId: string, roomNumber: string, date: Date) => string | undefined;
  handleBookingClick: (booking: Booking) => void;
  handleRightClick: (e: React.MouseEvent, roomId: string, roomNumber: string, date: Date) => void;
  handleCellClick: (roomId: string, roomNumber: string, date: Date, isBlocked: boolean, hasBooking: boolean) => void;
  onResizeStart?: (e: React.MouseEvent, booking: Booking, edge: "left" | "right") => void;
  getResizePreview?: (bookingId: string) => { previewDays: number; edge: "left" | "right" | null };
  isResizing?: boolean;
  activeBooking?: Booking | null;
}

export const CalendarTable = ({
  dates,
  cellWidth,
  roomsByType,
  allRoomNumbers,
  getBookingForCell,
  isDateBlocked,
  getBlockReason,
  handleBookingClick,
  handleRightClick,
  handleCellClick,
  onResizeStart,
  getResizePreview,
  isResizing,
  activeBooking,
}: CalendarTableProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickyColumnWidth = 80;

  // Horizontal virtualizer for columns (dates)
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: dates.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => cellWidth,
    overscan: 5,
  });

  // Auto-scroll to TODAY on mount
  useEffect(() => {
    const todayIndex = dates.findIndex(isWIBToday);
    if (todayIndex === -1 || !scrollRef.current) return;

    const container = scrollRef.current;
    const left = todayIndex * cellWidth - container.clientWidth / 2 + cellWidth / 2;

    // Small delay to ensure layout is ready
    const timer = setTimeout(() => {
      container.scrollTo({
        left: Math.max(left, 0),
        behavior: "smooth",
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [dates, cellWidth]);

  const totalWidth = columnVirtualizer.getTotalSize() + stickyColumnWidth + 30;

  const bookingActions = {
    getBookingForCell,
    handleBookingClick,
    handleRightClick,
    handleCellClick,
    onResizeStart,
    getResizePreview,
    isResizing,
    activeBooking,
  };

  const cellCheckers = {
    isDateBlocked,
    getBlockReason,
  };

  return (
    <div 
      ref={scrollRef}
      className="booking-calendar-scroll overflow-x-auto overflow-y-auto max-h-[55vh] md:max-h-[70vh] scroll-smooth"
    >
      <table className="border-collapse table-fixed" style={{ width: totalWidth }}>
        <thead className="sticky top-0 z-50">
          <CalendarHeaderRow 
            dates={dates} 
            cellWidth={cellWidth} 
            virtualizer={columnVirtualizer}
          />
        </thead>

        <tbody>
          {Object.entries(roomsByType).map(([roomType, rooms]) => (
            <React.Fragment key={roomType}>
              {/* Room Type Header */}
              <tr className="border-y border-border">
                <td
                  className="sticky left-0 z-30 p-1 md:p-2 px-2 md:px-3 font-bold text-[10px] md:text-xs uppercase tracking-wider 
                               text-muted-foreground bg-stone-200 dark:bg-stone-800 
                               shadow-sm border-r border-border"
                  style={{ width: stickyColumnWidth, minWidth: stickyColumnWidth }}
                >
                  {roomType}
                </td>
                <td 
                  className="bg-stone-200 dark:bg-stone-800 border border-border p-0" 
                  style={{ width: columnVirtualizer.getTotalSize() }}
                  colSpan={dates.length}
                />
              </tr>

              {/* Rooms */}
              {rooms.map((room) => (
                <RoomRow
                  key={room.roomNumber}
                  room={room}
                  dates={dates}
                  cellWidth={cellWidth}
                  virtualizer={columnVirtualizer}
                  {...bookingActions}
                  {...cellCheckers}
                />
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
