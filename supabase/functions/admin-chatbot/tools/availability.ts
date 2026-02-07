// ============= AVAILABILITY TOOLS =============

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getWibDate, formatDateISO, isBeforeTime, getCurrentTimeWIB } from "../lib/dateHelpers.ts";

interface RoomRow {
  id: string;
  name: string;
  room_count: number;
  room_numbers: string[] | null;
  price_per_night: number;
  promo_price: number | null;
  promo_start_date: string | null;
  promo_end_date: string | null;
  sunday_price: number | null;
  monday_price: number | null;
  tuesday_price: number | null;
  wednesday_price: number | null;
  thursday_price: number | null;
  friday_price: number | null;
  saturday_price: number | null;
}

interface BookingRow {
  id: string;
  room_id: string;
  allocated_room_number: string | null;
  check_in: string;
  check_out: string;
  check_out_time: string | null;
  guest_name: string;
}

interface BookingRoomRow {
  booking_id: string;
  room_id: string;
  room_number: string;
}

interface BlockedDateRow {
  room_id: string;
  room_number: string;
  unavailable_date: string;
}

interface RoomPromoRow {
  room_id: string;
  name: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  promo_price: number | null;
  discount_percentage: number | null;
  badge_text: string | null;
  priority: number;
}

interface GuestBookingRow {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  allocated_room_number: string | null;
  num_guests: number;
  total_price: number;
  status: string;
  rooms: { name: string }[] | { name: string } | null;
}

interface BookingRoomNumber {
  room_number: string;
}

