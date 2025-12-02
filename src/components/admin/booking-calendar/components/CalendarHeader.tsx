import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewRange } from "../types";

interface CalendarHeaderProps {
  viewRange: ViewRange;
  onViewRangeChange: (range: ViewRange) => void;
  currentMonthYear: string;
  monthYearOptions: { value: string; label: string }[];
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
  onExport,
}: CalendarHeaderProps) => {
  return (
    <div className="p-4 border-b border-border bg-slate-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Range Selector */}
          <div className="flex gap-1 bg-background rounded-lg p-1 shadow-sm border border-border">
            <Button
              variant={viewRange === 7 ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewRangeChange(7)}
              className="text-xs px-4"
            >
              7 Hari
            </Button>
            <Button
              variant={viewRange === 14 ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewRangeChange(14)}
              className="text-xs px-4"
            >
              14 Hari
            </Button>
            <Button
              variant={viewRange === 30 ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewRangeChange(30)}
              className="text-xs px-4"
            >
              30 Hari
            </Button>
          </div>

          {/* Month/Year Filter */}
          <Select value={currentMonthYear} onValueChange={onMonthYearChange}>
            <SelectTrigger className="w-[180px] text-sm">
              <SelectValue placeholder="Pilih Bulan" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {monthYearOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Navigation Buttons */}
          <div className="flex gap-1">
            <Button onClick={onPrev} variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button onClick={onToday} variant="outline" size="sm" className="text-xs px-3 font-medium">
              Today
            </Button>
            <Button onClick={onNext} variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Export Button */}
          <Button onClick={onExport} variant="default" size="sm" className="text-xs px-4">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
};
