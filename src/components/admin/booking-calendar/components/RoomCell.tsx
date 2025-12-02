import { format, differenceInDays, parseISO, getDay } from "date-fns";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { isWIBToday } from "@/utils/wibTimezone";
import { isIndonesianHoliday, type IndonesianHoliday } from "@/utils/indonesianHolidays";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Booking } from "../types";
import { BookingBar } from "./BookingBar";
import { BlockedCellOverlay } from "./BlockedCellOverlay";

interface RoomCellProps {
  roomId: string;
  roomNumber: string;
  date: Date;
  booking: Booking | null;
  isBlocked: boolean;
  blockReason?: string;
  handleBookingClick: (booking: Booking) => void;
  handleRightClick: (e: React.MouseEvent, roomId: string, roomNumber: string, date: Date) => void;
  handleCellClick: (roomId: string, roomNumber: string, date: Date, isBlocked: boolean, hasBooking: boolean) => void;
  firstVisibleDate: Date;
  cellWidth: number;
  onResizeStart?: (e: React.MouseEvent, booking: Booking, edge: "left" | "right") => void;
  getResizePreview?: (bookingId: string) => { previewDays: number; edge: "left" | "right" | null };
  isResizing?: boolean;
}

export const RoomCell = ({
  roomId,
  roomNumber,
  date,
  booking,
  isBlocked,
  blockReason,
  handleBookingClick,
  handleRightClick,
  handleCellClick,
  firstVisibleDate,
  cellWidth,
  onResizeStart,
  getResizePreview,
  isResizing,
}: RoomCellProps) => {
  const isWeekend = getDay(date) === 0 || getDay(date) === 6;
  const holiday = isIndonesianHoliday(date);
  const isHolidayOrWeekend = isWeekend || holiday !== null;

  const dateStr = format(date, "yyyy-MM-dd");
  const firstVisibleStr = format(firstVisibleDate, "yyyy-MM-dd");

  // Droppable setup
  const { setNodeRef, isOver, active } = useDroppable({
    id: `cell-${roomId}-${roomNumber}-${dateStr}`,
    data: {
      roomId,
      roomNumber,
      date,
    },
  });

  // Determine if booking should start rendering here
  const isStart = booking
    ? booking.check_in === dateStr ||
      (booking.check_in < firstVisibleStr && dateStr === firstVisibleStr && booking.check_out > dateStr)
    : false;

  // Calculate visible nights for truncated bookings
  let visibleNights = booking?.total_nights;
  const isTruncatedLeft = booking && booking.check_in < firstVisibleStr && dateStr === firstVisibleStr;
  if (isTruncatedLeft && booking) {
    const checkOutDate = parseISO(booking.check_out);
    visibleNights = differenceInDays(checkOutDate, firstVisibleDate);
  }

  const hasBooking = booking !== null;
  const isClickable = !isBlocked && !hasBooking;
  const canDrop = !isBlocked && !hasBooking;

  // Check if dragging is active and this is a valid drop target
  const isDragging = active !== null;
  const showDropIndicator = isOver && isDragging && !isResizing;

  // Get resize preview for current booking
  const resizePreview = booking && getResizePreview ? getResizePreview(booking.id) : undefined;

  const cell = (
    <td
      ref={setNodeRef}
      onClick={() => handleCellClick(roomId, roomNumber, date, isBlocked, hasBooking)}
      onContextMenu={(e) => handleRightClick(e, roomId, roomNumber, date)}
      className={cn(
        "border border-border p-0 relative h-14 transition-all duration-200 overflow-visible",
        isHolidayOrWeekend && "bg-red-50/20 dark:bg-red-950/10",
        !isHolidayOrWeekend && "bg-background",
        isClickable && "hover:bg-primary/5 hover:ring-1 hover:ring-primary/30 cursor-pointer",
        !isClickable && "cursor-context-menu",
        showDropIndicator && canDrop && "bg-primary/20 ring-2 ring-primary",
        showDropIndicator && !canDrop && "bg-destructive/20 ring-2 ring-destructive"
      )}
      style={{ width: cellWidth, minWidth: cellWidth, maxWidth: cellWidth }}
      title={isBlocked ? `Blocked: ${blockReason || "No reason specified"}` : undefined}
    >
      {/* Center divider */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/30 -translate-x-px pointer-events-none z-[1]" />

      {/* Blocked overlay */}
      {isBlocked && <BlockedCellOverlay reason={blockReason} />}

      {/* Booking bar */}
      {booking && !isBlocked && isStart && (
        <BookingBar
          booking={booking}
          onClick={() => handleBookingClick(booking)}
          visibleNights={visibleNights}
          isTruncatedLeft={isTruncatedLeft || false}
          cellWidth={cellWidth}
          roomNumber={roomNumber}
          roomId={roomId}
          onResizeStart={onResizeStart}
          resizePreview={resizePreview}
          isResizing={isResizing}
        />
      )}

      {/* Click hint */}
      {isClickable && !isDragging && !isResizing && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-5">
          <div className="text-[10px] text-primary/60 font-medium">Click to book</div>
        </div>
      )}
    </td>
  );

  // Wrap with tooltip for holidays
  if (holiday && !booking) {
    return (
      <TooltipProvider key={`${roomNumber}-${date.toISOString()}`}>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{cell}</TooltipTrigger>
          <TooltipContent side="top" className="bg-red-600 text-white font-medium">
            <div className="text-xs">
              <div className="font-bold">{holiday.name}</div>
              <div className="text-[10px] opacity-90">Hari Libur Nasional</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cell;
};
