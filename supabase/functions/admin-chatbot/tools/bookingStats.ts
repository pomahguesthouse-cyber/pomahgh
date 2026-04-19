// ============= BOOKING STATS TOOLS =============

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getWibDate, formatDateISO, formatDateDDMMYYYY } from "../lib/dateHelpers.ts";

interface BookingRow {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
}

interface BookingRoomJoin {
  room_number: string;
  rooms: { name: string } | null;
}

interface BookingWithRoom {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_phone: string | null;
  num_guests?: number;
  check_in: string;
  check_out: string;
  total_nights?: number;
  status: string;
  total_price: number;
  payment_status?: string | null;
  payment_amount?: number | null;
  booking_source?: string | null;
  created_at: string;
  allocated_room_number: string | null;
  rooms: { name: string } | null;
  booking_rooms: BookingRoomJoin[] | null;
}

function summarizeRooms(b: BookingWithRoom): { room_numbers: string[]; room_types: string[]; rooms_summary: string } {
  const brs = b.booking_rooms || [];
  let numbers: string[] = brs.map(r => r.room_number).filter(Boolean);
  let types: string[] = Array.from(new Set(brs.map(r => r.rooms?.name).filter((n): n is string => !!n)));
  if (numbers.length === 0 && b.allocated_room_number) numbers = [b.allocated_room_number];
  if (types.length === 0 && b.rooms?.name) types = [b.rooms.name];
  const typesStr = types.join(' + ') || '-';
  const numbersStr = numbers.length ? ` (${numbers.join(', ')})` : '';
  const countSuffix = numbers.length > 1 ? ` [${numbers.length} kamar]` : '';
  return {
    room_numbers: numbers,
    room_types: types,
    rooms_summary: `${typesStr}${numbersStr}${countSuffix}`,
  };
}

function formatPaymentLabel(b: BookingWithRoom): string {
  const total = b.total_price?.toLocaleString('id-ID') || '0';
  switch (b.payment_status) {
    case 'paid': return `Rp ${total} • ✅ Lunas`;
    case 'down_payment': {
      const dp = b.payment_amount?.toLocaleString('id-ID') || '0';
      const sisa = ((b.total_price || 0) - (b.payment_amount || 0)).toLocaleString('id-ID');
      return `Rp ${total} • 🟡 DP Rp ${dp} (sisa Rp ${sisa})`;
    }
    case 'unpaid': return `Rp ${total} • ⏳ Belum bayar`;
    case 'pay_at_hotel': return `Rp ${total} • 🏨 Bayar di hotel`;
    default: return `Rp ${total} • ${b.payment_status || '-'}`;
  }
}

function formatBookingLine(b: BookingWithRoom, idx: number): string {
  const r = summarizeRooms(b);
  return [
    `${idx}. *${b.booking_code}* — ${b.guest_name} (${b.num_guests || 1} tamu)`,
    `   🛏️ ${r.rooms_summary}`,
    `   📅 ${formatDateDDMMYYYY(b.check_in)} → ${formatDateDDMMYYYY(b.check_out)} (${b.total_nights || '-'} malam)`,
    `   📞 ${b.guest_phone || '-'}`,
    `   💰 ${formatPaymentLabel(b)}`,
    `   📌 Status: ${b.status} • Sumber: ${b.booking_source || '-'}`,
  ].join('\n');
}

const BOOKING_SEPARATOR = '\n-------------------------------\n';

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
    .select('id, booking_code, guest_name, guest_phone, num_guests, check_in, check_out, total_nights, status, total_price, payment_status, payment_amount, booking_source, created_at, allocated_room_number, rooms(name), booking_rooms(room_number, rooms(name))')
    .order('created_at', { ascending: false })
    .limit(actualLimit);

  if (status && status !== 'all') {
    queryBuilder = queryBuilder.eq('status', status);
  }

  const { data, error } = await queryBuilder;
  if (error) throw error;

  const rows = (data || []) as unknown as BookingWithRoom[];
  const formatted_text = rows.map((b, i) => formatBookingLine(b, i + 1)).join(BOOKING_SEPARATOR);
  return {
    count: rows.length,
    formatted_text,
    bookings: rows.map((b) => {
      const r = summarizeRooms(b);
      return {
        booking_code: b.booking_code,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        num_guests: b.num_guests,
        room_name: r.room_types.join(' + ') || b.rooms?.name,
        room_numbers: r.room_numbers,
        room_types: r.room_types,
        rooms_summary: r.rooms_summary,
        is_multi_room: r.room_numbers.length > 1,
        check_in: formatDateDDMMYYYY(b.check_in),
        check_out: formatDateDDMMYYYY(b.check_out),
        total_nights: b.total_nights,
        status: b.status,
        total_price: b.total_price,
        payment_status: b.payment_status,
        payment_amount: b.payment_amount,
        booking_source: b.booking_source,
        created_at: formatDateDDMMYYYY(b.created_at),
      };
    })
  };
}

