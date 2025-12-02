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
}: RoomRowProps) => {
  return (
    <tr className="hover:bg-muted/10 transition-colors">
      <td className="border border-border p-2 sticky left-0 z-30 font-semibold text-xs shadow-sm text-center bg-gray-100 dark:bg-gray-800">
        {room.roomNumber}
      </td>
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
            firstVisibleDate={dates[0]}
            cellWidth={cellWidth}
            onResizeStart={onResizeStart}
            getResizePreview={getResizePreview}
            isResizing={isResizing}
          />
        );
      })}
    </tr>
  );
};
