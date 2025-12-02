import React, { useMemo } from "react";
import { Booking, RoomInfo } from "../types";
import { CalendarHeaderRow } from "./CalendarHeaderRow";
import { RoomRow } from "./RoomRow";

interface CalendarTableProps {
  dates: Date[];
  cellWidth: number;

  roomsByType: Record<string, RoomInfo[]>; // Sudah langsung berupa RoomInfo[] per tipe
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
  // Width perhitungan lebih clean
  const tableWidth = useMemo(() => dates.length * cellWidth + 110, [dates, cellWidth]);

  // Grouping helper biar props ke RoomRow nggak ribet
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
    <div className="booking-calendar-scroll overflow-x-auto overflow-y-auto max-h-[70vh] scroll-smooth">
      <table className="border-collapse table-fixed" style={{ width: tableWidth }}>
        {/* Sticky Header */}
        <thead className="sticky top-0 z-50">
          <CalendarHeaderRow dates={dates} cellWidth={cellWidth} />
        </thead>

        <tbody>
          {Object.entries(roomsByType).map(([roomType, rooms]) => (
            <React.Fragment key={roomType}>
              {/* Room Type Header */}
              <tr className="border-y border-border">
                <td
                  className="sticky left-0 z-30 p-2 px-3 font-bold text-xs uppercase tracking-wider 
                               text-muted-foreground bg-stone-200 dark:bg-stone-800 
                               shadow-sm border-r border-border"
                >
                  {roomType}
                </td>

                {dates.map((date) => (
                  <td key={date.toISOString()} className="bg-stone-200 dark:bg-stone-800 border border-border" />
                ))}
              </tr>

              {/* Rooms */}
              {rooms.map((room) => (
                <RoomRow
                  key={room.roomNumber}
                  room={room}
                  dates={dates}
                  cellWidth={cellWidth}
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
