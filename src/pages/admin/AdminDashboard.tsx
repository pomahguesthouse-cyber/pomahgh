import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DaysAvailabilityCalendar } from "@/components/admin/DaysAvailabilityCalendar";
import { DollarSign, Users, Calendar, TrendingUp, Building2, PercentIcon } from "lucide-react";
import { useMemo } from "react";
import { differenceInDays, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";


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
      .filter(b => b.status === "confirmed")
      .reduce((sum, b) => sum + Number(b.total_price), 0);

    const monthlyRevenue = bookings
      .filter(b => {
        const createdAt = parseISO(b.created_at);
        return b.status === "confirmed" && isWithinInterval(createdAt, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, b) => sum + Number(b.total_price), 0);

    const revenueByRoom = rooms.map(room => {
      const roomRevenue = bookings
        .filter(b => b.room_id === room.id && b.status === "confirmed")
        .reduce((sum, b) => sum + Number(b.total_price), 0);
      return { roomName: room.name, revenue: roomRevenue };
    }).sort((a, b) => b.revenue - a.revenue);

    // Occupancy analytics
    const totalNights = bookings
      .filter(b => b.status === "confirmed")
      .reduce((sum, b) => sum + b.total_nights, 0);

    const daysInMonth = differenceInDays(monthEnd, monthStart);
    const possibleNights = rooms.length * daysInMonth;
    const occupancyRate = possibleNights > 0 ? (totalNights / possibleNights) * 100 : 0;

    // Booking patterns
    const avgBookingDuration = bookings.length > 0
      ? bookings.reduce((sum, b) => sum + b.total_nights, 0) / bookings.length
      : 0;

    const confirmedBookings = bookings.filter(b => b.status === "confirmed").length;
    const cancelledBookings = bookings.filter(b => b.status === "cancelled").length;
    const cancellationRate = bookings.length > 0
      ? (cancelledBookings / bookings.length) * 100
      : 0;

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
    };
  }, [bookings, rooms]);

  if (!analytics) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Dashboard Overview</h2>
        <p className="text-muted-foreground">
          Key metrics and analytics for Pomah Guesthouse
        </p>
      </div>


      {/* Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {analytics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All-time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {analytics.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.confirmedBookings} confirmed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <PercentIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.occupancyRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Booking Patterns */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking Patterns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg. Stay Duration</span>
              <span className="font-semibold">
                {analytics.avgBookingDuration.toFixed(1)} nights
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cancellation Rate</span>
              <span className="font-semibold">
                {analytics.cancellationRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Confirmed Bookings</span>
              <span className="font-semibold">{analytics.confirmedBookings}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Room</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.revenueByRoom.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{item.roomName}</span>
                  <span className="font-semibold">
                    Rp {item.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Rooms</p>
                <p className="text-2xl font-bold">{analytics.totalRooms}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Confirmed Guests</p>
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
