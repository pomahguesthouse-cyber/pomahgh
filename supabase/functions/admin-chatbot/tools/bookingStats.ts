// ============= BOOKING STATS TOOLS =============
// ⚠️ CATATAN PENTING:
// File ini UNTUK:
// - statistik
// - pencarian booking
// - detail booking
// ❌ BUKAN untuk menyimpulkan tamu menginap hari ini

import { getWibDate, formatDateISO } from "../lib/dateHelpers.ts";

/* ================= TYPES ================= */

interface BookingRow {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  status: string;
  total_price: number;
  created_at: string;
  rooms?: {
    name: string;
  } | null;
}

/* ================= BOOKING STATS ================= */

/**
 * Statistik booking berdasarkan CREATED_AT
 * Aman untuk dashboard & laporan
 */
export async function getBookingStats(supabase: any, period: "today" | "week" | "month") {
  const wibDate = getWibDate();
  const today = formatDateISO(wibDate);

  let query = supabase.from("bookings").select("status, total_price, created_at");

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

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];

  return {
    total_bookings: rows.length,
    confirmed: rows.filter((b) => b.status === "confirmed").length,
    cancelled: rows.filter((b) => b.status === "cancelled").length,
    checked_in: rows.filter((b) => b.status === "checked_in").length,
    checked_out: rows.filter((b) => b.status === "checked_out").length,
    total_revenue: rows.reduce((sum, b) => sum + (b.total_price ?? 0), 0),
    period,
    date_reference: today,
  };
}

/* ================= RECENT BOOKINGS ================= */

/**
 * Ambil booking terbaru (ORDER BY created_at)
 */
export async function getRecentBookings(supabase: any, limit = 5) {
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_code, guest_name, check_in, check_out, status, total_price, rooms(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/* ================= SEARCH BOOKINGS ================= */

/**
 * Cari booking berdasarkan kode / nama tamu
 */
export async function searchBookings(supabase: any, keyword: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_code, guest_name, guest_phone, check_in, check_out, status, total_price, rooms(name)")
    .or(`booking_code.ilike.%${keyword}%,guest_name.ilike.%${keyword}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data ?? [];
}

/* ================= BOOKING DETAIL ================= */

/**
 * Detail lengkap satu booking
 */
export async function getBookingDetail(supabase: any, bookingCode: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      booking_code,
      guest_name,
      guest_phone,
      check_in,
      check_out,
      status,
      num_guests,
      total_price,
      allocated_room_number,
      rooms(name)
    `,
    )
    .eq("booking_code", bookingCode)
    .single();

  if (error) throw error;
  return data;
}
