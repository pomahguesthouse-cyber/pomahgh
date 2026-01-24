// ============= BOOKING MUTATION TOOLS =============

import { findBestRoomMatch } from "../lib/roomMatcher.ts";
import { DAY_PRICE_FIELDS } from "../lib/constants.ts";

// Helper function to get price for a specific day of week
function getDayPrice(room: any, dayOfWeek: number): number {
  const priceField = DAY_PRICE_FIELDS[dayOfWeek];
  return room[priceField] || room.price_per_night;
}

// Calculate final price with promo and day-of-week pricing
function calculateFinalPrice(
  room: any, 
  checkIn: Date, 
  checkOut: Date, 
  activePromo: any
): { totalPrice: number; promoNights: number; originalPrice: number } {
  let totalPrice = 0;
  let originalPrice = 0;
  let promoNights = 0;
  
  const currentDate = new Date(checkIn);
  while (currentDate < checkOut) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const baseDayPrice = getDayPrice(room, dayOfWeek);
    originalPrice += baseDayPrice;
    let nightPrice = baseDayPrice;
    
    if (activePromo && dateStr >= activePromo.start_date && dateStr <= activePromo.end_date) {
      if (activePromo.promo_price) {
        nightPrice = activePromo.promo_price;
        promoNights++;
      } else if (activePromo.discount_percentage) {
        nightPrice = Math.round(baseDayPrice * (1 - activePromo.discount_percentage / 100));
        promoNights++;
      }
    } else if (room.promo_price && room.promo_start_date && room.promo_end_date) {
      if (dateStr >= room.promo_start_date && dateStr <= room.promo_end_date) {
        nightPrice = room.promo_price;
        promoNights++;
      }
    }
    
    totalPrice += nightPrice;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return { totalPrice, promoNights, originalPrice };
}

