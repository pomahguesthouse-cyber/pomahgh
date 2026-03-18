import { useState, lazy, Suspense, useMemo } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DaysAvailabilityCalendar } from "@/components/admin/DaysAvailabilityCalendar";
import { ArrivingDepartingWidgets } from "@/components/admin/ArrivingDepartingWidgets";
import { DollarSign, Calendar, TrendingUp, Building2, Percent, Sun, Sunset, Moon, Users } from "lucide-react";
import { differenceInDays, subMonths, format, isSameMonth, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiahID } from "@/utils/indonesianFormat";
import { getWIBNow, formatWIBDate } from "@/utils/wibTimezone";
import { Skeleton } from "@/components/ui/skeleton";

const BookingCalendar = lazy(() => import("@/components/admin/booking-calendar/BookingCalendar").then(m => ({ default: m.BookingCalendar })));
const MonthlyRevenueChart = lazy(() => import("@/components/admin/MonthlyRevenueChart").then(m => ({ default: m.MonthlyRevenueChart })));

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return { text: "Selamat pagi", icon: Sun, emoji: "☀️" };
  } else if (hour >= 11 && hour < 15) {
    return { text: "Selamat siang", icon: Sun, emoji: "🌤️" };
  } else if (hour >= 15 && hour < 18) {
    return { text: "Selamat sore", icon: Sunset, emoji: "🌅" };
  } else {
    return { text: "Selamat malam", icon: Moon, emoji: "🌙" };
  }
};

function CalendarSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={`header-${i}`} className="h-8" />
            ))}
          </div>
          {[...Array(5)].map((_, week) => (
            <div key={`week-${week}`} className="grid grid-cols-7 gap-2">
              {[...Array(7)].map((_, day) => (
                <Skeleton key={`day-${day}`} className="h-20" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const [calendarView, setCalendarView] = useState<"booking" | "availability">("availability");
  const now = getWIBNow();
  
  const { bookings } = useAdminBookings();
  const { rooms } = useAdminRooms();

  const stats = useMemo(() => {
    const today = format(now, "yyyy-MM-dd");
    const safeBookings = bookings || [];
    const safeRooms = rooms || [];

    const todayBookings = safeBookings.filter(b => b.check_in === today);
    const todayCheckouts = safeBookings.filter(b => b.check_out === today);
    
    const monthlyBookings = safeBookings.filter(b => {
      const checkIn = parseISO(b.check_in);
      return isSameMonth(checkIn, now);
    });

    const monthlyRevenue = monthlyBookings
      .filter(b => b.payment_status === "paid")
      .reduce((sum, b) => sum + (b.total_price || 0), 0);

    const avgOccupancy = safeRooms.length > 0
      ? Math.round((safeBookings.filter(b => b.check_in <= today && b.check_out > today).length / safeRooms.length) * 100)
      : 0;

    return {
      todayArrivals: todayBookings.length,
      todayDepartures: todayCheckouts.length,
      monthlyBookings: monthlyBookings.length,
      monthlyRevenue,
      avgOccupancy,
      totalRooms: safeRooms.length,
      availableRooms: safeRooms.length,
    };
  }, [bookings, rooms, now]);

  // Build monthly revenue data for chart
  const monthlyRevenueData = useMemo(() => {
    const safeBookings = bookings || [];
    const months: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStr = format(monthDate, "MMM yyyy", { locale: localeId });
      const revenue = safeBookings
        .filter(b => b.payment_status === "paid" && isSameMonth(parseISO(b.check_in), monthDate))
        .reduce((sum, b) => sum + (b.total_price || 0), 0);
      months.push({ month: monthStr, revenue });
    }
    return months;
  }, [bookings, now]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{greeting.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold">{greeting.text}, Admin!</h1>
            <p className="text-muted-foreground text-sm">
              {formatWIBDate(now)} - Berikut ringkasan properti Anda
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCalendarView("availability")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              calendarView === "availability"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            Ketersediaan
          </button>
          <button
            onClick={() => setCalendarView("booking")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              calendarView === "booking"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            Booking Calendar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Check-in Hari Ini</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.todayArrivals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Check-out Hari Ini</p>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.todayDepartures}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Pendapatan Bulan Ini</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{formatRupiahID(stats.monthlyRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Avg Occupancy</p>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.avgOccupancy}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<CalendarSkeleton />}>
            {calendarView === "availability" ? (
              <DaysAvailabilityCalendar />
            ) : (
              <BookingCalendar />
            )}
          </Suspense>
        </div>
        <div className="space-y-6">
          <ArrivingDepartingWidgets />
          <Suspense fallback={<ChartSkeleton />}>
            <MonthlyRevenueChart data={monthlyRevenueData} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
