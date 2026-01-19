import React, { memo } from "react";
import { Virtualizer } from "@tanstack/react-virtual";
import { Booking, RoomInfo } from "../types";
import { RoomCell } from "./RoomCell";

interface RoomRowProps {
  room: RoomInfo;
  dates: Date[];
  virtualizer: Virtualizer<HTMLDivElement, Element>;
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

export const RoomRow = memo(function RoomRow({
  room,
  dates,
  virtualizer,
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
}: RoomRowProps) {
  const firstVisibleDate = dates[0];

  return (
    <tr className="border-b border-border">
      {/* Room number cell - sticky */}
      <td className="sticky left-0 z-20 p-1 md:p-2 px-2 md:px-3 text-[10px] md:text-xs font-medium bg-card border-r border-border shadow-sm whitespace-nowrap w-[80px] md:w-[110px] min-w-[80px] md:min-w-[110px]">
        {room.roomNumber}
      </td>

      {/* Virtualized date cells container */}
      <td 
        className="p-0 relative border-0"
        style={{ width: virtualizer.getTotalSize(), height: "2.5rem" }}
        colSpan={dates.length}
      >
        {virtualizer.getVirtualItems().map((virtualColumn) => {
          const date = dates[virtualColumn.index];
          const booking = getBookingForCell(room.roomNumber, date);
          const isBlocked = isDateBlocked(room.roomId, room.roomNumber, date);
          const blockReason = getBlockReason(room.roomId, room.roomNumber, date);

          return (
            <div
              key={virtualColumn.key}
              className="absolute top-0 bottom-0"
              style={{
                left: virtualColumn.start,
                width: cellWidth,
              }}
            >
              <RoomCell
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
            </div>
          );
        })}
      </td>
    </tr>
  );
});
