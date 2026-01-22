import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewRange } from "../types";
interface CalendarHeaderProps {
  viewRange: ViewRange;
  onViewRangeChange: (range: ViewRange) => void;
  currentMonthYear: string;
  monthYearOptions: {
    value: string;
    label: string;
  }[];
  onMonthYearChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onExport: () => void;
}
export const CalendarHeader = ({
  viewRange,
  onViewRangeChange,
  currentMonthYear,
  monthYearOptions,
  onMonthYearChange,
  onPrev,
  onNext,
  onToday,
  onExport
}: CalendarHeaderProps) => {
  return <div className="p-2 md:p-4 border-b border-border bg-slate-300">
      <div className="flex flex-wrap items-center gap-2 md:gap-4">
        {/* View Range Selector */}
        <div className="flex gap-0.5 md:gap-1 bg-background rounded-lg p-0.5 md:p-1 shadow-sm border border-border">
          <Button variant={viewRange === 7 ? "default" : "ghost"} size="sm" onClick={() => onViewRangeChange(7)} className="text-[10px] md:text-xs px-2 md:px-4 h-7 md:h-8">
            Week
          </Button>
          <Button variant={viewRange === 14 ? "default" : "ghost"} size="sm" onClick={() => onViewRangeChange(14)} className="text-[10px] md:text-xs px-2 md:px-4 h-7 md:h-8">
            14D
          </Button>
          <Button variant={viewRange === 30 ? "default" : "ghost"} size="sm" onClick={() => onViewRangeChange(30)} className="text-[10px] md:text-xs px-2 md:px-4 h-7 md:h-8">
            1 Mo 
          </Button>
        </div>

        {/* Month/Year Filter */}
        <Select value={currentMonthYear} onValueChange={onMonthYearChange}>
          <SelectTrigger className="w-[120px] md:w-[180px] text-xs md:text-sm h-7 md:h-9">
            <SelectValue placeholder="Pilih Bulan" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {monthYearOptions.map(option => <SelectItem key={option.value} value={option.value} className="text-xs md:text-sm">
                {option.label}
              </SelectItem>)}
          </SelectContent>
        </Select>

        {/* Navigation Buttons */}
        <div className="flex gap-0.5 md:gap-1">
          <Button onClick={onPrev} variant="outline" size="icon" className="h-7 w-7 md:h-9 md:w-9">
            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
          <Button onClick={onToday} variant="outline" size="sm" className="text-[10px] md:text-xs px-2 md:px-3 font-medium h-7 md:h-9">
            Today
          </Button>
          <Button onClick={onNext} variant="outline" size="icon" className="h-7 w-7 md:h-9 md:w-9">
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </div>

        {/* Export Button */}
        <Button onClick={onExport} variant="default" size="sm" className="text-[10px] md:text-xs px-2 md:px-4 h-7 md:h-8">
          <Download className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
          <span className="hidden md:inline">Export</span>
        </Button>
      </div>
    </div>;
};