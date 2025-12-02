import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Booking } from "../types";
import { getBookingColor } from "../utils/styleHelpers";

interface BookingBarProps {
  booking: Booking;
  onClick: () => void;
  visibleNights?: number;
  isTruncatedLeft?: boolean;
  cellWidth: number;
  roomNumber: string;
  roomId: string;
}

export const BookingBar = ({
  booking,
  onClick,
  visibleNights,
  isTruncatedLeft,
  cellWidth,
  roomNumber,
  roomId,
}: BookingBarProps) => {
  const totalNights = visibleNights ?? booking.total_nights;
  const bookingWidth = `${totalNights * cellWidth - 1}px`;
  const isPending = booking.status === "pending";

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: {
      booking,
      sourceRoomNumber: roomNumber,
      sourceRoomId: roomId,
    },
  });

  const style = {
    left: isTruncatedLeft ? "0" : `${cellWidth / 2}px`,
    width: bookingWidth,
    boxSizing: "border-box" as const,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 5,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      onClick();
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={cn(
        "absolute top-0.5 bottom-0.5 bg-gradient-to-r flex items-center justify-center transition-all duration-200 text-xs shadow-sm hover:shadow-md hover:brightness-110 overflow-visible cursor-grab active:cursor-grabbing",
        isTruncatedLeft ? "rounded-r-md" : "rounded-md",
        getBookingColor(booking),
        isDragging && "ring-2 ring-primary shadow-lg"
      )}
      style={style}
    >
      {/* Content */}
      <div className="relative z-10 text-left px-2 py-1 w-full space-y-0.5">
        <div className="font-bold text-xs text-white drop-shadow-sm truncate">
          {booking.guest_name.split(" ")[0]}
        </div>
        <div className="text-[10px] text-white/90 font-medium">
          {booking.total_nights} Malam
        </div>
      </div>

      {/* LCO Badge */}
      {booking.check_out_time && booking.check_out_time !== "12:00:00" && (
        <div className="absolute -right-0.5 -top-1 z-30">
          <div className="bg-red-600 text-white text-[7px] px-1 py-0.5 rounded-sm font-bold shadow-sm whitespace-nowrap">
            LCO
          </div>
        </div>
      )}

      {/* Status watermark */}
      {!isPending && (
        <div className="absolute right-1 bottom-0.5 opacity-40 pointer-events-none">
          <span className="text-white/70 font-bold text-[8px] tracking-wider whitespace-nowrap">
            {booking.status === "confirmed" ? "CONFIRMED" : booking.status.toUpperCase()}
          </span>
        </div>
      )}

      {isPending && (
        <div className="absolute right-1 bottom-0.5 opacity-50 pointer-events-none">
          <span className="text-white/80 font-black text-[8px] tracking-wider whitespace-nowrap">
            PENDING
          </span>
        </div>
      )}
    </div>
  );
};
