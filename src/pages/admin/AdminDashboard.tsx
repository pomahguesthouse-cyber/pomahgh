import { useMemo } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calendar, Building2, Percent, Users, TrendingUp, ArrowRight } from "lucide-react";
import { format, parseISO, isSameMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiahID } from "@/utils/indonesianFormat";
import { getWIBNow, formatWIBDate } from "@/utils/wibTimezone";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const now = getWIBNow();
  
  const { bookings, isLoading: isLoadingBookings } = useAdminBookings();
  const { rooms, isLoading: isLoadingRooms } = useAdminRooms();

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

    const occupiedRooms = new Set(
      safeBookings
        .filter(b => b.check_in <= today && b.check_out > today)
        .map(b => b.room_id)
    ).size;

    const totalRooms = safeRooms.reduce((sum, r) => sum + r.room_count, 0);

    return {
      todayArrivals: todayBookings.length,
      todayDepartures: todayCheckouts.length,
      monthlyBookings: monthlyBookings.length,
      monthlyRevenue,
      occupiedRooms,
      availableRooms: totalRooms - occupiedRooms,
      totalRooms,
    };
  }, [bookings, rooms, now]);

  const isLoading = isLoadingBookings || isLoadingRooms;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-20">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {formatWIBDate(now)}
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/booking-calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Kalender Booking
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-600">Kamar Tersedia</span>
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-700">{stats.availableRooms}</p>
            <p className="text-xs text-green-600/70 mt-1">dari {stats.totalRooms} kamar</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-600">Kamar Terjual</span>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-700">{stats.occupiedRooms}</p>
            <p className="text-xs text-blue-600/70 mt-1">bulan ini</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-600">Pendapatan</span>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-700 truncate">
              {formatRupiahID(stats.monthlyRevenue)}
            </p>
            <p className="text-xs text-purple-600/70 mt-1">
              {format(now, "MMMM yyyy", { locale: localeId })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-orange-600">Tamu Hari Ini</span>
              <Users className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-700">{stats.todayArrivals}</p>
            <p className="text-xs text-orange-600/70 mt-1">
              {stats.todayDepartures} checkout
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              to="/admin/booking-calendar"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium">Kalender Booking</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link 
              to="/admin/rooms"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-medium">Kelola Kamar</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link 
              to="/admin/bookings"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium">Semua Booking</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Booking Terbaru</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/bookings">Lihat Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!bookings || bookings.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Belum ada booking
              </p>
            ) : (
              <div className="space-y-3">
                {bookings.slice(0, 5).map((booking) => (
                  <div 
                    key={booking.id} 
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {booking.guest_name || "Tamu"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.room_name || "Kamar"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(parseISO(booking.check_in), "dd MMM", { locale: localeId })}
                      </p>
                      <Badge variant={booking.payment_status === "paid" ? "default" : "secondary"}>
                        {booking.payment_status === "paid" ? "Lunas" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      variant === "default" 
        ? "bg-green-100 text-green-800" 
        : "bg-gray-100 text-gray-800"
    }`}>
      {children}
    </span>
  );
}
