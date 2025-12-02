import React from "react";
import { Booking, RoomInfo } from "../types";
import { CalendarHeaderRow } from "./CalendarHeaderRow";
import { RoomRow } from "./RoomRow";

interface CalendarTableProps {
  dates: Date[];
  cellWidth: number;
  roomsByType: Record<string, any[]>;
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
}: CalendarTableProps) => {
  return (
    <div
      className="booking-calendar-scroll overflow-x-auto overflow-y-auto max-h-[70vh] scroll-smooth"
      style={{ scrollBehavior: "smooth" }}
    >
      <table
        className="border-collapse table-fixed"
        style={{ width: `${(dates.length + 1) * cellWidth + 110}px` }}
      >
        <thead className="sticky top-0 z-40">
          <CalendarHeaderRow dates={dates} cellWidth={cellWidth} />
        </thead>
        <tbody>
          {Object.entries(roomsByType).map(([roomType]) => (
            <React.Fragment key={roomType}>
              {/* Room type header */}
              <tr className="border-y border-border">
                <td className="sticky left-0 z-20 p-2 px-3 font-bold text-xs uppercase tracking-wider text-muted-foreground bg-stone-200 dark:bg-stone-800 shadow-sm border-r border-border">
                  {roomType}
                </td>
                {dates.map((date) => (
                  <td key={date.toISOString()} className="bg-stone-200 dark:bg-stone-800 border border-border" />
                ))}
              </tr>

              {/* Room rows */}
              {allRoomNumbers
                .filter((r) => r.roomType === roomType)
                .map((room) => (
                  <RoomRow
                    key={room.roomNumber}
                    room={room}
                    dates={dates}
                    getBookingForCell={getBookingForCell}
                    isDateBlocked={isDateBlocked}
                    getBlockReason={getBlockReason}
                    handleBookingClick={handleBookingClick}
                    handleRightClick={handleRightClick}
                    handleCellClick={handleCellClick}
                    cellWidth={cellWidth}
                    onResizeStart={onResizeStart}
                    getResizePreview={getResizePreview}
                    isResizing={isResizing}
                  />
                ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
