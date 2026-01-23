// ============= AVAILABILITY TOOLS =============

import { getWibDate, formatDateISO, isBeforeTime, getCurrentTimeWIB } from "../lib/dateHelpers.ts";

export async function getAvailabilitySummary(supabase: any, checkIn: string, checkOut: string) {
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

  // Get bookings that might overlap - we need to include bookings where:
  // 1. check_out > checkIn (still in room when new guest wants to check in)
  // 2. check_in < checkOut (arrives before new guest checks out)
  // But we also need to consider TIME, not just date
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, room_id, allocated_room_number, check_in, check_out, check_out_time, guest_name')
    .neq('status', 'cancelled')
    .lte('check_in', checkOut)
    .gte('check_out', checkIn);

  if (bookingsError) throw bookingsError;

  // Get booking_rooms for multi-room bookings
  const bookingIds = bookings?.map((b: any) => b.id) || [];
  let bookingRooms: any[] = [];
  if (bookingIds.length > 0) {
    const { data: brData } = await supabase
      .from('booking_rooms')
      .select('booking_id, room_id, room_number')
      .in('booking_id', bookingIds);
    bookingRooms = brData || [];
  }

  // Get blocked dates
  const { data: blockedDates, error: blockedError } = await supabase
    .from('room_unavailable_dates')
    .select('room_id, room_number, unavailable_date')
    .gte('unavailable_date', checkIn)
    .lte('unavailable_date', checkOut);

  if (blockedError) throw blockedError;

  // Fetch active promotions
  const { data: activePromos } = await supabase
    .from('room_promotions')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', checkOut)
    .gte('end_date', checkIn)
    .order('priority', { ascending: false });

  // Helper function to check if a booking truly blocks availability
  // considering check-in is AFTER check-out time
  const isBookingBlocking = (booking: any, requestedCheckIn: string): boolean => {
    const bookingCheckOut = booking.check_out;
    const bookingCheckOutTime = booking.check_out_time || standardCheckOutTime;
    
    // If booking checks out BEFORE the requested check-in date, no conflict
    if (bookingCheckOut < requestedCheckIn) return true; // Booking overlaps earlier dates
    
    // If booking checks out ON the same date as requested check-in
    if (bookingCheckOut === requestedCheckIn) {
      // Room is available if check-out time < standard check-in time
      // e.g., check-out at 12:00, new check-in at 14:00 -> room available
      // But if late checkout (e.g., 15:00), conflict with 14:00 check-in
      const checkOutHour = parseInt(bookingCheckOutTime.split(':')[0]);
      const checkInHour = parseInt(standardCheckInTime.split(':')[0]);
      
      // If checkout time is before or at standard checkout, room is available for new check-in
      const standardCheckOutHour = parseInt(standardCheckOutTime.split(':')[0]);
      if (checkOutHour <= standardCheckOutHour) {
        return false; // Not blocking - checkout is on time
      }
      
      // Late checkout - check if it conflicts with check-in time
      if (checkOutHour >= checkInHour) {
        return true; // Late checkout conflicts with new check-in
      }
      return false; // Late checkout but still before new check-in time
    }
    
    // Booking checkout is after requested check-in date - definitely blocking
    return true;
  };

  // Collect late checkout info
  const lateCheckouts: any[] = [];
  bookings?.forEach((b: any) => {
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

  const result = rooms.map((room: any) => {
    const roomBookings = bookings?.filter((b: any) => b.room_id === room.id) || [];
    
    // Collect booked room numbers from BOTH sources, but only if truly blocking
    const bookedNumbers = new Set<string>();
    const lateCheckoutRooms: any[] = [];
    
    roomBookings.forEach((b: any) => {
      // Check if this booking actually blocks the room
      const isBlocking = isBookingBlocking(b, checkIn);
      
      // Get room numbers from booking_rooms table for this booking
      const multiRoomNumbers = bookingRooms
        .filter((br: any) => br.booking_id === b.id && br.room_id === room.id)
        .map((br: any) => br.room_number);
      
      const roomNums = multiRoomNumbers.length > 0 
        ? multiRoomNumbers 
        : (b.allocated_room_number ? [b.allocated_room_number] : []);
      
      if (isBlocking) {
        roomNums.forEach((num: string) => bookedNumbers.add(num));
      }
      
      // Track late checkouts for this room
      if (b.check_out === checkIn && b.check_out_time) {
        const standardHour = parseInt(standardCheckOutTime.split(':')[0]);
        const actualHour = parseInt(b.check_out_time.split(':')[0]);
        if (actualHour > standardHour) {
          roomNums.forEach((num: string) => {
            lateCheckoutRooms.push({
              room_number: num,
              guest_name: b.guest_name,
              checkout_time: b.check_out_time
            });
          });
        }
      }
    });
    
    const blockedNumbers = new Set(
      blockedDates?.filter((d: any) => d.room_id === room.id).map((d: any) => d.room_number) || []
    );

    const allNumbers = room.room_numbers || [];
    const availableNumbers = allNumbers.filter(
      (num: string) => !bookedNumbers.has(num) && !blockedNumbers.has(num)
    );

    // Check for active promo
    const roomPromo = activePromos?.find((p: any) => p.room_id === room.id);
    
    let promoInfo = null;
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
    total_available: result.reduce((sum: number, r: any) => sum + r.available_units, 0),
    has_promos: result.some((r: any) => r.promo !== null),
    late_checkouts: lateCheckouts
  };
}

export async function getTodayGuests(supabase: any, type: string = 'all', dateStr?: string) {
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

  const results: any = {
    date: targetDate,
    current_time: currentTimeStr,
    checkout_time: checkoutTime,
    is_before_checkout_time: isBeforeCheckoutTime,
    checkin_guests: [],
    checkout_guests: [],
    staying_guests: []
  };

  // Helper to get all room numbers for a booking (from booking_rooms or fallback to allocated_room_number)
  const getRoomNumbers = async (bookingId: string, allocatedRoomNumber: string | null): Promise<string[]> => {
    const { data: bookingRooms } = await supabase
      .from('booking_rooms')
      .select('room_number')
      .eq('booking_id', bookingId);
    
    if (bookingRooms && bookingRooms.length > 0) {
      return bookingRooms.map((br: any) => br.room_number);
    }
    return allocatedRoomNumber ? [allocatedRoomNumber] : [];
  };

  // Query for check-in today (include confirmed and checked_in status)
  if (type === 'checkin' || type === 'all') {
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, status, rooms(name)')
      .eq('check_in', targetDate)
      .in('status', ['confirmed', 'checked_in'])
      .order('guest_name');
    
    const guests = [];
    for (const b of data || []) {
      const roomNumbers = await getRoomNumbers(b.id, b.allocated_room_number);
      guests.push({
        booking_code: b.booking_code,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        room_name: b.rooms?.name,
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

  // Query for check-out today (include confirmed and checked_in status)
  if (type === 'checkout' || type === 'all') {
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, status, rooms(name)')
      .eq('check_out', targetDate)
      .in('status', ['confirmed', 'checked_in'])
      .order('guest_name');
    
    const guests = [];
    for (const b of data || []) {
      const roomNumbers = await getRoomNumbers(b.id, b.allocated_room_number);
      guests.push({
        booking_code: b.booking_code,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        room_name: b.rooms?.name,
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

  // Query for staying guests (include confirmed and checked_in status)
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
    for (const b of data || []) {
      const roomNumbers = await getRoomNumbers(b.id, b.allocated_room_number);
      guests.push({
        booking_code: b.booking_code,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        room_name: b.rooms?.name,
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
