import { useEffect, useRef } from "react";
import { isWIBToday } from "@/utils/wibTimezone";
import { CalendarHeader } from "./CalendarHeader";
import { RoomList } from "./RoomList";

interface Props {
  dates: Date[];
  rooms: any[];
  cellWidth: number;
}

export function BookingCalendar({ dates, rooms, cellWidth }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // auto scroll to today
  useEffect(() => {
    const todayIndex = dates.findIndex(isWIBToday);
    if (todayIndex === -1 || !scrollRef.current) return;

    const container = scrollRef.current;
    const left = todayIndex * cellWidth - container.clientWidth / 2 + cellWidth / 2;

    container.scrollTo({ left: Math.max(left, 0), behavior: "smooth" });
  }, [dates, cellWidth]);

  return (
    <div className="relative h-full">
      <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden">
        <div style={{ width: dates.length * cellWidth }}>
          <CalendarHeader dates={dates} cellWidth={cellWidth} />
          <RoomList rooms={rooms} dates={dates} cellWidth={cellWidth} />
        </div>
      </div>
    </div>
  );
}