export async function getAvailabilitySummary(supabase: SupabaseClient, checkIn: string, checkOut: string) {
  // Get hotel settings for check-in/check-out times
  const { data: hotelSettings } = await supabase
    .from('hotel_settings')
    .select('check_in_time, check_out_time')
    .single();
  
  const standardCheckInTime = hotelSettings?.check_in_time || '14:00';
  const standardCheckOutTime = hotelSettings?.check_out_time || '12:00';

  // Get all rooms with promo fields
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, name, room_count, room_numbers, price_per_night, ' +
      'promo_price, promo_start_date, promo_end_date, ' +
      'sunday_price, monday_price, tuesday_price, wednesday_price, ' +
      'thursday_price, friday_price, saturday_price')
    .eq('available', true);

  if (roomsError) throw roomsError;

  const typedRooms = (rooms || []) as unknown as RoomRow[];

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, room_id, allocated_room_number, check_in, check_out, check_out_time, guest_name')
    .neq('status', 'cancelled')
    .lte('check_in', checkOut)
    .gte('check_out', checkIn);

  if (bookingsError) throw bookingsError;

  const typedBookings = (bookings || []) as BookingRow[];

  // Get booking_rooms for multi-room bookings
  const bookingIds = typedBookings.map((b) => b.id);
  let bookingRooms: BookingRoomRow[] = [];
  if (bookingIds.length > 0) {
    const { data: brData } = await supabase
      .from('booking_rooms')
      .select('booking_id, room_id, room_number')
      .in('booking_id', bookingIds);
    bookingRooms = (brData || []) as BookingRoomRow[];
  }

  // Get blocked dates
  const { data: blockedDates, error: blockedError } = await supabase
    .from('room_unavailable_dates')
    .select('room_id, room_number, unavailable_date')
    .gte('unavailable_date', checkIn)
    .lte('unavailable_date', checkOut);

  if (blockedError) throw blockedError;

  const typedBlockedDates = (blockedDates || []) as BlockedDateRow[];

  // Fetch active promotions
  const { data: activePromos } = await supabase
    .from('room_promotions')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', checkOut)
    .gte('end_date', checkIn)
    .order('priority', { ascending: false });

  const typedPromos = (activePromos || []) as RoomPromoRow[];

  // Helper function to check if a booking truly blocks availability
  const isBookingBlocking = (booking: BookingRow, requestedCheckIn: string): boolean => {
    const bookingCheckOut = booking.check_out;
    const bookingCheckOutTime = booking.check_out_time || standardCheckOutTime;
    
    if (bookingCheckOut < requestedCheckIn) return true;
    
    if (bookingCheckOut === requestedCheckIn) {
      const checkOutHour = parseInt(bookingCheckOutTime.split(':')[0]);
      const checkInHour = parseInt(standardCheckInTime.split(':')[0]);
      const standardCheckOutHour = parseInt(standardCheckOutTime.split(':')[0]);
      if (checkOutHour <= standardCheckOutHour) {
        return false;
      }
      if (checkOutHour >= checkInHour) {
        return true;
      }
      return false;
    }
    
    return true;
  };

  // Collect late checkout info
  const lateCheckouts: Array<{ guest_name: string; check_out_time: string; booking_id: string }> = [];
  typedBookings.forEach((b) => {
    if (b.check_out === checkIn && b.check_out_time) {
      const standardHour = parseInt(standardCheckOutTime.split(':')[0]);
      const actualHour = parseInt(b.check_out_time.split(':')[0]);
      if (actualHour > standardHour) {
        lateCheckouts.push({
          guest_name: b.guest_name,
          check_out_time: b.check_out_time,
          booking_id: b.id
        });
      }
    }
  });

  const result = typedRooms.map((room) => {
    const roomBookings = typedBookings.filter((b) => b.room_id === room.id);
    
    const bookedNumbers = new Set<string>();
    const lateCheckoutRooms: Array<{ room_number: string; guest_name: string; checkout_time: string }> = [];
    
    roomBookings.forEach((b) => {
      const isBlocking = isBookingBlocking(b, checkIn);
      
      const multiRoomNumbers = bookingRooms
        .filter((br) => br.booking_id === b.id && br.room_id === room.id)
        .map((br) => br.room_number);
      
      const roomNums = multiRoomNumbers.length > 0 
        ? multiRoomNumbers 
        : (b.allocated_room_number ? [b.allocated_room_number] : []);
      
      if (isBlocking) {
        roomNums.forEach((num) => bookedNumbers.add(num));
      }
      
      if (b.check_out === checkIn && b.check_out_time) {
        const standardHour = parseInt(standardCheckOutTime.split(':')[0]);
        const actualHour = parseInt(b.check_out_time.split(':')[0]);
        if (actualHour > standardHour) {
          roomNums.forEach((num) => {
            lateCheckoutRooms.push({
              room_number: num,
              guest_name: b.guest_name,
              checkout_time: b.check_out_time!
            });
          });
        }
      }
    });
    
    const blockedNumbers = new Set(
      typedBlockedDates.filter((d) => d.room_id === room.id).map((d) => d.room_number)
    );

    const allNumbers = room.room_numbers || [];
    const availableNumbers = allNumbers.filter(
      (num) => !bookedNumbers.has(num) && !blockedNumbers.has(num)
    );

    // Check for active promo
    const roomPromo = typedPromos.find((p) => p.room_id === room.id);
    
    let promoInfo: Record<string, unknown> | null = null;
    let finalPrice = room.price_per_night;
    let savings = 0;

    if (roomPromo) {
      if (roomPromo.promo_price) {
        finalPrice = roomPromo.promo_price;
      } else if (roomPromo.discount_percentage) {
        finalPrice = Math.round(room.price_per_night * (1 - roomPromo.discount_percentage / 100));
      }
      savings = room.price_per_night - finalPrice;
      promoInfo = {
        name: roomPromo.name,
        type: roomPromo.promo_price ? 'fixed' : 'percentage',
        discount_percentage: roomPromo.discount_percentage || null,
        promo_price: roomPromo.promo_price || null,
        badge_text: roomPromo.badge_text || null,
        start_date: roomPromo.start_date,
        end_date: roomPromo.end_date
      };
    } else if (room.promo_price && room.promo_start_date && room.promo_end_date) {
      if (checkIn <= room.promo_end_date && checkOut >= room.promo_start_date) {
        finalPrice = room.promo_price;
        savings = room.price_per_night - finalPrice;
        promoInfo = {
          name: 'Promo Spesial',
          type: 'fixed',
          promo_price: room.promo_price,
          start_date: room.promo_start_date,
          end_date: room.promo_end_date
        };
      }
    }

    return {
      room_name: room.name,
      total_units: room.room_count,
      available_units: availableNumbers.length,
      available_room_numbers: availableNumbers,
      price_per_night: room.price_per_night,
      final_price: finalPrice,
      promo: promoInfo,
      savings: savings,
      booked_numbers: Array.from(bookedNumbers),
      blocked_numbers: Array.from(blockedNumbers),
      late_checkouts: lateCheckoutRooms
    };
  });

  return {
    check_in: checkIn,
    check_out: checkOut,
    standard_check_in_time: standardCheckInTime,
    standard_check_out_time: standardCheckOutTime,
    rooms: result,
    total_available: result.reduce((sum, r) => sum + r.available_units, 0),
    has_promos: result.some((r) => r.promo !== null),
    late_checkouts: lateCheckouts
  };
}