export async function createAdminBooking(supabase: any, args: any) {
  console.log(`📝 createAdminBooking called with args:`, JSON.stringify(args));
  
  // Fetch all rooms for smart matching
  const { data: allRooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, name, price_per_night, room_numbers, max_guests, ' +
      'sunday_price, monday_price, tuesday_price, wednesday_price, ' +
      'thursday_price, friday_price, saturday_price, ' +
      'promo_price, promo_start_date, promo_end_date')
    .eq('available', true);

  if (roomsError) throw roomsError;

  const room = findBestRoomMatch(args.room_name, allRooms || []);
  
  if (!room) {
    const roomList = allRooms?.map((r: any) => r.name).join(', ') || 'tidak ada';
    throw new Error(`Kamar "${args.room_name}" tidak ditemukan. Kamar yang tersedia: ${roomList}`);
  }

  const checkIn = new Date(args.check_in);
  const checkOut = new Date(args.check_out);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  if (nights <= 0) {
    throw new Error('Tanggal check-out harus setelah check-in');
  }

  // Fetch active promotions
  const { data: activePromos } = await supabase
    .from('room_promotions')
    .select('*')
    .eq('room_id', room.id)
    .eq('is_active', true)
    .lte('start_date', args.check_out)
    .gte('end_date', args.check_in)
    .order('priority', { ascending: false });

  const activePromo = activePromos?.[0] || null;

  // Get existing bookings
  const { data: conflictingBookings } = await supabase
    .from('bookings')
    .select('allocated_room_number')
    .eq('room_id', room.id)
    .neq('status', 'cancelled')
    .lte('check_in', args.check_out)
    .gte('check_out', args.check_in);

  const bookedNumbers = new Set(conflictingBookings?.map((b: any) => b.allocated_room_number) || []);
  
  // Get blocked dates
  const { data: blockedDates } = await supabase
    .from('room_unavailable_dates')
    .select('room_number')
    .eq('room_id', room.id)
    .gte('unavailable_date', args.check_in)
    .lte('unavailable_date', args.check_out);

  const blockedNumbers = new Set(blockedDates?.map((d: any) => d.room_number) || []);

  // Determine allocated room number
  let allocatedRoomNumber = args.room_number;
  let allocationMode = 'manual';

  if (!allocatedRoomNumber) {
    const availableNumbers = (room.room_numbers || []).filter(
      (num: string) => !bookedNumbers.has(num) && !blockedNumbers.has(num)
    );

    if (availableNumbers.length === 0) {
      throw new Error(`Tidak ada kamar ${room.name} yang tersedia untuk tanggal ${args.check_in} s.d. ${args.check_out}`);
    }

    allocatedRoomNumber = availableNumbers[0];
    allocationMode = 'auto';
  } else {
    if (!room.room_numbers?.includes(allocatedRoomNumber)) {
      throw new Error(`Nomor kamar ${allocatedRoomNumber} tidak tersedia untuk ${room.name}`);
    }

    if (bookedNumbers.has(allocatedRoomNumber) || blockedNumbers.has(allocatedRoomNumber)) {
      const availableNumbers = (room.room_numbers || []).filter(
        (num: string) => !bookedNumbers.has(num) && !blockedNumbers.has(num)
      );
      throw new Error(`Kamar ${room.name} nomor ${allocatedRoomNumber} sudah terboking. Tersedia: ${availableNumbers.join(', ') || 'tidak ada'}`);
    }
  }

  const { totalPrice, promoNights, originalPrice } = calculateFinalPrice(room, checkIn, checkOut, activePromo);
  const savings = originalPrice - totalPrice;

  console.log(`📋 Inserting booking: guest=${args.guest_name}, room=${room.name}#${allocatedRoomNumber}, dates=${args.check_in} to ${args.check_out}`);

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      room_id: room.id,
      allocated_room_number: allocatedRoomNumber,
      guest_name: args.guest_name,
      guest_phone: args.guest_phone,
      guest_email: args.guest_email || `${args.guest_phone}@guest.local`,
      check_in: args.check_in,
      check_out: args.check_out,
      num_guests: args.num_guests,
      total_nights: nights,
      total_price: totalPrice,
      status: 'confirmed',
      booking_source: 'admin'
    })
    .select('booking_code, id')
    .single();

  if (bookingError) {
    console.error(`❌ createAdminBooking INSERT failed:`, JSON.stringify(bookingError));
    throw new Error(`Gagal menyimpan booking: ${bookingError.message}`);
  }

  console.log(`✅ createAdminBooking SUCCESS: booking_code=${booking.booking_code}, id=${booking.id}`);

  // Notify managers (non-blocking)
  try {
    await supabase.functions.invoke('notify-new-booking', {
      body: {
        booking_code: booking.booking_code,
        guest_name: args.guest_name,
        guest_phone: args.guest_phone,
        room_name: room.name,
        room_number: allocatedRoomNumber,
        check_in: args.check_in,
        check_out: args.check_out,
        total_nights: nights,
        num_guests: args.num_guests,
        total_price: totalPrice,
        original_price: originalPrice,
        booking_source: 'admin',
        promo_applied: activePromo?.name || null,
        promo_nights: promoNights,
        savings: savings
      }
    });
  } catch (notifyError) {
    console.error('Failed to notify managers:', notifyError);
  }

  return {
    success: true,
    booking_code: booking.booking_code,
    guest_name: args.guest_name,
    room_name: room.name,
    room_number: allocatedRoomNumber,
    allocation_mode: allocationMode,
    check_in: args.check_in,
    check_out: args.check_out,
    nights: nights,
    total_price: totalPrice,
    original_price: originalPrice,
    promo_applied: activePromo?.name || null,
    promo_nights: promoNights,
    savings: savings
  };
}

