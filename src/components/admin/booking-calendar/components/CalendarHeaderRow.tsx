import { format, getDay } from "date-fns";
import { Virtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { isWIBToday } from "@/utils/wibTimezone";
import { isIndonesianHoliday } from "@/utils/indonesianHolidays";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DAY_NAMES } from "../types";

const DAY_NAMES_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

interface CalendarHeaderRowProps {
  dates: Date[];
  cellWidth: number;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
}

export const CalendarHeaderRow = ({ dates, cellWidth, virtualizer }: CalendarHeaderRowProps) => {
  return (
    <tr className="bg-muted/50">
      <th className="sticky left-0 top-0 z-50 w-[80px] md:w-[110px] min-w-[80px] md:min-w-[110px] border-2 border-border p-1 md:p-2 shadow-lg bg-gray-300/80 dark:bg-gray-700/80 backdrop-blur-md">
        <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-wide">Kamar</span>
      </th>
      
      {/* Virtual columns container */}
      <th 
        className="p-0 relative border-0"
        style={{ width: virtualizer.getTotalSize(), height: "auto" }}
        colSpan={dates.length}
      >
        {virtualizer.getVirtualItems().map((virtualColumn) => {
          const date = dates[virtualColumn.index];
          const dayIndex = getDay(date);
          const isWeekend = dayIndex === 0 || dayIndex === 6;
          const holiday = isIndonesianHoliday(date);
          const isHolidayOrWeekend = isWeekend || holiday !== null;
          const isTodayDate = isWIBToday(date);

          const headerContent = (
            <div
              key={virtualColumn.key}
              className={cn(
                "absolute top-0 bottom-0 border-2 border-border p-0.5 md:p-1.5 text-center transition-colors backdrop-blur-md shadow-md flex flex-col justify-center",
                isHolidayOrWeekend ? "bg-red-100/70 dark:bg-red-950/40" : "bg-white/60 dark:bg-gray-800/60"
              )}
              style={{
                left: virtualColumn.start,
                width: cellWidth,
              }}
            >
              {/* Center divider */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/40 -translate-x-px pointer-events-none" />

              {/* TODAY badge */}
              {isTodayDate && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[6px] md:text-[8px] px-1 md:px-1.5 py-0.5 rounded-b-full font-bold shadow-md z-10">
                  TODAY
                </div>
              )}

              <div className={cn(
                "text-[8px] md:text-[10px] font-medium uppercase",
                isHolidayOrWeekend ? "text-red-600" : "text-muted-foreground"
              )}>
                <span className="md:hidden">{DAY_NAMES_SHORT[dayIndex]}</span>
                <span className="hidden md:inline">{DAY_NAMES[dayIndex]}</span>
              </div>

              <div className={cn("text-sm md:text-base font-bold", isHolidayOrWeekend && "text-red-600")}>
                {format(date, "d")}
              </div>

              {holiday && <div className="text-[7px] md:text-[8px] text-red-600 font-semibold mt-0.5">🎉</div>}
            </div>
          );

          if (holiday) {
            return (
              <TooltipProvider key={virtualColumn.key}>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>{headerContent}</TooltipTrigger>
                  <TooltipContent side="top" className="bg-red-600 text-white font-medium">
                    <div className="text-xs">
                      <div className="font-bold">{holiday.name}</div>
                      <div className="text-[10px] opacity-90">{format(date, "d MMMM yyyy")}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return headerContent;
        })}
      </th>
    </tr>
  );
};
