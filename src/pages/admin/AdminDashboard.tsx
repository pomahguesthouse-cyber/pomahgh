import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DaysAvailabilityCalendar } from "@/components/admin/DaysAvailabilityCalendar";
import { BookingCalendar } from "@/components/admin/booking-calendar";
import { ArrivingDepartingWidgets } from "@/components/admin/ArrivingDepartingWidgets";
import { MonthlyRevenueChart } from "@/components/admin/MonthlyRevenueChart";
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Building2, 
  Percent,
  Sun,
  Sunset,
  Moon,
  Users
} from "lucide-react";
import { useMemo } from "react";
import {
  differenceInDays,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subMonths,
  format,
  isSameMonth,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiahID } from "@/utils/indonesianFormat";
import { getWIBNow, formatWIBDate } from "@/utils/wibTimezone";

// Helper function to get greeting based on time
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

const AdminDashboard = () => {
  const { bookings } = useAdminBookings();
  const { rooms } = useAdminRooms();

  const analytics = useMemo(() => {
    if (!bookings || !rooms) return null;

    const now = getWIBNow();
    const todayStr = formatWIBDate(now);
    const currentTime = format(now, "HH:mm:ss");
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Count today's check-ins and check-outs
    const todayCheckIns = bookings.filter(b => 
      b.check_in === todayStr && b.status === 'confirmed'
    ).length;

    // Hitung check-out yang BELUM lewat waktunya
    const todayCheckOuts = bookings.filter(b => {
      if (b.check_out !== todayStr || b.status !== 'confirmed') return false;
      const checkOutTime = b.check_out_time || "12:00:00";
      return currentTime < checkOutTime; // Hanya tampilkan yang belum lewat jam check-out
    }).length;
    
    // Hitung tamu yang sedang menginap
    const guestsStaying = bookings.filter(b => {
      return b.check_in <= todayStr && 
             b.check_out >= todayStr && 
             b.status === 'confirmed';
    }).length;

    // Revenue analytics
    const totalRevenue = bookings
      .filter((b) => b.status === "confirmed")
      .reduce((sum, b) => sum + Number(b.total_price), 0);

    const monthlyRevenue = bookings
      .filter((b) => {
        const createdAt = parseISO(b.created_at);
        return b.status === "confirmed" && isWithinInterval(createdAt, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, b) => sum + Number(b.total_price), 0);

    const revenueByRoom = rooms
      .map((room) => {
        const roomRevenue = bookings
          .filter((b) => b.room_id === room.id && b.status === "confirmed")
          .reduce((sum, b) => sum + Number(b.total_price), 0);
        return { roomName: room.name, revenue: roomRevenue };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Occupancy analytics
    const totalNights = bookings.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + b.total_nights, 0);

    const daysInMonth = differenceInDays(monthEnd, monthStart);
    const possibleNights = rooms.length * daysInMonth;
    const occupancyRate = possibleNights > 0 ? (totalNights / possibleNights) * 100 : 0;

    // Booking patterns
    const avgBookingDuration =
      bookings.length > 0 ? bookings.reduce((sum, b) => sum + b.total_nights, 0) / bookings.length : 0;

    const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;
    const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;
    const cancellationRate = bookings.length > 0 ? (cancelledBookings / bookings.length) * 100 : 0;

    // Monthly revenue data for chart (last 12 months)
    const monthlyRevenueData = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), 11 - i);
      const revenue = bookings
        .filter((b) => {
          const createdAt = parseISO(b.created_at);
          return b.status === "confirmed" && isSameMonth(createdAt, date);
        })
        .reduce((sum, b) => sum + Number(b.total_price), 0);
      return {
        month: format(date, "MMM yy", { locale: localeId }),
        revenue,
      };
    });

    return {
      totalRevenue,
      monthlyRevenue,
      revenueByRoom,
      totalBookings: bookings.length,
      confirmedBookings,
      occupancyRate,
      avgBookingDuration,
      cancellationRate,
      totalRooms: rooms.length,
      monthlyRevenueData,
      todayCheckIns,
      todayCheckOuts,
      guestsStaying,
    };
  }, [bookings, rooms]);

  if (!analytics) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse border rounded-xl">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const greeting = getGreeting();
  const maxRevenue = Math.max(...analytics.revenueByRoom.map(r => r.revenue), 1);
  const hour = new Date().getHours();

  // Build greeting message berdasarkan waktu
  let greetingMessage = "";
  if (hour >= 18 || hour < 5) {
    // Malam hari - prioritaskan tamu menginap
    if (analytics.guestsStaying > 0) {
      greetingMessage = `${analytics.guestsStaying} tamu sedang menginap malam ini`;
    } else if (analytics.todayCheckOuts > 0) {
      greetingMessage = `Masih ada ${analytics.todayCheckOuts} tamu belum check-out`;
    } else {
      greetingMessage = "Semua tamu sudah check-out. Selamat beristirahat!";
    }
  } else {
    // Pagi/siang/sore
    if (analytics.todayCheckIns > 0 && analytics.todayCheckOuts > 0) {
      greetingMessage = `Ada ${analytics.todayCheckIns} tamu check-in dan ${analytics.todayCheckOuts} tamu check-out hari ini`;
    } else if (analytics.todayCheckIns > 0) {
      greetingMessage = `Ada ${analytics.todayCheckIns} tamu check-in hari ini`;
    } else if (analytics.todayCheckOuts > 0) {
      greetingMessage = `Ada ${analytics.todayCheckOuts} tamu check-out hari ini`;
    } else {
      greetingMessage = "Semoga hari Anda menyenangkan!";
    }
  }

  return (
    <div className="space-y-6">
      {/* Greeting Section */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent rounded-2xl p-6 border border-primary/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{greeting.emoji}</span>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {greeting.text}!
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {greetingMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Booking Calendar */}
      <BookingCalendar />

      {/* Arriving & Departing Widgets */}
      <ArrivingDepartingWidgets />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold truncate">{formatRupiahID(analytics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Dari semua reservasi</p>
          </CardContent>
        </Card>

        <Card className="border rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendapatan Bulan Ini</CardTitle>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold truncate">{formatRupiahID(analytics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Bulan berjalan</p>
          </CardContent>
        </Card>

        <Card className="border rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reservasi</CardTitle>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{analytics.totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.confirmedBookings} terkonfirmasi</p>
          </CardContent>
        </Card>

        <Card className="border rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tingkat Hunian</CardTitle>
            <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/30">
              <Percent className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{analytics.occupancyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-2">
          <MonthlyRevenueChart data={analytics.monthlyRevenueData} />
        </div>

        {/* Booking Patterns */}
        <Card className="border rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Pola Reservasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm text-muted-foreground">Rata-rata Menginap</span>
              </div>
              <span className="text-lg font-semibold">{analytics.avgBookingDuration.toFixed(1)} malam</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Percent className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm text-muted-foreground">Tingkat Pembatalan</span>
              </div>
              <span className="text-lg font-semibold">{analytics.cancellationRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-muted-foreground">Reservasi Terkonfirmasi</span>
              </div>
              <span className="text-lg font-semibold">{analytics.confirmedBookings}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Room & Availability Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Pendapatan per Kamar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.revenueByRoom.slice(0, 5).map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[150px]">{item.roomName}</span>
                  <span className="text-muted-foreground">{formatRupiahID(item.revenue)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                    style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {analytics.revenueByRoom.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada data pendapatan
              </p>
            )}
          </CardContent>
        </Card>

        <DaysAvailabilityCalendar />
      </div>

      {/* Quick Stats */}
      <Card className="border rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Kamar</p>
                <p className="text-2xl font-bold">{analytics.totalRooms}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tamu Terkonfirmasi</p>
                <p className="text-2xl font-bold">{analytics.confirmedBookings}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
