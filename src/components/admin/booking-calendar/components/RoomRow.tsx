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
  const { roomId, roomNumber } = room;
  const firstVisibleDate = dates[0];

  return (
    <tr className="hover:bg-muted/10 transition-colors">
      <td className="border border-border p-2 sticky left-0 z-30 font-semibold text-xs shadow-sm text-center bg-gray-100 dark:bg-gray-800">
        {roomNumber}
      </td>

      {dates.map((date) => {
        const booking = getBookingForCell(roomNumber, date);
        const isBlocked = isDateBlocked(roomId, roomNumber, date);
        const blockReason = getBlockReason(roomId, roomNumber, date);

        return (
          <RoomCell
            key={date.toISOString()}
            roomId={roomId}
            roomNumber={roomNumber}
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
