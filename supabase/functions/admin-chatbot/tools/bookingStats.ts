// ============= BOOKING STATS TOOLS =============
// File ini KHUSUS statistik booking
// ❌ BUKAN untuk menentukan tamu menginap / aktivitas harian

import { getWibDate, formatDateISO } from "../lib/dateHelpers.ts";

/* ================= TYPES ================= */

interface BookingStat {
  total_bookings: number;
  confirmed: number;
  cancelled: number;
  checked_in: number;
  checked_out: number;
  total_revenue: number;
  period: string;
  date_reference: string;
}

/* ================= MAIN FUNCTION ================= */

/**
 * Get booking statistics by period
 * NOTE:
 * - Berdasarkan CREATED_AT
 * - BUKAN check-in / check-out
 * - Aman untuk dashboard & laporan
 */
export async function getBookingStats(supabase: any, period: "today" | "week" | "month"): Promise<BookingStat> {
  const wibDate = getWibDate();
  const today = formatDateISO(wibDate);

  let query = supabase.from("bookings").select("status, total_price, created_at");

  // ================= PERIOD FILTER =================

  if (period === "today") {
    query = query.eq("created_at::date", today);
  }

  if (period === "week") {
    const weekAgo = new Date(wibDate);
    weekAgo.setDate(wibDate.getDate() - 7);
    query = query.gte("created_at", formatDateISO(weekAgo));
  }

  if (period === "month") {
    const monthAgo = new Date(wibDate);
    monthAgo.setMonth(wibDate.getMonth() - 1);
    query = query.gte("created_at", formatDateISO(monthAgo));
  }

  // ================= EXECUTE =================

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = data ?? [];

  // ================= AGGREGATION =================

  const stats: BookingStat = {
    total_bookings: rows.length,
    confirmed: 0,
    cancelled: 0,
    checked_in: 0,
    checked_out: 0,
    total_revenue: 0,
    period,
    date_reference: today,
  };

  for (const b of rows) {
    if (b.status === "confirmed") stats.confirmed++;
    if (b.status === "cancelled") stats.cancelled++;
    if (b.status === "checked_in") stats.checked_in++;
    if (b.status === "checked_out") stats.checked_out++;

    if (typeof b.total_price === "number") {
      stats.total_revenue += b.total_price;
    }
  }

  return stats;
}
