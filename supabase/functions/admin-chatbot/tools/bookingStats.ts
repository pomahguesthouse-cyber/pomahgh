// ============= BOOKING STATS TOOLS =============

import { getWibDate, formatDateISO } from "../lib/dateHelpers.ts";

export async function getBookingStats(supabase: any, period: string) {
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

  const stats = {
    total_bookings: bookings?.length || 0,
    confirmed: bookings?.filter((b: any) => b.status === 'confirmed').length || 0,
    pending: bookings?.filter((b: any) => b.status === 'pending').length || 0,
    cancelled: bookings?.filter((b: any) => b.status === 'cancelled').length || 0,
    total_revenue: bookings?.filter((b: any) => b.status === 'confirmed')
      .reduce((sum: number, b: any) => sum + (b.total_price || 0), 0) || 0
  };

  return { period, ...stats };
}

export async function getRecentBookings(supabase: any, limit: number = 5, status?: string) {
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

  return {
    count: data.length,
    bookings: data.map((b: any) => ({
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

export async function searchBookings(supabase: any, query?: string, dateFrom?: string, dateTo?: string, limit: number = 10) {
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

  return {
    query: query || null,
    count: data?.length || 0,
    bookings: data?.map((b: any) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      room_name: b.rooms?.name,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status,
      total_price: b.total_price
    })) || []
  };
}

export async function getBookingDetail(supabase: any, bookingCode: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, rooms(name, price_per_night, max_guests)')
    .eq('booking_code', bookingCode)
    .single();

  if (error || !data) {
    throw new Error(`Booking ${bookingCode} tidak ditemukan`);
  }

  return {
    booking_code: data.booking_code,
    status: data.status,
    guest: {
      name: data.guest_name,
      phone: data.guest_phone,
      email: data.guest_email,
      count: data.num_guests
    },
    room: {
      name: data.rooms?.name,
      number: data.allocated_room_number,
      price_per_night: data.rooms?.price_per_night,
      max_guests: data.rooms?.max_guests
    },
    dates: {
      check_in: data.check_in,
      check_out: data.check_out,
      nights: data.total_nights
    },
    payment: {
      total_price: data.total_price,
      payment_status: data.payment_status,
      payment_amount: data.payment_amount
    },
    booking_source: data.booking_source,
    special_requests: data.special_requests,
    created_at: data.created_at
  };
}
