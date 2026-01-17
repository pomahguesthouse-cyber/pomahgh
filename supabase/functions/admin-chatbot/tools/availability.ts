// ============= AVAILABILITY TOOLS =============

import { getWibDate, formatDateISO, isBeforeTime, getCurrentTimeWIB } from "../lib/dateHelpers.ts";

export async function getAvailabilitySummary(supabase: any, checkIn: string, checkOut: string) {
  // Get all rooms with promo fields
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, name, room_count, room_numbers, price_per_night, ' +
      'promo_price, promo_start_date, promo_end_date, ' +
      'sunday_price, monday_price, tuesday_price, wednesday_price, ' +
      'thursday_price, friday_price, saturday_price')
    .eq('available', true);

  if (roomsError) throw roomsError;

  // Get bookings that overlap with the date range
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('room_id, allocated_room_number, check_in, check_out')
    .neq('status', 'cancelled')
    .lte('check_in', checkOut)
    .gte('check_out', checkIn);

  if (bookingsError) throw bookingsError;

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

  const result = rooms.map((room: any) => {
    const roomBookings = bookings?.filter((b: any) => b.room_id === room.id) || [];
    const bookedNumbers = new Set(roomBookings.map((b: any) => b.allocated_room_number));
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
      blocked_numbers: Array.from(blockedNumbers)
    };
  });

  return {
    check_in: checkIn,
    check_out: checkOut,
    rooms: result,
    total_available: result.reduce((sum: number, r: any) => sum + r.available_units, 0),
    has_promos: result.some((r: any) => r.promo !== null)
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

  // Query for check-in today
  if (type === 'checkin' || type === 'all') {
    const { data } = await supabase
      .from('bookings')
      .select('booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, rooms(name)')
      .eq('check_in', targetDate)
      .eq('status', 'confirmed')
      .order('guest_name');
    
    results.checkin_guests = (data || []).map((b: any) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      room_name: b.rooms?.name,
      room_number: b.allocated_room_number,
      check_in: b.check_in,
      check_out: b.check_out,
      num_guests: b.num_guests,
      total_price: b.total_price
    }));
  }

  // Query for check-out today
  if (type === 'checkout' || type === 'all') {
    const { data } = await supabase
      .from('bookings')
      .select('booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, rooms(name)')
      .eq('check_out', targetDate)
      .eq('status', 'confirmed')
      .order('guest_name');
    
    results.checkout_guests = (data || []).map((b: any) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      room_name: b.rooms?.name,
      room_number: b.allocated_room_number,
      check_in: b.check_in,
      check_out: b.check_out,
      num_guests: b.num_guests,
      total_price: b.total_price
    }));
  }

  // Query for staying guests
  if (type === 'staying' || type === 'all') {
    let stayingQuery = supabase
      .from('bookings')
      .select('booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, rooms(name)')
      .lte('check_in', targetDate)
      .eq('status', 'confirmed')
      .order('guest_name');
    
    if (isBeforeCheckoutTime) {
      stayingQuery = stayingQuery.gte('check_out', targetDate);
    } else {
      stayingQuery = stayingQuery.gt('check_out', targetDate);
    }
    
    const { data } = await stayingQuery;
    
    results.staying_guests = (data || []).map((b: any) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      room_name: b.rooms?.name,
      room_number: b.allocated_room_number,
      check_in: b.check_in,
      check_out: b.check_out,
      num_guests: b.num_guests,
      total_price: b.total_price,
      is_checkout_today: b.check_out === targetDate
    }));
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
