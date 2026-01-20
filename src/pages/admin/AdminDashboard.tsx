import { useMemo, useState } from "react";
import {
  differenceInDays,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subMonths,
  format,
  isSameMonth,
  startOfYear,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Percent,
  Sun,
  Sunset,
  Moon,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingCalendar } from "@/components/admin/booking-calendar";
import { ArrivingDepartingWidgets } from "@/components/admin/ArrivingDepartingWidgets";
import { MonthlyRevenueChart, ChartPeriodFilter } from "@/components/admin/MonthlyRevenueChart";
import { DaysAvailabilityCalendar } from "@/components/admin/DaysAvailabilityCalendar";

import { formatRupiahID } from "@/utils/indonesianFormat";
import { getWIBNow, formatWIBDate } from "@/utils/wibTimezone";

/* ================= GREETING ================= */
const getGreeting = () => {
  const hour = getWIBNow().getHours();
  if (hour >= 5 && hour < 11) return { text: "Selamat pagi", emoji: "☀️" };
  if (hour >= 11 && hour < 15) return { text: "Selamat siang", emoji: "🌤️" };
  if (hour >= 15 && hour < 18) return { text: "Selamat sore", emoji: "🌅" };
  return { text: "Selamat malam", emoji: "🌙" };
};

/* ================= DASHBOARD ================= */
const AdminDashboard = () => {
  const { bookings } = useAdminBookings();
  const { rooms } = useAdminRooms();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriodFilter>("12months");

  const analytics = useMemo(() => {
    if (!bookings || !rooms) return null;

    const now = getWIBNow();
    const todayStr = formatWIBDate(now);
    const currentTime = format(now, "HH:mm:ss");

    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;

    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    /* ---------- PRE FILTER ---------- */
    const confirmedBookings = bookings.filter((b) => b.status === "confirmed");

    /* ---------- TODAY ---------- */
    const todayCheckIns = confirmedBookings.filter((b) => b.check_in === todayStr).length;

    const todayCheckOuts = confirmedBookings.filter((b) => {
      if (b.check_out !== todayStr) return false;
      const time = b.check_out_time || "12:00:00";
      return currentTime < time;
    }).length;

    const guestsStaying = confirmedBookings.filter((b) => b.check_in <= todayStr && b.check_out >= todayStr).length;

    /* ---------- REVENUE ---------- */
    const totalRevenue = confirmedBookings.reduce((s, b) => s + Number(b.total_price), 0);

    const monthlyRevenue = confirmedBookings
      .filter((b) => {
        const created = parseISO(b.created_at);
        return isWithinInterval(created, {
          start: monthStart,
          end: monthEnd,
        });
      })
      .reduce((s, b) => s + Number(b.total_price), 0);

    const lastMonthRevenue = confirmedBookings
      .filter((b) => {
        const created = parseISO(b.created_at);
        return isWithinInterval(created, {
          start: lastMonthStart,
          end: lastMonthEnd,
        });
      })
      .reduce((s, b) => s + Number(b.total_price), 0);

    const revenueTrend = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    /* ---------- OCCUPANCY ---------- */
    const totalNightsThisMonth = confirmedBookings.reduce((sum, b) => {
      const checkIn = parseISO(b.check_in);
      const checkOut = parseISO(b.check_out);

      const start = checkIn < monthStart ? monthStart : checkIn;
      const end = checkOut > monthEnd ? monthEnd : checkOut;

      if (start > end) return sum;

      return sum + differenceInDays(end, start);
    }, 0);

    const possibleNights = rooms.length * daysInMonth;

    const occupancyRate = possibleNights > 0 ? (totalNightsThisMonth / possibleNights) * 100 : 0;

    /* ---------- HOTEL METRICS ---------- */
    const adr = totalNightsThisMonth > 0 ? monthlyRevenue / totalNightsThisMonth : 0;

    const revPar = possibleNights > 0 ? monthlyRevenue / possibleNights : 0;

    /* ---------- ROOM REVENUE ---------- */
    const revenueByRoom = rooms
      .map((room) => ({
        roomName: room.name,
        revenue: confirmedBookings.filter((b) => b.room_id === room.id).reduce((s, b) => s + Number(b.total_price), 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    /* ---------- CHART ---------- */
    const getMonthlyRevenueData = () => {
      if (chartPeriod === "6months") {
        return Array.from({ length: 6 }, (_, i) => {
          const date = subMonths(now, 5 - i);
          const revenue = confirmedBookings
            .filter((b) => isSameMonth(parseISO(b.created_at), date))
            .reduce((s, b) => s + Number(b.total_price), 0);
          return { month: format(date, "MMM yy", { locale: localeId }), revenue };
        });
      } else if (chartPeriod === "thisYear") {
        const yearStart = startOfYear(now);
        const currentMonth = now.getMonth();
        return Array.from({ length: currentMonth + 1 }, (_, i) => {
          const date = new Date(now.getFullYear(), i, 1);
          const revenue = confirmedBookings
            .filter((b) => isSameMonth(parseISO(b.created_at), date))
            .reduce((s, b) => s + Number(b.total_price), 0);
          return { month: format(date, "MMM yy", { locale: localeId }), revenue };
        });
      } else {
        return Array.from({ length: 12 }, (_, i) => {
          const date = subMonths(now, 11 - i);
          const revenue = confirmedBookings
            .filter((b) => isSameMonth(parseISO(b.created_at), date))
            .reduce((s, b) => s + Number(b.total_price), 0);
          return { month: format(date, "MMM yy", { locale: localeId }), revenue };
        });
      }
    };

    const monthlyRevenueData = getMonthlyRevenueData();

    return {
      todayCheckIns,
      todayCheckOuts,
      guestsStaying,
      totalRevenue,
      monthlyRevenue,
      revenueTrend,
      occupancyRate,
      adr,
      revPar,
      revenueByRoom,
      monthlyRevenueData,
      totalBookings: bookings.length,
      confirmedBookings: confirmedBookings.length,
    };
  }, [bookings, rooms, chartPeriod]);

  if (!analytics) return null;

  const greeting = getGreeting();
  const maxRevenue = Math.max(...analytics.revenueByRoom.map((r) => r.revenue), 1);

  /* ================= RENDER ================= */
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="rounded-2xl p-6 border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent">
        <h2 className="text-xl font-semibold">
          {greeting.emoji} {greeting.text}
        </h2>
        <p className="text-sm text-muted-foreground">
          {analytics.guestsStaying > 0
            ? `${analytics.guestsStaying} tamu sedang menginap`
            : "Operasional terkendali hari ini"}
        </p>
      </div>

      <BookingCalendar />
      <ArrivingDepartingWidgets />

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Pendapatan Bulan Ini" value={formatRupiahID(analytics.monthlyRevenue)} icon={<TrendingUp />} />
        <KPI title="Occupancy" value={`${analytics.occupancyRate.toFixed(1)}%`} icon={<Percent />} />
        <KPI title="ADR" value={formatRupiahID(analytics.adr)} icon={<DollarSign />} />
        <KPI title="RevPAR" value={formatRupiahID(analytics.revPar)} icon={<Calendar />} />
      </div>

      {/* Chart */}
      <MonthlyRevenueChart 
        data={analytics.monthlyRevenueData} 
        period={chartPeriod}
        onPeriodChange={setChartPeriod}
      />

      {/* Revenue by Room */}
      <Card>
        <CardHeader>
          <CardTitle>Pendapatan per Kamar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.revenueByRoom.map((r, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm">
                <span>{r.roomName}</span>
                <span>{formatRupiahID(r.revenue)}</span>
              </div>
              <div className="h-2 bg-muted rounded">
                <div
                  className="h-full bg-primary rounded"
                  style={{
                    width: `${(r.revenue / maxRevenue) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <DaysAvailabilityCalendar />
    </div>
  );
};

/* ================= KPI COMPONENT ================= */
const KPI = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => (
  <Card>
    <CardHeader className="flex flex-row justify-between pb-2">
      <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export default AdminDashboard;