export async function getTodayGuests(supabase: SupabaseClient, type: string = 'all', dateStr?: string) {
  const wibDate = getWibDate();
  const targetDate = dateStr || formatDateISO(wibDate);
  const currentTimeStr = getCurrentTimeWIB();

  console.log(`📅 getTodayGuests: type=${type}, date=${targetDate}, time=${currentTimeStr}`);

  // Fetch checkout time from hotel settings
  const { data: hotelSettings } = await supabase
    .from('hotel_settings')
    .select('check_out_time')
    .single();
  
  const checkoutTime = hotelSettings?.check_out_time || '12:00';
  const isBeforeCheckoutTime = isBeforeTime(checkoutTime);

  console.log(`⏰ Checkout time: ${checkoutTime}, isBeforeCheckout: ${isBeforeCheckoutTime}`);

  const results: {
    date: string;
    current_time: string;
    checkout_time: string;
    is_before_checkout_time: boolean;
    checkin_guests: Array<Record<string, unknown>>;
    checkout_guests: Array<Record<string, unknown>>;
    staying_guests: Array<Record<string, unknown>>;
    summary?: Record<string, number>;
  } = {
    date: targetDate,
    current_time: currentTimeStr,
    checkout_time: checkoutTime,
    is_before_checkout_time: isBeforeCheckoutTime,
    checkin_guests: [],
    checkout_guests: [],
    staying_guests: []
  };

  // Helper to get all room numbers for a booking
  const getRoomNumbers = async (bookingId: string, allocatedRoomNumber: string | null): Promise<string[]> => {
    const { data: bookingRoomsData } = await supabase
      .from('booking_rooms')
      .select('room_number')
      .eq('booking_id', bookingId);
    
    if (bookingRoomsData && bookingRoomsData.length > 0) {
      return (bookingRoomsData as BookingRoomNumber[]).map((br) => br.room_number);
    }
    return allocatedRoomNumber ? [allocatedRoomNumber] : [];
  };

  // Query for check-in today
  if (type === 'checkin' || type === 'all') {
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, status, rooms(name)')
      .eq('check_in', targetDate)
      .in('status', ['confirmed', 'checked_in'])
      .order('guest_name');
    
    const guests = [];
    for (const b of (data || []) as unknown as GuestBookingRow[]) {
      const roomNumbers = await getRoomNumbers(b.id, b.allocated_room_number);
      guests.push({
        booking_code: b.booking_code,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        room_name: Array.isArray(b.rooms) ? b.rooms[0]?.name : b.rooms?.name,
        room_number: roomNumbers.join(', '),
        room_numbers: roomNumbers,
        room_count: roomNumbers.length,
        check_in: b.check_in,
        check_out: b.check_out,
        num_guests: b.num_guests,
        total_price: b.total_price
      });
    }
    results.checkin_guests = guests;
  }

  // Query for check-out today
  if (type === 'checkout' || type === 'all') {
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, status, rooms(name)')
      .eq('check_out', targetDate)
      .in('status', ['confirmed', 'checked_in'])
      .order('guest_name');
    
    const guests = [];
    for (const b of (data || []) as unknown as GuestBookingRow[]) {
      const roomNumbers = await getRoomNumbers(b.id, b.allocated_room_number);
      guests.push({
        booking_code: b.booking_code,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        room_name: Array.isArray(b.rooms) ? b.rooms[0]?.name : b.rooms?.name,
        room_number: roomNumbers.join(', '),
        room_numbers: roomNumbers,
        room_count: roomNumbers.length,
        check_in: b.check_in,
        check_out: b.check_out,
        num_guests: b.num_guests,
        total_price: b.total_price
      });
    }
    results.checkout_guests = guests;
  }

  // Query for staying guests
  if (type === 'staying' || type === 'all') {
    let stayingQuery = supabase
      .from('bookings')
      .select('id, booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, status, rooms(name)')
      .lte('check_in', targetDate)
      .in('status', ['confirmed', 'checked_in'])
      .order('guest_name');
    
    if (isBeforeCheckoutTime) {
      stayingQuery = stayingQuery.gte('check_out', targetDate);
    } else {
      stayingQuery = stayingQuery.gt('check_out', targetDate);
    }
    
    const { data } = await stayingQuery;
    
    const guests = [];
    for (const b of (data || []) as unknown as GuestBookingRow[]) {
      const roomNumbers = await getRoomNumbers(b.id, b.allocated_room_number);
      guests.push({
        booking_code: b.booking_code,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        room_name: Array.isArray(b.rooms) ? b.rooms[0]?.name : b.rooms?.name,
        room_number: roomNumbers.join(', '),
        room_numbers: roomNumbers,
        room_count: roomNumbers.length,
        check_in: b.check_in,
        check_out: b.check_out,
        num_guests: b.num_guests,
        total_price: b.total_price,
        is_checkout_today: b.check_out === targetDate
      });
    }
    results.staying_guests = guests;
  }

  // Add summary counts
  results.summary = {
    checkin_count: results.checkin_guests.length,
    checkout_count: results.checkout_guests.length,
    staying_count: results.staying_guests.length,
    total_guests_in_house: results.staying_guests.length
  };

  return results;
}
