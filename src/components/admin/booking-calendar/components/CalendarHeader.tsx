import { format } from "date-fns";
import { isWIBToday } from "@/utils/wibTimezone";
import { cn } from "@/lib/utils";

export function CalendarHeader({ dates, cellWidth }: { dates: Date[]; cellWidth: number }) {
  return (
    <div
      className="sticky top-0 z-30 bg-background grid border-b"
      style={{
        gridTemplateColumns: `repeat(${dates.length}, ${cellWidth}px)`,
      }}
    >
      {dates.map((date) => {
        const isToday = isWIBToday(date);

        return (
          <div
            key={date.toISOString()}
            className={cn(
              "h-14 border-r flex flex-col items-center justify-center",
              isToday && "bg-sky-100 dark:bg-sky-950",
            )}
          >
            <span className="text-sm font-semibold">{format(date, "dd")}</span>

            {isToday && (
              <span className="mt-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-500 text-white font-bold">TODAY</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
