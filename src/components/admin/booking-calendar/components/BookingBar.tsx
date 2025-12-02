import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState, useRef } from "react";
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
  onResizeStart?: (e: React.MouseEvent, booking: Booking, edge: "left" | "right") => void;
  resizePreview?: { previewDays: number; edge: "left" | "right" | null };
  isResizing?: boolean;
}

export const BookingBar = ({
  booking,
  onClick,
  visibleNights,
  isTruncatedLeft,
  cellWidth,
  roomNumber,
  roomId,
  onResizeStart,
  resizePreview,
  isResizing,
}: BookingBarProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  
  const totalNights = visibleNights ?? booking.total_nights;
  
  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => {
      setShowTooltip(true);
    }, 2000);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setShowTooltip(false);
  };

  const getBookingSourceLabel = () => {
    switch (booking.booking_source) {
      case "direct":
        return "Direct Booking";
      case "ota":
        return booking.ota_name || "OTA";
      case "walk_in":
        return "Walk-in";
      case "other":
        return booking.other_source || "Lainnya";
      default:
        return "Direct";
    }
  };
  
  // Calculate width with resize preview
  let adjustedNights = totalNights;
  if (resizePreview && resizePreview.edge) {
    if (resizePreview.edge === "left") {
      adjustedNights = totalNights - resizePreview.previewDays;
    } else {
      adjustedNights = totalNights + resizePreview.previewDays;
    }
    adjustedNights = Math.max(1, adjustedNights); // Minimum 1 night
  }
  
  const bookingWidth = `${adjustedNights * cellWidth}px`;
  const isPending = booking.status === "pending";

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: {
      booking,
      sourceRoomNumber: roomNumber,
      sourceRoomId: roomId,
    },
    disabled: isResizing,
  });

  // Calculate left offset with resize preview for left edge
  // Booking bar starts at CENTER of check-in cell (left: cellWidth/2)
  let leftOffset = isTruncatedLeft ? 0 : cellWidth / 2;
  if (resizePreview?.edge === "left") {
    leftOffset += resizePreview.previewDays * cellWidth;
  }

  const style = {
    left: `${leftOffset}px`,
    width: bookingWidth,
    boxSizing: "border-box" as const,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging || isResizing ? 100 : 5,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) {
      onClick();
    }
  };

  const handleLeftResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onResizeStart?.(e, booking, "left");
  };

  const handleRightResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onResizeStart?.(e, booking, "right");
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "absolute top-0.5 bottom-0.5 bg-gradient-to-r flex items-center transition-all text-xs shadow-sm hover:shadow-md hover:brightness-110 group",
        isTruncatedLeft ? "rounded-r-md" : "rounded-md",
        getBookingColor(booking),
        isDragging && "ring-2 ring-primary shadow-lg",
        isResizing && "ring-2 ring-yellow-400 shadow-lg"
      )}
      style={style}
    >
      {/* Tooltip - appears after 2 second hover */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[200] pointer-events-none">
          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <div className="font-semibold">{booking.guest_name}</div>
            <div className="text-gray-300 mt-1">{booking.total_nights} Malam</div>
            <div className="text-gray-300">Sumber: {getBookingSourceLabel()}</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
      {/* Drag handle - compact, icon shows on hover */}
      {!isTruncatedLeft && (
        <div
          {...listeners}
          {...attributes}
          className="absolute left-0 top-0 bottom-0 w-5 cursor-grab active:cursor-grabbing z-20 flex items-center justify-center group/drag"
        >
          <div className="flex flex-col gap-0.5 opacity-0 group-hover/drag:opacity-100 transition-opacity">
            <div className="w-2 h-0.5 bg-white/90 rounded-full" />
            <div className="w-2 h-0.5 bg-white/90 rounded-full" />
            <div className="w-2 h-0.5 bg-white/90 rounded-full" />
          </div>
        </div>
      )}

      {/* Left resize handle */}
      {!isTruncatedLeft && (
        <div
          onMouseDown={handleLeftResizeStart}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-opacity rounded-l-md"
          title="Drag to change check-in date"
        />
      )}

      {/* Right resize handle */}
      <div
        onMouseDown={handleRightResizeStart}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-opacity rounded-r-md"
        title="Drag to change check-out date"
      />

      {/* Content - compact margin for drag handle */}
      <div className="relative z-5 text-left px-1.5 py-0.5 flex-1 min-w-0 pointer-events-none ml-4">
        <div className="font-bold text-xs text-white drop-shadow-sm truncate">
          {booking.guest_name.split(" ")[0]}
        </div>
        <div className="text-[10px] text-white/90 font-medium truncate">
          {resizePreview?.edge ? `${adjustedNights} Malam` : `${booking.total_nights} Malam`}
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
