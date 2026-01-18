import { Search, FileText, FileSpreadsheet, CalendarIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Room {
  id: string;
  name: string;
}

interface BookingFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (source: string) => void;
  filterDateType: "check_in" | "check_out";
  onFilterDateTypeChange: (type: "check_in" | "check_out") => void;
  startDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  rooms?: Room[];
  roomTypeFilter?: string;
  onRoomTypeFilterChange?: (roomId: string) => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
}

export function BookingFilters({
  searchQuery,
  onSearchQueryChange,
  filterStatus,
  onFilterStatusChange,
  sourceFilter,
  onSourceFilterChange,
  filterDateType,
  onFilterDateTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  rooms,
  roomTypeFilter = "all",
  onRoomTypeFilterChange,
  onExportPDF,
  onExportExcel,
}: BookingFiltersProps) {
  const hasDateFilter = startDate || endDate;

  return (
    <div className="space-y-3">
      {/* Top Row: Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* All Booking / Date Type */}
        <Select value={filterDateType} onValueChange={(v) => onFilterDateTypeChange(v as "check_in" | "check_out")}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="check_in">Check-in</SelectItem>
            <SelectItem value="check_out">Check-out</SelectItem>
          </SelectContent>
        </Select>

        {/* Type & Room Filter */}
        {rooms && rooms.length > 0 && onRoomTypeFilterChange && (
          <Select value={roomTypeFilter} onValueChange={onRoomTypeFilterChange}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Type & Room" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={onFilterStatusChange}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>

        {/* Source Filter */}
        <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
            <SelectItem value="ota">OTA</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 w-[120px] justify-start text-left font-normal text-sm",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {startDate ? format(startDate, "dd MMM", { locale: localeId }) : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={onStartDateChange}
              locale={localeId}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 w-[120px] justify-start text-left font-normal text-sm",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {endDate ? format(endDate, "dd MMM", { locale: localeId }) : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
              locale={localeId}
            />
          </PopoverContent>
        </Popover>

        {hasDateFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2"
            onClick={() => {
              onStartDateChange(undefined);
              onEndDateChange(undefined);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search booking..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Export Buttons */}
        {onExportPDF && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm gap-1.5"
            onClick={onExportPDF}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
        )}

        {onExportExcel && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm gap-1.5"
            onClick={onExportExcel}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
        )}
      </div>
    </div>
  );
}