export async function updateBookingStatus(supabase: any, bookingCode: string, newStatus: string, reason?: string) {
  const { data: booking, error: findError } = await supabase
    .from('bookings')
    .select('id, booking_code, guest_name, status, special_requests, rooms(name)')
    .eq('booking_code', bookingCode)
    .single();

  if (findError || !booking) {
    throw new Error(`Booking ${bookingCode} tidak ditemukan`);
  }

  const oldStatus = booking.status;
  const updateData: any = { 
    status: newStatus,
    updated_at: new Date().toISOString()
  };

  if (newStatus === 'cancelled' && reason) {
    const existingRequests = booking.special_requests || '';
    updateData.special_requests = `[DIBATALKAN: ${reason}] ${existingRequests}`.trim();
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', booking.id);

  if (updateError) throw updateError;

  return {
    success: true,
    booking_code: bookingCode,
    guest_name: booking.guest_name,
    room_name: booking.rooms?.name,
    old_status: oldStatus,
    new_status: newStatus,
    cancellation_reason: reason || null
  };
}

export async function updateGuestInfo(supabase: any, args: any) {
  const { booking_code, guest_name, guest_phone, guest_email, num_guests } = args;

  const { data: booking, error: findError } = await supabase
    .from('bookings')
    .select('id, guest_name, guest_phone, guest_email, num_guests')
    .eq('booking_code', booking_code)
    .single();

  if (findError || !booking) {
    throw new Error(`Booking ${booking_code} tidak ditemukan`);
  }

  const updateData: any = { updated_at: new Date().toISOString() };
  const changes: string[] = [];

  if (guest_name && guest_name !== booking.guest_name) {
    updateData.guest_name = guest_name;
    changes.push(`Nama: ${booking.guest_name} → ${guest_name}`);
  }
  if (guest_phone && guest_phone !== booking.guest_phone) {
    updateData.guest_phone = guest_phone;
    changes.push(`HP: ${booking.guest_phone || '-'} → ${guest_phone}`);
  }
  if (guest_email && guest_email !== booking.guest_email) {
    updateData.guest_email = guest_email;
    changes.push(`Email: ${booking.guest_email || '-'} → ${guest_email}`);
  }
  if (num_guests && num_guests !== booking.num_guests) {
    updateData.num_guests = num_guests;
    changes.push(`Jumlah tamu: ${booking.num_guests} → ${num_guests}`);
  }

  if (changes.length === 0) {
    return { success: true, booking_code, message: 'Tidak ada perubahan data' };
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', booking.id);

  if (updateError) throw updateError;

  return { success: true, booking_code, changes };
}

export async function rescheduleBooking(supabase: any, args: any) {
  const { booking_code, new_check_in, new_check_out } = args;

  if (!new_check_in && !new_check_out) {
    throw new Error('Harus menyertakan new_check_in atau new_check_out');
  }

  const { data: booking, error: findError } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, room_id, allocated_room_number, rooms(price_per_night)')
    .eq('booking_code', booking_code)
    .single();

  if (findError || !booking) {
    throw new Error(`Booking ${booking_code} tidak ditemukan`);
  }

  const checkIn = new_check_in || booking.check_in;
  const checkOut = new_check_out || booking.check_out;

  if (new Date(checkOut) <= new Date(checkIn)) {
    throw new Error('Tanggal check-out harus setelah check-in');
  }

  // Check for conflicts
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id, booking_code')
    .eq('room_id', booking.room_id)
    .eq('allocated_room_number', booking.allocated_room_number)
    .neq('id', booking.id)
    .neq('status', 'cancelled')
    .lt('check_in', checkOut)
    .gt('check_out', checkIn);

  if (conflicts && conflicts.length > 0) {
    throw new Error(`Tanggal baru bentrok dengan booking lain (${conflicts[0].booking_code})`);
  }

  // Check blocked dates
  const { data: blockedDates } = await supabase
    .from('room_unavailable_dates')
    .select('unavailable_date')
    .eq('room_id', booking.room_id)
    .eq('room_number', booking.allocated_room_number)
    .gte('unavailable_date', checkIn)
    .lte('unavailable_date', checkOut);

  if (blockedDates && blockedDates.length > 0) {
    throw new Error(`Kamar diblokir pada tanggal: ${blockedDates.map((d: any) => d.unavailable_date).join(', ')}`);
  }

  const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
  const totalPrice = booking.rooms?.price_per_night * nights;

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      check_in: checkIn,
      check_out: checkOut,
      total_nights: nights,
      total_price: totalPrice,
      updated_at: new Date().toISOString()
    })
    .eq('id', booking.id);

  if (updateError) throw updateError;

  return {
    success: true,
    booking_code,
    old_dates: { check_in: booking.check_in, check_out: booking.check_out },
    new_dates: { check_in: checkIn, check_out: checkOut },
    new_nights: nights,
    new_total_price: totalPrice
  };
}

