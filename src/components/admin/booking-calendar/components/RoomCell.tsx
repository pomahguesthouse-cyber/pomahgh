import { useEffect } from "react";
import { format, differenceInDays, parseISO, getDay } from "date-fns";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { isWIBToday } from "@/utils/wibTimezone";
import { isIndonesianHoliday } from "@/utils/indonesianHolidays";
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
  activeBooking?: Booking | null;
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
  activeBooking,
}: RoomCellProps) => {
  /* ===================== DATE STATE ===================== */
  const isWeekend = getDay(date) === 0 || getDay(date) === 6;
  const holiday = isIndonesianHoliday(date);
  const isHolidayOrWeekend = isWeekend || holiday !== null;
  const isToday = isWIBToday(date);

  const dateStr = format(date, "yyyy-MM-dd");
  const firstVisibleStr = format(firstVisibleDate, "yyyy-MM-dd");

  /* ===================== AUTO SCROLL TO TODAY ===================== */
  useEffect(() => {
    if (!isToday) return;

    // scroll only once per page load
    if ((window as any).__scrolledToToday) return;
    (window as any).__scrolledToToday = true;

    requestAnimationFrame(() => {
      const cell = document.querySelector<HTMLTableCellElement>('td[data-today="true"]');

      if (!cell) return;

      cell.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }, [isToday]);

  /* ===================== DND ===================== */
  const { setNodeRef, isOver, active } = useDroppable({
    id: `cell-${roomId}-${roomNumber}-${dateStr}`,
    data: { roomId, roomNumber, date },
  });

  /* ===================== BOOKING LOGIC ===================== */
  const isStart = booking
    ? booking.check_in === dateStr ||
      (booking.check_in < firstVisibleStr && dateStr === firstVisibleStr && booking.check_out > dateStr)
    : false;

  let visibleNights = booking?.total_nights;
  const isTruncatedLeft = booking && booking.check_in < firstVisibleStr && dateStr === firstVisibleStr;

  if (isTruncatedLeft && booking) {
    const checkOutDate = parseISO(booking.check_out);
    visibleNights = differenceInDays(checkOutDate, firstVisibleDate);
  }

  const hasBooking = booking !== null;
  const isClickable = !isBlocked && !hasBooking;
  const canDrop = !isBlocked && !hasBooking;

  /* ===================== DRAG STATE ===================== */
  const isDragging = active !== null;
  const showDropIndicator = isOver && isDragging && !isResizing;

  const resizePreview = booking && getResizePreview ? getResizePreview(booking.id) : undefined;

  const draggedBooking = activeBooking || (active?.data?.current?.booking as Booking | undefined);

  const cell = (
    <td
      ref={setNodeRef}
      data-today={isToday ? "true" : undefined}
      onClick={() => handleCellClick(roomId, roomNumber, date, isBlocked, hasBooking)}
      onContextMenu={(e) => handleRightClick(e, roomId, roomNumber, date)}
      className={cn(
        "border border-border p-0 relative h-10 md:h-14 overflow-visible transition-all duration-150",
        isHolidayOrWeekend && "bg-red-50/20 dark:bg-red-950/10",
        !isHolidayOrWeekend && "bg-background",
        isToday && "bg-primary/10 ring-2 ring-primary/60 z-10",
        isClickable && "hover:bg-primary/5 hover:ring-1 hover:ring-primary/30 cursor-pointer",
        !isClickable && "cursor-context-menu",
        showDropIndicator && canDrop && "bg-primary/20 ring-2 ring-primary",
        showDropIndicator && !canDrop && "bg-destructive/20 ring-2 ring-destructive",
      )}
      style={{ width: cellWidth, minWidth: cellWidth, maxWidth: cellWidth }}
      title={isBlocked ? `Blocked: ${blockReason || "No reason specified"}` : undefined}
    >
      {/* BLOCKED */}
      {isBlocked && <BlockedCellOverlay reason={blockReason} />}

      {/* BOOKING BAR */}
      {booking && !isBlocked && isStart && (
        <BookingBar
          booking={booking}
          onClick={() => handleBookingClick(booking)}
          visibleNights={visibleNights}
          isTruncatedLeft={!!isTruncatedLeft}
          cellWidth={cellWidth}
          roomNumber={roomNumber}
          roomId={roomId}
          onResizeStart={onResizeStart}
          resizePreview={resizePreview}
          isResizing={isResizing}
        />
      )}

      {/* DROP PREVIEW */}
      {showDropIndicator && canDrop && draggedBooking && (
        <div
          className="absolute top-0.5 bottom-0.5 bg-gradient-to-r from-cyan-400/60 to-cyan-500/60 rounded-md flex items-center border-2 border-dashed border-cyan-400 pointer-events-none"
          style={{
            left: `${cellWidth / 2}px`,
            width: `${draggedBooking.total_nights * cellWidth}px`,
            zIndex: 50,
          }}
        >
          <div className="flex flex-col gap-0.5 ml-1 md:ml-2">
            <div className="w-2 md:w-3 h-0.5 bg-white/90 rounded-full" />
            <div className="w-2 md:w-3 h-0.5 bg-white/90 rounded-full" />
            <div className="w-2 md:w-3 h-0.5 bg-white/90 rounded-full" />
          </div>
          <div className="ml-1 md:ml-2 text-[9px] md:text-xs font-bold text-white truncate">
            {draggedBooking.guest_name.split(" ")[0]}
          </div>
          <div className="ml-1 md:ml-2 text-[8px] md:text-[10px] text-white/80 hidden md:block">
            {draggedBooking.total_nights}M
          </div>
        </div>
      )}

      {/* CLICK HINT */}
      {isClickable && !isDragging && !isResizing && (
        <div className="absolute inset-0 hidden md:flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <div className="text-[10px] text-primary/60 font-medium">Click to book</div>
        </div>
      )}
    </td>
  );

  /* ===================== HOLIDAY TOOLTIP ===================== */
  if (holiday && !booking) {
    return (
      <TooltipProvider key={`${roomNumber}-${date.toISOString()}`}>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{cell}</TooltipTrigger>
          <TooltipContent side="top" className="bg-red-600 text-white">
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












