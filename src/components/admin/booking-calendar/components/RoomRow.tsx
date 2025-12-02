import React from "react";
import { Booking, RoomInfo } from "../types";
import { RoomCell } from "./RoomCell";

interface RoomRowProps {
  room: RoomInfo;
  dates: Date[];
  getBookingForCell: (roomNumber: string, date: Date) => Booking | null;
  isDateBlocked: (roomId: string, roomNumber: string, date: Date) => boolean;
  getBlockReason: (roomId: string, roomNumber: string, date: Date) => string | undefined;
  handleBookingClick: (booking: Booking) => void;
  handleRightClick: (e: React.MouseEvent, roomId: string, roomNumber: string, date: Date) => void;
  handleCellClick: (roomId: string, roomNumber: string, date: Date, isBlocked: boolean, hasBooking: boolean) => void;
  cellWidth: number;
  onResizeStart?: (e: React.MouseEvent, booking: Booking, edge: "left" | "right") => void;
  getResizePreview?: (bookingId: string) => { previewDays: number; edge: "left" | "right" | null };
  isResizing?: boolean;
  activeBooking?: Booking | null;
}

export const RoomRow = ({
  room,
  dates,
  getBookingForCell,
  isDateBlocked,
  getBlockReason,
  handleBookingClick,
  handleRightClick,
  handleCellClick,
  cellWidth,
  onResizeStart,
  getResizePreview,
  isResizing,
  activeBooking,
}: RoomRowProps) => {
  const firstVisibleDate = dates[0];

  return (
    <tr className="border-b border-border">
      {/* Room number cell */}
      <td className="sticky left-0 z-20 p-2 px-3 text-xs font-medium bg-card border-r border-border shadow-sm whitespace-nowrap">
        {room.roomNumber}
      </td>

      {/* Date cells */}
      {dates.map((date) => {
        const booking = getBookingForCell(room.roomNumber, date);
        const isBlocked = isDateBlocked(room.roomId, room.roomNumber, date);
        const blockReason = getBlockReason(room.roomId, room.roomNumber, date);

        return (
          <RoomCell
            key={date.toISOString()}
            roomId={room.roomId}
            roomNumber={room.roomNumber}
            date={date}
            booking={booking}
            isBlocked={isBlocked}
            blockReason={blockReason}
            handleBookingClick={handleBookingClick}
            handleRightClick={handleRightClick}
            handleCellClick={handleCellClick}
            firstVisibleDate={firstVisibleDate}
            cellWidth={cellWidth}
            onResizeStart={onResizeStart}
            getResizePreview={getResizePreview}
            isResizing={isResizing}
            activeBooking={activeBooking}
          />
        );
      })}
    </tr>
  );
};