export async function searchBookings(supabase: SupabaseClient, query?: string, dateFrom?: string, dateTo?: string, limit: number = 10) {
  const actualLimit = Math.min(Math.max(limit || 10, 1), 50);
  
  let queryBuilder = supabase
    .from('bookings')
    .select('id, booking_code, guest_name, guest_phone, num_guests, check_in, check_out, total_nights, status, total_price, payment_status, payment_amount, booking_source, created_at, allocated_room_number, rooms(name), booking_rooms(room_number, rooms(name))')
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

  const rows = (data || []) as unknown as BookingWithRoom[];
  const formatted_text = rows.map((b, i) => formatBookingLine(b, i + 1)).join(BOOKING_SEPARATOR);
  return {
    query: query || null,
    count: rows.length,
    formatted_text,
    bookings: rows.map((b) => {
      const r = summarizeRooms(b);
      return {
        booking_code: b.booking_code,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        num_guests: b.num_guests,
        room_name: r.room_types.join(' + ') || b.rooms?.name,
        room_numbers: r.room_numbers,
        room_types: r.room_types,
        rooms_summary: r.rooms_summary,
        is_multi_room: r.room_numbers.length > 1,
        check_in: formatDateDDMMYYYY(b.check_in),
        check_out: formatDateDDMMYYYY(b.check_out),
        total_nights: b.total_nights,
        status: b.status,
        total_price: b.total_price,
        payment_status: b.payment_status,
        payment_amount: b.payment_amount,
        booking_source: b.booking_source,
        created_at: formatDateDDMMYYYY(b.created_at),
      };
    })
  };
}

export async function getBookingDetail(supabase: SupabaseClient, bookingCode: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, rooms(name, price_per_night, max_guests), booking_rooms(room_number, price_per_night, rooms(name))')
    .eq('booking_code', bookingCode)
    .single();

  if (error || !data) {
    throw new Error(`Booking ${bookingCode} tidak ditemukan`);
  }

  const b = data as BookingDetail & { booking_rooms?: Array<{ room_number: string; price_per_night: number; rooms: { name: string } | null }> };
  const brs = b.booking_rooms || [];
  const roomNumbers = brs.map(r => r.room_number).filter(Boolean);
  const roomTypes = Array.from(new Set(brs.map(r => r.rooms?.name).filter((n): n is string => !!n)));
  const fallbackNumbers = roomNumbers.length ? roomNumbers : (b.allocated_room_number ? [b.allocated_room_number] : []);
  const fallbackTypes = roomTypes.length ? roomTypes : (b.rooms?.name ? [b.rooms.name] : []);

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
      name: fallbackTypes.join(' + '),
      number: fallbackNumbers.join(', '),
      numbers: fallbackNumbers,
      types: fallbackTypes,
      is_multi_room: fallbackNumbers.length > 1,
      rooms_summary: `${fallbackTypes.join(' + ') || '-'}${fallbackNumbers.length ? ` (${fallbackNumbers.join(', ')})` : ''}${fallbackNumbers.length > 1 ? ` [${fallbackNumbers.length} kamar]` : ''}`,
      price_per_night: b.rooms?.price_per_night,
      max_guests: b.rooms?.max_guests
    },
    dates: {
      check_in: formatDateDDMMYYYY(b.check_in),
      check_out: formatDateDDMMYYYY(b.check_out),
      nights: b.total_nights
    },
    payment: {
      total_price: b.total_price,
      payment_status: b.payment_status,
      payment_amount: b.payment_amount
    },
    booking_source: b.booking_source,
    special_requests: b.special_requests,
    created_at: formatDateDDMMYYYY(b.created_at)
  };
}
