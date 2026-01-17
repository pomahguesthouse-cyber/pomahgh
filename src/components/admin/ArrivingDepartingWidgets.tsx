import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DoorOpen, DoorClosed, Search, X, User, Clock, Home } from "lucide-react";
import { isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { cn } from "@/lib/utils";
import { formatDateShortID, formatTimeID } from "@/utils/indonesianFormat";

type FilterType = "today" | "tomorrow" | "yesterday";

interface Booking {
  id: string;
  booking_code: string;
  guest_name: string;
  num_guests: number;
  allocated_room_number?: string | null;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  rooms?: { name: string };
}

export const ArrivingDepartingWidgets = () => {
  const { bookings } = useAdminBookings();

  const [arrivingFilter, setArrivingFilter] = useState<FilterType>("today");
  const [arrivingSearch, setArrivingSearch] = useState("");

  const [departingFilter, setDepartingFilter] = useState<FilterType>("today");
  const [departingSearch, setDepartingSearch] = useState("");

  const arrivingBookings = useMemo(() => {
    if (!bookings) return [];

    return bookings.filter((booking) => {
      const checkInDate = parseISO(booking.check_in);
      const matchesFilter =
        (arrivingFilter === "today" && isToday(checkInDate)) ||
        (arrivingFilter === "tomorrow" && isTomorrow(checkInDate)) ||
        (arrivingFilter === "yesterday" && isYesterday(checkInDate));

      const matchesSearch = booking.guest_name.toLowerCase().includes(arrivingSearch.toLowerCase());

      return matchesFilter && matchesSearch && booking.status === "confirmed";
    });
  }, [bookings, arrivingFilter, arrivingSearch]);

  const departingBookings = useMemo(() => {
    if (!bookings) return [];

    return bookings.filter((booking) => {
      const checkOutDate = parseISO(booking.check_out);
      const matchesFilter =
        (departingFilter === "today" && isToday(checkOutDate)) ||
        (departingFilter === "tomorrow" && isTomorrow(checkOutDate)) ||
        (departingFilter === "yesterday" && isYesterday(checkOutDate));

      const matchesSearch = booking.guest_name.toLowerCase().includes(departingSearch.toLowerCase());

      return matchesFilter && matchesSearch && booking.status === "confirmed";
    });
  }, [bookings, departingFilter, departingSearch]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-900/30 dark:text-emerald-400">
            Terkonfirmasi
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-0 dark:bg-amber-900/30 dark:text-amber-400">
            Menunggu
          </Badge>
        );
      case 'checked_in':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-0 dark:bg-blue-900/30 dark:text-blue-400">
            Sudah Check-in
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">{status}</Badge>
        );
    }
  };

  const renderBookingTable = (bookings: Booking[], type: "arriving" | "departing") => {
    if (bookings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-muted mb-3">
            {type === "arriving" ? (
              <DoorOpen className="h-5 w-5 text-muted-foreground" />
            ) : (
              <DoorClosed className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {type === "arriving" 
              ? "Belum ada tamu check-in untuk tanggal ini" 
              : "Belum ada tamu check-out untuk tanggal ini"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Semoga hari Anda menyenangkan! 🌟
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Tamu
              </div>
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" />
                Kamar
              </div>
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Waktu
              </div>
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => {
            const displayTime = type === "arriving" ? booking.check_in_time : booking.check_out_time;

            return (
              <TableRow key={booking.id} className="hover:bg-muted/50">
                <TableCell>
                  <div>
                    <div className="font-medium text-sm">{booking.guest_name}</div>
                    <div className="text-xs text-muted-foreground">{booking.num_guests} Tamu</div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {booking.allocated_room_number || booking.rooms?.name || '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {displayTime ? formatTimeID(displayTime.slice(0, 5)) : (type === "arriving" ? "14:00" : "12:00")}
                </TableCell>
                <TableCell className="text-right">
                  {getStatusBadge(booking.status)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const FilterButtons = ({
    activeFilter,
    onFilterChange,
  }: {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
  }) => (
    <div className="flex gap-1">
      {[
        { key: 'today' as FilterType, label: 'Hari Ini' },
        { key: 'tomorrow' as FilterType, label: 'Besok' },
        { key: 'yesterday' as FilterType, label: 'Kemarin' }
      ].map(({ key, label }) => (
        <Button
          key={key}
          variant={activeFilter === key ? "default" : "ghost"}
          size="sm"
          onClick={() => onFilterChange(key)}
          className={cn(
            "h-7 text-xs",
            activeFilter === key 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Arriving Widget */}
      <Card className="border rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                <DoorOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Tamu Check-In</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {arrivingBookings.length} tamu
                </p>
              </div>
            </div>
            <FilterButtons activeFilter={arrivingFilter} onFilterChange={setArrivingFilter} />
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama tamu..."
              value={arrivingSearch}
              onChange={(e) => setArrivingSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {arrivingSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setArrivingSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {renderBookingTable(arrivingBookings, "arriving")}
        </CardContent>
      </Card>

      {/* Departing Widget */}
      <Card className="border rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30">
                <DoorClosed className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Tamu Check-Out</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {departingBookings.length} tamu
                </p>
              </div>
            </div>
            <FilterButtons activeFilter={departingFilter} onFilterChange={setDepartingFilter} />
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama tamu..."
              value={departingSearch}
              onChange={(e) => setDepartingSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {departingSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setDepartingSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {renderBookingTable(departingBookings, "departing")}
        </CardContent>
      </Card>
    </div>
  );
};
