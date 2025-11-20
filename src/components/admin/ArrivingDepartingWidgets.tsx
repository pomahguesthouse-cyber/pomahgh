import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaneIcon, PlaneLanding, Search, X } from "lucide-react";
import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { cn } from "@/lib/utils";

type FilterType = "today" | "tomorrow" | "yesterday";

interface Booking {
  id: string;
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
    
    return bookings.filter(booking => {
      const checkInDate = parseISO(booking.check_in);
      const matchesFilter =
        (arrivingFilter === "today" && isToday(checkInDate)) ||
        (arrivingFilter === "tomorrow" && isTomorrow(checkInDate)) ||
        (arrivingFilter === "yesterday" && isYesterday(checkInDate));
      
      const matchesSearch = booking.guest_name
        .toLowerCase()
        .includes(arrivingSearch.toLowerCase());
      
      return matchesFilter && matchesSearch && booking.status === "confirmed";
    });
  }, [bookings, arrivingFilter, arrivingSearch]);

  const departingBookings = useMemo(() => {
    if (!bookings) return [];
    
    return bookings.filter(booking => {
      const checkOutDate = parseISO(booking.check_out);
      const matchesFilter =
        (departingFilter === "today" && isToday(checkOutDate)) ||
        (departingFilter === "tomorrow" && isTomorrow(checkOutDate)) ||
        (departingFilter === "yesterday" && isYesterday(checkOutDate));
      
      const matchesSearch = booking.guest_name
        .toLowerCase()
        .includes(departingSearch.toLowerCase());
      
      return matchesFilter && matchesSearch && booking.status === "confirmed";
    });
  }, [bookings, departingFilter, departingSearch]);

  const renderBookingTable = (
    bookings: Booking[],
    type: "arriving" | "departing"
  ) => {
    if (bookings.length === 0) {
      return (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <div className="text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <p>No {type === "arriving" ? "arrivals" : "departures"} for {type === "arriving" ? arrivingFilter : departingFilter}.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">ID</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">CUSTOMER NAME</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">ADULTS</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">ROOMS</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                {type === "arriving" ? "CHECK-OUT" : "CHECK-IN"}
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(booking => {
              const displayDate = type === "arriving" ? booking.check_out : booking.check_in;
              const displayTime = type === "arriving" ? booking.check_out_time : booking.check_in_time;
              
              return (
                <tr key={booking.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="py-4 px-4">
                    <div className="border border-blue-500 text-blue-500 rounded px-2 py-1 text-sm font-semibold inline-block">
                      {booking.id.slice(0, 4).toUpperCase()}
                    </div>
                  </td>
                  <td className="py-4 px-4 font-medium">{booking.guest_name}</td>
                  <td className="py-4 px-4">{booking.num_guests} Adults</td>
                  <td className="py-4 px-4">
                    {booking.allocated_room_number || booking.rooms?.name || "N/A"}
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      {format(parseISO(displayDate), "dd/MM/yyyy", { locale: localeId })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {displayTime ? displayTime.slice(0, 5) : "N/A"}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className="bg-green-500 hover:bg-green-600 text-white">
                      Confirmed
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const FilterButtons = ({
    activeFilter,
    onFilterChange,
  }: {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
  }) => (
    <div className="flex gap-2">
      <Button
        variant={activeFilter === "today" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("today")}
        className={cn(
          activeFilter === "today" && "bg-blue-500 hover:bg-blue-600 text-white"
        )}
      >
        Today
      </Button>
      <Button
        variant={activeFilter === "tomorrow" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("tomorrow")}
        className={cn(
          activeFilter === "tomorrow" && "bg-blue-500 hover:bg-blue-600 text-white"
        )}
      >
        Tomorrow
      </Button>
      <Button
        variant={activeFilter === "yesterday" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("yesterday")}
        className={cn(
          activeFilter === "yesterday" && "bg-blue-500 hover:bg-blue-600 text-white"
        )}
      >
        Yesterday
      </Button>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Arriving Widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <PlaneLanding className="h-6 w-6 text-blue-500" />
              <CardTitle className="text-xl">Arriving</CardTitle>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {arrivingBookings.length}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={arrivingSearch}
                onChange={(e) => setArrivingSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {arrivingSearch && (
                <button
                  onClick={() => setArrivingSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <FilterButtons
              activeFilter={arrivingFilter}
              onFilterChange={setArrivingFilter}
            />
          </div>
        </CardHeader>
        <CardContent>
          {renderBookingTable(arrivingBookings, "arriving")}
        </CardContent>
      </Card>

      {/* Departing Widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <PlaneIcon className="h-6 w-6 text-blue-500 rotate-45" />
              <CardTitle className="text-xl">Departing</CardTitle>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {departingBookings.length}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={departingSearch}
                onChange={(e) => setDepartingSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {departingSearch && (
                <button
                  onClick={() => setDepartingSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <FilterButtons
              activeFilter={departingFilter}
              onFilterChange={setDepartingFilter}
            />
          </div>
        </CardHeader>
        <CardContent>
          {renderBookingTable(departingBookings, "departing")}
        </CardContent>
      </Card>
    </div>
  );
};
