// ============= BOOKING STATS TOOLS =============
// File ini aman untuk statistik & pencarian booking
// ❌ BUKAN sumber kebenaran tamu menginap

import { getWibDate, formatDateISO } from "../lib/dateHelpers.ts";

/* ================= TYPES ================= */

export interface BookingRow {
  booking_code: string;
  guest_name: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  status: "confirmed" | "cancelled" | "checked_in" | "checked_out";
  total_price: number;
  created_at: string;
  rooms?: {
    name: string;
  } | null;
}

/* ================= BOOKING STATS ================= */

/**
 * Statistik booking BERDASARKAN created_at
 */
export async function getBookingStats(supabase: unknown, period: "today" | "week" | "month") {
  const client = supabase as any;
  const wibDate = getWibDate();
  const today = formatDateISO(wibDate);

  let query = client.from("bookings").select("status, total_price, created_at");

  if (period === "today") {
    query = query.eq("created_at::date", today);
  }

  if (period === "week") {
    const d = new Date(wibDate);
    d.setDate(d.getDate() - 7);
    query = query.gte("created_at", formatDateISO(d));
  }

  if (period === "month") {
    const d = new Date(wibDate);
    d.setMonth(d.getMonth() - 1);
    query = query.gte("created_at", formatDateISO(d));
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows: Pick<BookingRow, "status" | "total_price">[] = data ?? [];

  return {
    total_bookings: rows.length,
    confirmed: rows.filter((b) => b.status === "confirmed").length,
    cancelled: rows.filter((b) => b.status === "cancelled").length,
    checked_in: rows.filter((b) => b.status === "checked_in").length,
    checked_out: rows.filter((b) => b.status === "checked_out").length,
    total_revenue: rows.reduce((sum: number, b) => sum + (b.total_price ?? 0), 0),
    period,
    date_reference: today,
  };
}

/* ================= RECENT BOOKINGS ================= */

/**
 * Dipakai executor.ts
 * limit & status OPTIONAL
 */
export async function getRecentBookings(supabase: unknown, limit = 5, status?: BookingRow["status"]) {
  const client = supabase as any;

  let query = client
    .from("bookings")
    .select("booking_code, guest_name, check_in, check_out, status, total_price, rooms(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data as BookingRow[];
}

/* ================= SEARCH BOOKINGS ================= */

/**
 * Dipakai executor.ts
 * Support:
 * - keyword
 * - date_from
 * - date_to
 * - limit
 */
export async function searchBookings(
  supabase: unknown,
  keyword: string,
  dateFrom?: string,
  dateTo?: string,
  limit = 10,
) {
  const client = supabase as any;

  let query = client
    .from("bookings")
    .select("booking_code, guest_name, guest_phone, check_in, check_out, status, total_price, rooms(name)")
    .or(`booking_code.ilike.%${keyword}%,guest_name.ilike.%${keyword}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (dateFrom) {
    query = query.gte("check_in", dateFrom);
  }

  if (dateTo) {
    query = query.lte("check_out", dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data as BookingRow[];
}

/* ================= BOOKING DETAIL ================= */

export async function getBookingDetail(supabase: unknown, bookingCode: string) {
  const client = supabase as any;

  const { data, error } = await client
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
  return data as BookingRow;
}
