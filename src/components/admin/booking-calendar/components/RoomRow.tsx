import { format } from "date-fns";
import { RoomCell } from "./RoomCell";

export function RoomRow({ room, dates, cellWidth }: any) {
  return (
    <div
      className="relative grid border-b h-14"
      style={{
        gridTemplateColumns: `repeat(${dates.length}, ${cellWidth}px)`,
      }}
    >
      {/* cells */}
      {dates.map((date) => (
        <RoomCell key={date.toISOString()} date={date} cellWidth={cellWidth} />
      ))}

      {/* booking bar */}
      {room.booking && (
        <div
          className="absolute top-1 bottom-1 rounded-lg bg-blue-500 text-white px-2 flex items-center shadow"
          style={{
            left: room.booking.startIndex * cellWidth,
            width: room.booking.nights * cellWidth,
          }}
        >
          <div className="truncate text-sm font-semibold">{room.booking.guest_name}</div>
        </div>
      )}
    </div>
  );
}
