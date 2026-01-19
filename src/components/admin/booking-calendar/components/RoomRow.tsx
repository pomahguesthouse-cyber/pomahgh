import { memo } from "react";
import { Virtualizer } from "@tanstack/react-virtual";
import { RoomCell } from "./RoomCell";
import { Booking, RoomInfo } from "../types";

interface RoomRowProps {
  room: RoomInfo;
  dates: Date[];
  cellWidth: number;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
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

export const RoomRow = memo(function RoomRow({
  room,
  dates,
  cellWidth,
  virtualizer,
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
}: RoomRowProps) {
  const firstVisibleDate = dates[0];

  return (
    <tr className="border-b border-border">
      {/* Sticky room number */}
      <td
        className="sticky left-0 z-20 w-[80px] md:w-[110px] min-w-[80px] md:min-w-[110px] 
                   border-2 border-border p-1 md:p-2 shadow-md 
                   bg-white/80 dark:bg-gray-800/80 backdrop-blur-md"
      >
        <span className="text-[10px] md:text-xs font-semibold">{room.roomNumber}</span>
      </td>

      {/* Virtual cells container */}
      <td
        className="p-0 relative border-0"
        style={{ width: virtualizer.getTotalSize(), height: "auto" }}
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
              style={{
                position: "absolute",
                left: virtualColumn.start,
                width: cellWidth,
                top: 0,
                height: "100%",
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