export async function changeBookingRoom(supabase: any, args: any) {
  const { booking_code, new_room_name, new_room_number } = args;

  const { data: booking, error: findError } = await supabase
    .from('bookings')
    .select('id, room_id, allocated_room_number, check_in, check_out, total_nights, rooms(name, price_per_night)')
    .eq('booking_code', booking_code)
    .single();

  if (findError || !booking) {
    throw new Error(`Booking ${booking_code} tidak ditemukan`);
  }

  const { data: allRooms } = await supabase.from('rooms').select('*');
  const newRoom = findBestRoomMatch(new_room_name, allRooms || []);

  if (!newRoom) {
    const roomList = allRooms?.map((r: any) => r.name).join(', ') || 'tidak ada';
    throw new Error(`Kamar "${new_room_name}" tidak ditemukan. Tersedia: ${roomList}`);
  }

  if (!newRoom.room_numbers?.includes(new_room_number)) {
    throw new Error(`Nomor kamar ${new_room_number} tidak ada di ${newRoom.name}. Tersedia: ${newRoom.room_numbers?.join(', ') || 'tidak ada'}`);
  }

  // Check availability
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id, booking_code')
    .eq('room_id', newRoom.id)
    .eq('allocated_room_number', new_room_number)
    .neq('id', booking.id)
    .neq('status', 'cancelled')
    .lt('check_in', booking.check_out)
    .gt('check_out', booking.check_in);

  if (conflicts && conflicts.length > 0) {
    throw new Error(`Kamar ${newRoom.name} ${new_room_number} tidak tersedia (bentrok dengan ${conflicts[0].booking_code})`);
  }

  // Check blocked dates
  const { data: blockedDates } = await supabase
    .from('room_unavailable_dates')
    .select('unavailable_date')
    .eq('room_id', newRoom.id)
    .eq('room_number', new_room_number)
    .gte('unavailable_date', booking.check_in)
    .lte('unavailable_date', booking.check_out);

  if (blockedDates && blockedDates.length > 0) {
    throw new Error(`Kamar ${newRoom.name} ${new_room_number} diblokir pada tanggal: ${blockedDates.map((d: any) => d.unavailable_date).join(', ')}`);
  }

  const newTotalPrice = newRoom.price_per_night * booking.total_nights;

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      room_id: newRoom.id,
      allocated_room_number: new_room_number,
      total_price: newTotalPrice,
      updated_at: new Date().toISOString()
    })
    .eq('id', booking.id);

  if (updateError) throw updateError;

  return {
    success: true,
    booking_code,
    old_room: { name: booking.rooms?.name, number: booking.allocated_room_number },
    new_room: { name: newRoom.name, number: new_room_number },
    old_total_price: booking.rooms?.price_per_night * booking.total_nights,
    new_total_price: newTotalPrice,
    price_difference: newTotalPrice - (booking.rooms?.price_per_night || 0) * booking.total_nights
  };
}

// Update booking status by room number (for check-in/check-out reports from managers)
export async function updateRoomStatus(supabase: any, args: any) {
  const { room_number, new_status, date } = args;
  
  // Get today's date in WIB timezone
  const today = date || new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
  
  // Find booking for this room number with relevant status
  // For check-in: look for confirmed bookings with check_in = today
  // For check-out: look for checked_in bookings with check_out = today
  let query = supabase
    .from('bookings')
    .select(`
      id, booking_code, guest_name, status, check_in, check_out, 
      allocated_room_number,
      rooms(name),
      booking_rooms(room_number, rooms(name))
    `);
  
  // Match by allocated_room_number OR booking_rooms
  if (new_status === 'checked_in') {
    // Check-in: Find confirmed booking with check_in = today
    query = query
      .in('status', ['confirmed', 'pending'])
      .eq('check_in', today);
  } else if (new_status === 'checked_out') {
    // Check-out: Find checked_in or confirmed booking with check_out = today (or past)
    query = query
      .in('status', ['checked_in', 'confirmed'])
      .lte('check_out', today);
  }
  
  const { data: bookings, error: findError } = await query;
  
  if (findError) throw findError;
  
  // Find the booking that matches this room number
  const matchingBooking = bookings?.find((b: any) => {
    // Check allocated_room_number (legacy)
    if (b.allocated_room_number === room_number) return true;
    // Check booking_rooms (multi-room)
    if (b.booking_rooms?.some((br: any) => br.room_number === room_number)) return true;
    return false;
  });
  
  if (!matchingBooking) {
    throw new Error(`Tidak ditemukan booking untuk kamar ${room_number} yang bisa di-${new_status === 'checked_in' ? 'check-in' : 'check-out'} hari ini`);
  }
  
  const oldStatus = matchingBooking.status;
  
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: new_status,
      updated_at: new Date().toISOString()
    })
    .eq('id', matchingBooking.id);
  
  if (updateError) throw updateError;
  
  // Get all room numbers for this booking
  const roomNumbers: string[] = [];
  if (matchingBooking.allocated_room_number) {
    roomNumbers.push(matchingBooking.allocated_room_number);
  }
  if (matchingBooking.booking_rooms) {
    matchingBooking.booking_rooms.forEach((br: any) => {
      if (br.room_number && !roomNumbers.includes(br.room_number)) {
        roomNumbers.push(br.room_number);
      }
    });
  }
  
  return {
    success: true,
    booking_code: matchingBooking.booking_code,
    guest_name: matchingBooking.guest_name,
    room_numbers: roomNumbers.join(', '),
    room_type: matchingBooking.rooms?.name || matchingBooking.booking_rooms?.[0]?.rooms?.name,
    old_status: oldStatus,
    new_status: new_status,
    check_in: matchingBooking.check_in,
    check_out: matchingBooking.check_out
  };
}

