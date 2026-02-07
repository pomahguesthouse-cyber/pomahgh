// ============= BOOKING STATS TOOLS =============

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getWibDate, formatDateISO } from "../lib/dateHelpers.ts";

interface BookingRow {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
}

interface BookingWithRoom {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  status: string;
  total_price: number;
  created_at: string;
  rooms: { name: string } | null;
}

interface BookingDetail {
  booking_code: string;
  status: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string;
  num_guests: number;
  allocated_room_number: string | null;
  check_in: string;
  check_out: string;
  total_nights: number;
  total_price: number;
  payment_status: string | null;
  payment_amount: number | null;
  booking_source: string | null;
  special_requests: string | null;
  created_at: string;
  rooms: { name: string; price_per_night: number; max_guests: number } | null;
}

export async function getBookingStats(supabase: SupabaseClient, period: string) {
  const wibTime = getWibDate();
  const today = formatDateISO(wibTime);

  let query = supabase.from('bookings').select('id, status, total_price, created_at');

  if (period === 'today') {
    query = query.eq('created_at::date', today);
  } else if (period === 'week') {
    const weekAgo = new Date(wibTime.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    query = query.gte('created_at', weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date(wibTime.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    query = query.gte('created_at', monthAgo);
  }

  const { data: bookings, error } = await query;
  if (error) throw error;

  const rows = (bookings || []) as BookingRow[];
  const stats = {
    total_bookings: rows.length,
    confirmed: rows.filter((b) => b.status === 'confirmed').length,
    pending: rows.filter((b) => b.status === 'pending').length,
    cancelled: rows.filter((b) => b.status === 'cancelled').length,
    total_revenue: rows.filter((b) => b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.total_price || 0), 0)
  };

  return { period, ...stats };
}

export async function getRecentBookings(supabase: SupabaseClient, limit: number = 5, status?: string) {
  const actualLimit = Math.min(Math.max(limit || 5, 1), 20);
  
  let queryBuilder = supabase
    .from('bookings')
    .select('id, booking_code, guest_name, guest_phone, check_in, check_out, status, total_price, created_at, rooms(name)')
    .order('created_at', { ascending: false })
    .limit(actualLimit);

  if (status && status !== 'all') {
    queryBuilder = queryBuilder.eq('status', status);
  }

  const { data, error } = await queryBuilder;
  if (error) throw error;

  const rows = (data || []) as BookingWithRoom[];
  return {
    count: rows.length,
    bookings: rows.map((b) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      room_name: b.rooms?.name,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status,
      total_price: b.total_price,
      created_at: b.created_at
    }))
  };
}

export async function searchBookings(supabase: SupabaseClient, query?: string, dateFrom?: string, dateTo?: string, limit: number = 10) {
  const actualLimit = Math.min(Math.max(limit || 10, 1), 50);
  
  let queryBuilder = supabase
    .from('bookings')
    .select('id, booking_code, guest_name, guest_phone, check_in, check_out, status, total_price, created_at, rooms(name)')
    .order('created_at', { ascending: false })
    .limit(actualLimit);

  if (query) {
    queryBuilder = queryBuilder.or(`guest_name.ilike.%${query}%,booking_code.ilike.%${query}%`);
  }
  if (dateFrom) {
    queryBuilder = queryBuilder.gte('check_in', dateFrom);
  }
  if (dateTo) {
    queryBuilder = queryBuilder.lte('check_out', dateTo);
  }

  const { data, error } = await queryBuilder;
  if (error) throw error;

  const rows = (data || []) as BookingWithRoom[];
  return {
    query: query || null,
    count: rows.length,
    bookings: rows.map((b) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      room_name: b.rooms?.name,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status,
      total_price: b.total_price
    }))
  };
}

export async function getBookingDetail(supabase: SupabaseClient, bookingCode: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, rooms(name, price_per_night, max_guests)')
    .eq('booking_code', bookingCode)
    .single();

  if (error || !data) {
    throw new Error(`Booking ${bookingCode} tidak ditemukan`);
  }

  const b = data as BookingDetail;
  return {
    booking_code: b.booking_code,
    status: b.status,
    guest: {
      name: b.guest_name,
      phone: b.guest_phone,
      email: b.guest_email,
      count: b.num_guests
    },
    room: {
      name: b.rooms?.name,
      number: b.allocated_room_number,
      price_per_night: b.rooms?.price_per_night,
      max_guests: b.rooms?.max_guests
    },
    dates: {
      check_in: b.check_in,
      check_out: b.check_out,
      nights: b.total_nights
    },
    payment: {
      total_price: b.total_price,
      payment_status: b.payment_status,
      payment_amount: b.payment_amount
    },
    booking_source: b.booking_source,
    special_requests: b.special_requests,
    created_at: b.created_at
  };
}
