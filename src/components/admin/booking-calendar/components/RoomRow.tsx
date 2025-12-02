import React, { useState, useRef } from "react";

export const RoomCell = ({ booking, ...props }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (booking) {
      hoverTimer.current = setTimeout(() => {
        setShowTooltip(true);
      }, 2000); // 2 detik bro
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setShowTooltip(false);
  };

  const nights =
    booking &&
    Math.ceil(
      (new Date(booking.checkoutDate).getTime() - new Date(booking.checkinDate).getTime()) / (1000 * 60 * 60 * 24),
    );

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Booking Bar */}
      {booking && <div className="booking-bar bg-blue-500 rounded-sm h-5 w-full" />}

      {/* Tooltip muncul setelah hover 2 detik */}
      {showTooltip && booking && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 
                        bg-black text-white text-xs p-2 rounded shadow-md w-max max-w-[180px]"
        >
          <div>
            <strong>{booking.fullName}</strong>
          </div>
          <div>{nights} malam</div>
          <div>Sumber: {booking.source}</div>
        </div>
      )}
    </div>
  );
};
