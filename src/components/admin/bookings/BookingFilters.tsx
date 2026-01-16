import { Search } from "lucide-react";
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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
}: BookingFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Cari kode booking, nama tamu, email, atau nomor telepon..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-2 md:gap-4">
        {/* Date Type Filter */}
        <Select value={filterDateType} onValueChange={(v) => onFilterDateTypeChange(v as "check_in" | "check_out")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="check_in">Check-in</SelectItem>
            <SelectItem value="check_out">Check-out</SelectItem>
          </SelectContent>
        </Select>

        {/* Start Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "dd MMM yyyy", { locale: localeId }) : "Dari"}
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

        {/* End Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "dd MMM yyyy", { locale: localeId }) : "Sampai"}
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

        {/* Clear Date Filter */}
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onStartDateChange(undefined);
              onEndDateChange(undefined);
            }}
          >
            Reset Tanggal
          </Button>
        )}

        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={onFilterStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Source Filter */}
        <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sumber" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Sumber</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
            <SelectItem value="ota">OTA</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
            <SelectItem value="other">Lainnya</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
