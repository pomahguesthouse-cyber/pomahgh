import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DaysAvailabilityCalendar } from "@/components/admin/DaysAvailabilityCalendar";
import { BookingCalendar } from "@/components/admin/booking-calendar";
import { ArrivingDepartingWidgets } from "@/components/admin/ArrivingDepartingWidgets";
import { MonthlyRevenueChart } from "@/components/admin/MonthlyRevenueChart";
import { DollarSign, Users, Calendar, TrendingUp, Building2, PercentIcon } from "lucide-react";
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

const AdminDashboard = () => {
  const { bookings } = useAdminBookings();
  const { rooms } = useAdminRooms();

  const analytics = useMemo(() => {
    if (!bookings || !rooms) return null;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

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
    };
  }, [bookings, rooms]);

  if (!analytics) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Monthly Booking Calendar - At the top */}
      <BookingCalendar />

      {/* Arriving & Departing Widgets */}
      <ArrivingDepartingWidgets />

      {/* Revenue Metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold truncate">{formatRupiahID(analytics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total pendapatan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold truncate">{formatRupiahID(analytics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{analytics.totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.confirmedBookings} terkonfirmasi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy Rate</CardTitle>
            <PercentIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{analytics.occupancyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart */}
      <MonthlyRevenueChart data={analytics.monthlyRevenueData} />

      {/* Booking Patterns */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Booking Patterns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Rata-rata Menginap</span>
              <span className="text-sm font-semibold">{analytics.avgBookingDuration.toFixed(1)} malam</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tingkat Pembatalan</span>
              <span className="text-sm font-semibold">{analytics.cancellationRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Booking Terkonfirmasi</span>
              <span className="text-sm font-semibold">{analytics.confirmedBookings}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Revenue by Room</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {analytics.revenueByRoom.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground truncate mr-2">{item.roomName}</span>
                  <span className="text-sm font-semibold whitespace-nowrap">{formatRupiahID(item.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Kamar</p>
                <p className="text-2xl font-bold">{analytics.totalRooms}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tamu Terkonfirmasi</p>
                <p className="text-2xl font-bold">{analytics.confirmedBookings}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Days Availability Calendar */}
      <div className="mt-8">
        <DaysAvailabilityCalendar />
      </div>
    </div>
  );
};

export default AdminDashboard;
