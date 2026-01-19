// ============= AVAILABILITY TOOLS =============

import { getWibDate, formatDateISO, getCurrentTimeWIB, isBeforeTime } from "../lib/dateHelpers.ts";

// ================= AVAILABILITY SUMMARY =================

export async function getAvailabilitySummary(supabase: any, checkIn: string, checkOut: string) {
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select(
      `
      id,
      name,
      room_count,
      room_numbers,
      price_per_night,
      promo_price,
      promo_start_date,
      promo_end_date,
      sunday_price,
      monday_price,
      tuesday_price,
      wednesday_price,
      thursday_price,
      friday_price,
      saturday_price
    `,
    )
    .eq("available", true);

  if (roomsError) throw roomsError;

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("room_id, allocated_room_number, check_in, check_out")
    .neq("status", "cancelled")
    .lte("check_in", checkOut)
    .gte("check_out", checkIn);

  if (bookingsError) throw bookingsError;

  const { data: blockedDates, error: blockedError } = await supabase
    .from("room_unavailable_dates")
    .select("room_id, room_number")
    .gte("unavailable_date", checkIn)
    .lte("unavailable_date", checkOut);

  if (blockedError) throw blockedError;

  const result = (rooms || []).map((room: any) => {
    const roomBookings = (bookings || []).filter((b: any) => b.room_id === room.id);

    const bookedNumbers = new Set(roomBookings.map((b: any) => b.allocated_room_number));

    const blockedNumbers = new Set(
      (blockedDates || []).filter((d: any) => d.room_id === room.id).map((d: any) => d.room_number),
    );

    const allNumbers = room.room_numbers || [];

    const availableNumbers = allNumbers.filter((num: string) => !bookedNumbers.has(num) && !blockedNumbers.has(num));

    return {
      room_name: room.name,
      total_units: room.room_count,
      available_units: availableNumbers.length,
      available_room_numbers: availableNumbers,
      price_per_night: room.price_per_night,
      booked_numbers: Array.from(bookedNumbers),
      blocked_numbers: Array.from(blockedNumbers),
    };
  });

  return {
    check_in: checkIn,
    check_out: checkOut,
    rooms: result,
    total_available: result.reduce((sum: number, r: any) => sum + r.available_units, 0),
  };
}

// ================= TODAY GUESTS (FIXED LOGIC) =================

export async function getTodayGuests(supabase: any, type: string = "all", dateStr?: string) {
  const wibDate = getWibDate();
  const targetDate = dateStr || formatDateISO(wibDate);
  const currentTime = getCurrentTimeWIB();

  const { data: hotelSettings } = await supabase.from("hotel_settings").select("check_out_time").single();

  const checkoutTime = hotelSettings?.check_out_time || "12:00";
  const isBeforeCheckout = isBeforeTime(checkoutTime);

  const results: any = {
    date: targetDate,
    current_time: currentTime,
    checkout_time: checkoutTime,
    is_before_checkout_time: isBeforeCheckout,
    checkin_guests: [],
    checkout_guests: [],
    staying_guests: [],
  };

  const baseSelect = `
    booking_code,
    guest_name,
    guest_phone,
    check_in,
    check_out,
    allocated_room_number,
    num_guests,
    total_price,
    rooms(name)
  `;

  // CHECK-IN TODAY
  if (type === "checkin" || type === "all") {
    const { data } = await supabase
      .from("bookings")
      .select(baseSelect)
      .eq("check_in", targetDate)
      .eq("status", "confirmed");

    results.checkin_guests = data || [];
  }

  // CHECK-OUT TODAY
  if (type === "checkout" || type === "all") {
    const { data } = await supabase
      .from("bookings")
      .select(baseSelect)
      .eq("check_out", targetDate)
      .eq("status", "confirmed");

    results.checkout_guests = data || [];
  }

  // STAYING GUESTS (HOTEL LOGIC)
  if (type === "staying" || type === "all") {
    const { data } = await supabase.from("bookings").select(baseSelect).eq("status", "confirmed");

    results.staying_guests = (data || []).filter((b: any) => {
      if (b.check_in > targetDate) return false;
      if (b.check_out > targetDate) return true;
      if (b.check_out === targetDate) return isBeforeCheckout;
      return false;
    });
  }

  results.summary = {
    checkin_count: results.checkin_guests.length,
    checkout_count: results.checkout_guests.length,
    staying_count: results.staying_guests.length,
    total_guests_in_house: results.staying_guests.length,
  };

  return results;
}
