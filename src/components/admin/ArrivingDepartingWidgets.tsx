import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DoorOpen, DoorClosed, Search, X, User, Clock, Home } from "lucide-react";
import { isToday, isTomorrow, isYesterday, parseISO, format } from "date-fns";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { cn } from "@/lib/utils";
import { formatTimeID } from "@/utils/indonesianFormat";
import { getWIBNow, formatWIBDate } from "@/utils/wibTimezone";

type FilterType = "today" | "tomorrow" | "yesterday";

interface Booking {
  id: string;
  booking_code: string;
  guest_name: string;
  num_guests: number;
  allocated_room_number?: string | null;
  check_in: string;
  check_out: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  status: string;
  rooms?: { name: string };
}

/* =======================
   STATUS LOGIC
======================= */
const getGuestStatus = (booking: Booking, type: "arriving" | "departing") => {
  const now = getWIBNow();
  const currentTime = format(now, "HH:mm:ss");
  const todayStr = formatWIBDate(now);

  const checkInTime = booking.check_in_time || "14:00:00";
  const checkOutTime = booking.check_out_time || "12:00:00";

  if (type === "arriving") {
    if (booking.check_in === todayStr) {
      return currentTime >= checkInTime
        ? { label: "Sudah Check-In", variant: "checked-in" }
        : { label: "Menunggu Check-In", variant: "waiting" };
    }
    return { label: "Terkonfirmasi", variant: "confirmed" };
  }

  if (booking.check_out === todayStr) {
    return currentTime >= checkOutTime
      ? { label: "Sudah Check-Out", variant: "checked-out" }
      : { label: "Sedang Menginap", variant: "staying" };
  }

  return { label: "Terkonfirmasi", variant: "confirmed" };
};

const getDynamicStatusBadge = (status: { label: string; variant: string }) => {
  const variants: Record<string, string> = {
    "checked-in": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "checked-out": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    waiting: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    staying: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  return <Badge className={cn("border-0", variants[status.variant])}>{status.label}</Badge>;
};

/* =======================
   MAIN COMPONENT
======================= */
export const ArrivingDepartingWidgets = () => {
  const { bookings } = useAdminBookings();

  const [arrivingFilter, setArrivingFilter] = useState<FilterType>("today");
  const [arrivingSearch, setArrivingSearch] = useState("");

  const [departingFilter, setDepartingFilter] = useState<FilterType>("today");
  const [departingSearch, setDepartingSearch] = useState("");

  const arrivingBookings = useMemo(() => {
    if (!bookings) return [];

    return bookings.filter((b) => {
      const d = parseISO(b.check_in);
      return (
        ((arrivingFilter === "today" && isToday(d)) ||
          (arrivingFilter === "tomorrow" && isTomorrow(d)) ||
          (arrivingFilter === "yesterday" && isYesterday(d))) &&
        b.guest_name.toLowerCase().includes(arrivingSearch.toLowerCase()) &&
        b.status === "confirmed"
      );
    });
  }, [bookings, arrivingFilter, arrivingSearch]);

  const departingBookings = useMemo(() => {
    if (!bookings) return [];

    const now = getWIBNow();
    const currentTime = format(now, "HH:mm:ss");
    const todayStr = formatWIBDate(now);

    return bookings.filter((b) => {
      const d = parseISO(b.check_out);

      if (departingFilter === "today" && b.check_out === todayStr) {
        if (currentTime > (b.check_out_time || "12:00:00")) return false;
      }

      return (
        ((departingFilter === "today" && isToday(d)) ||
          (departingFilter === "tomorrow" && isTomorrow(d)) ||
          (departingFilter === "yesterday" && isYesterday(d))) &&
        b.guest_name.toLowerCase().includes(departingSearch.toLowerCase()) &&
        b.status === "confirmed"
      );
    });
  }, [bookings, departingFilter, departingSearch]);

  const FilterButtons = ({
    activeFilter,
    onChange,
  }: {
    activeFilter: FilterType;
    onChange: (f: FilterType) => void;
  }) => (
    <div className="flex gap-1">
      {(["today", "tomorrow", "yesterday"] as FilterType[]).map((f) => (
        <Button
          key={f}
          size="sm"
          variant={activeFilter === f ? "default" : "ghost"}
          className="h-7 text-xs"
          onClick={() => onChange(f)}
        >
          {f === "today" ? "Hari Ini" : f === "tomorrow" ? "Besok" : "Kemarin"}
        </Button>
      ))}
    </div>
  );

  const renderTable = (data: Booking[], type: "arriving" | "departing") => {
    if (!data.length) {
      return (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Belum ada tamu {type === "arriving" ? "check-in" : "check-out"} ✨
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <User className="h-3 w-3 inline mr-1" />
              Tamu
            </TableHead>
            <TableHead>
              <Home className="h-3 w-3 inline mr-1" />
              Kamar
            </TableHead>
            <TableHead>
              <Clock className="h-3 w-3 inline mr-1" />
              Waktu
            </TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((b) => {
            const status = getGuestStatus(b, type);
            return (
              <TableRow key={b.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="font-medium">{b.guest_name}</div>
                  <div className="text-xs text-muted-foreground">{b.num_guests} tamu</div>
                </TableCell>
                <TableCell>{b.allocated_room_number || b.rooms?.name || "-"}</TableCell>
                <TableCell>
                  {formatTimeID(((type === "arriving" ? b.check_in_time : b.check_out_time) ?? "12:00").slice(0, 5))}
                </TableCell>
                <TableCell className="text-right">{getDynamicStatusBadge(status)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ARRIVING */}
      <Card className="border rounded-xl shadow-md shadow-black/5 hover:shadow-xl hover:shadow-black/10 transition-all dark:shadow-black/40">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-emerald-500" />
              Tamu Check-In
            </CardTitle>
            <FilterButtons activeFilter={arrivingFilter} onChange={setArrivingFilter} />
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Cari nama tamu..."
              value={arrivingSearch}
              onChange={(e) => setArrivingSearch(e.target.value)}
            />
            {arrivingSearch && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setArrivingSearch("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>{renderTable(arrivingBookings, "arriving")}</CardContent>
      </Card>

      {/* DEPARTING */}
      <Card className="border rounded-xl shadow-md shadow-black/5 hover:shadow-xl hover:shadow-black/10 transition-all dark:shadow-black/40">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <DoorClosed className="h-5 w-5 text-amber-500" />
              Tamu Check-Out
            </CardTitle>
            <FilterButtons activeFilter={departingFilter} onChange={setDepartingFilter} />
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Cari nama tamu..."
              value={departingSearch}
              onChange={(e) => setDepartingSearch(e.target.value)}
            />
            {departingSearch && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setDepartingSearch("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>{renderTable(departingBookings, "departing")}</CardContent>
      </Card>
    </div>
  );
};