// Extend stay - perpanjang checkout
export async function extendStay(supabase: any, args: any) {
  const { room_number, new_check_out, extra_nights } = args;
  
  // Get today's date in WIB timezone
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
  
  // Find active booking for this room (checked_in or confirmed, checkout >= today)
  const { data: bookings, error: findError } = await supabase
    .from('bookings')
    .select(`
      id, booking_code, guest_name, status, check_in, check_out, total_nights, total_price,
      allocated_room_number, room_id,
      rooms(name, price_per_night),
      booking_rooms(room_number, room_id, price_per_night, rooms(name))
    `)
    .in('status', ['checked_in', 'confirmed'])
    .gte('check_out', today);
  
  if (findError) throw findError;
  
  // Find matching booking
  const matchingBooking = bookings?.find((b: any) => {
    if (b.allocated_room_number === room_number) return true;
    if (b.booking_rooms?.some((br: any) => br.room_number === room_number)) return true;
    return false;
  });
  
  if (!matchingBooking) {
    throw new Error(`Tidak ditemukan booking aktif untuk kamar ${room_number}`);
  }
  
  // Calculate new checkout date
  let newCheckOut: string;
  const currentCheckOut = new Date(matchingBooking.check_out);
  
  if (new_check_out) {
    newCheckOut = new_check_out;
  } else if (extra_nights) {
    currentCheckOut.setDate(currentCheckOut.getDate() + extra_nights);
    newCheckOut = currentCheckOut.toISOString().split('T')[0];
  } else {
    throw new Error('Harus menyertakan new_check_out atau extra_nights');
  }
  
  // Check for conflicts with new dates
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id, booking_code, guest_name')
    .eq('room_id', matchingBooking.room_id)
    .eq('allocated_room_number', room_number)
    .neq('id', matchingBooking.id)
    .neq('status', 'cancelled')
    .lt('check_in', newCheckOut)
    .gt('check_out', matchingBooking.check_out);
  
  if (conflicts && conflicts.length > 0) {
    throw new Error(`Tidak bisa extend karena kamar ${room_number} sudah dipesan oleh ${conflicts[0].guest_name} (${conflicts[0].booking_code})`);
  }
  
  // Calculate new price
  const checkIn = new Date(matchingBooking.check_in);
  const checkout = new Date(newCheckOut);
  const newNights = Math.ceil((checkout.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const extraNightsCount = newNights - matchingBooking.total_nights;
  const pricePerNight = matchingBooking.rooms?.price_per_night || matchingBooking.booking_rooms?.[0]?.price_per_night || 0;
  const extraPrice = extraNightsCount * pricePerNight;
  const newTotalPrice = matchingBooking.total_price + extraPrice;
  
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      check_out: newCheckOut,
      total_nights: newNights,
      total_price: newTotalPrice,
      updated_at: new Date().toISOString()
    })
    .eq('id', matchingBooking.id);
  
  if (updateError) throw updateError;
  
  // Get all room numbers
  const roomNumbers: string[] = [];
  if (matchingBooking.allocated_room_number) {
    roomNumbers.push(matchingBooking.allocated_room_number);
  }
  if (matchingBooking.booking_rooms) {
    matchingBooking.booking_rooms.forEach((br: any) => {
      if (br.room_number && !roomNumbers.includes(br.room_number)) {
        roomNumbers.push(br.room_number);
      }
    });
  }
  
  return {
    success: true,
    booking_code: matchingBooking.booking_code,
    guest_name: matchingBooking.guest_name,
    room_numbers: roomNumbers.join(', '),
    old_check_out: matchingBooking.check_out,
    new_check_out: newCheckOut,
    old_nights: matchingBooking.total_nights,
    new_nights: newNights,
    extra_nights: extraNightsCount,
    extra_price: extraPrice,
    old_total_price: matchingBooking.total_price,
    new_total_price: newTotalPrice
  };
}
