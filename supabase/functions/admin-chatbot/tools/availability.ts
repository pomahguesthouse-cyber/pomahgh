// ============= AVAILABILITY TOOLS =============

import { getWibDate, formatDateISO, isBeforeTime, getCurrentTimeWIB } from "../lib/dateHelpers.ts";

/* ================= TYPES ================= */

interface RoomRow {
  id: string;
  name: string;
  room_count: number;
  room_numbers: string[];
  price_per_night: number;
  promo_price: number | null;
  promo_start_date: string | null;
  promo_end_date: string | null;
  sunday_price?: number | null;
  monday_price?: number | null;
  tuesday_price?: number | null;
  wednesday_price?: number | null;
  thursday_price?: number | null;
  friday_price?: number | null;
  saturday_price?: number | null;
}

interface BookingRow {
  room_id?: string;
  booking_code: string;
  guest_name: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  allocated_room_number: string | null;
  num_guests: number;
  total_price: number;
  status?: string;
  rooms?: {
    name: string;
  } | null;
}

interface BlockedDateRow {
  room_id: string;
  room_number: string;
  unavailable_date: string;
}

interface RoomPromotionRow {
  room_id: string;
  name: string;
  promo_price: number | null;
  discount_percentage: number | null;
  badge_text: string | null;
  start_date: string;
  end_date: string;
  priority: number;
}

/* ================= HELPERS ================= */

function isDateInRange(checkIn: string, checkOut: string, date: string) {
  // check_out EXCLUSIVE
  return checkIn <= date && date < checkOut;
}

/* ================= AVAILABILITY ================= */

export async function getAvailabilitySummary(supabase: unknown, checkIn: string, checkOut: string) {
  const { data: rooms, error: roomsError } = await (supabase as any)
    .from("rooms")
    .select(
      "id, name, room_count, room_numbers, price_per_night, promo_price, promo_start_date, promo_end_date, sunday_price, monday_price, tuesday_price, wednesday_price, thursday_price, friday_price, saturday_price",
    )
    .eq("available", true);

  if (roomsError) throw roomsError;

  const { data: bookings, error: bookingsError } = await (supabase as any)
    .from("bookings")
    .select("room_id, allocated_room_number, check_in, check_out, status")
    .in("status", ["confirmed", "checked_in"])
    .lt("check_in", checkOut)
    .gt("check_out", checkIn); // IMPORTANT: exclusive logic

  if (bookingsError) throw bookingsError;

  const { data: blockedDates, error: blockedError } = await (supabase as any)
    .from("room_unavailable_dates")
    .select("room_id, room_number, unavailable_date")
    .gte("unavailable_date", checkIn)
    .lt("unavailable_date", checkOut);

  if (blockedError) throw blockedError;

  const { data: activePromos } = await (supabase as any)
    .from("room_promotions")
    .select("*")
    .eq("is_active", true)
    .lt("start_date", checkOut)
    .gt("end_date", checkIn)
    .order("priority", { ascending: false });

  const result = (rooms as RoomRow[]).map((room) => {
    const roomBookings = (bookings as BookingRow[]).filter((b) => b.room_id === room.id);

    const bookedNumbers = new Set(roomBookings.map((b) => b.allocated_room_number).filter(Boolean));

    const blockedNumbers = new Set(
      (blockedDates as BlockedDateRow[]).filter((d) => d.room_id === room.id).map((d) => d.room_number),
    );

    const availableNumbers = room.room_numbers.filter((num) => !bookedNumbers.has(num) && !blockedNumbers.has(num));

    const roomPromo = (activePromos as RoomPromotionRow[])?.find((p) => p.room_id === room.id);

    let finalPrice = room.price_per_night;
    let savings = 0;
    let promoInfo: Record<string, unknown> | null = null;

    if (roomPromo) {
      if (roomPromo.promo_price) {
        finalPrice = roomPromo.promo_price;
      } else if (roomPromo.discount_percentage) {
        finalPrice = Math.round(room.price_per_night * (1 - roomPromo.discount_percentage / 100));
      }

      savings = room.price_per_night - finalPrice;

      promoInfo = {
        name: roomPromo.name,
        type: roomPromo.promo_price ? "fixed" : "percentage",
        promo_price: roomPromo.promo_price,
        discount_percentage: roomPromo.discount_percentage,
        badge_text: roomPromo.badge_text,
        start_date: roomPromo.start_date,
        end_date: roomPromo.end_date,
      };
    }

    return {
      room_name: room.name,
      total_units: room.room_count,
      available_units: availableNumbers.length,
      available_room_numbers: availableNumbers,
      price_per_night: room.price_per_night,
      final_price: finalPrice,
      promo: promoInfo,
      savings,
      booked_numbers: [...bookedNumbers],
      blocked_numbers: [...blockedNumbers],
    };
  });

  return {
    check_in: checkIn,
    check_out: checkOut,
    rooms: result,
    total_available: result.reduce((sum, r) => sum + r.available_units, 0),
    has_promos: result.some((r) => r.promo !== null),
  };
}

/* ================= TODAY GUESTS ================= */

export async function getTodayGuests(
  supabase: unknown,
  type: "all" | "checkin" | "checkout" | "staying" = "all",
  dateStr?: string,
) {
  const wibDate = getWibDate();
  const targetDate = dateStr || formatDateISO(wibDate);
  const currentTimeStr = getCurrentTimeWIB();

  const { data: hotelSettings } = await (supabase as any).from("hotel_settings").select("check_out_time").single();

  const checkoutTime = hotelSettings?.check_out_time ?? "12:00";
  const isBeforeCheckoutTime = isBeforeTime(checkoutTime);

  const results = {
    date: targetDate,
    current_time: currentTimeStr,
    checkout_time: checkoutTime,
    is_before_checkout_time: isBeforeCheckoutTime,
    checkin_guests: [] as Record<string, unknown>[],
    checkout_guests: [] as Record<string, unknown>[],
    staying_guests: [] as Record<string, unknown>[],
    summary: {
      checkin_count: 0,
      checkout_count: 0,
      staying_count: 0,
      total_guests_in_house: 0,
    },
  };

  const mapGuest = (b: BookingRow, extra = {}) => ({
    booking_code: b.booking_code,
    guest_name: b.guest_name,
    guest_phone: b.guest_phone,
    room_name: b.rooms?.name,
    room_number: b.allocated_room_number,
    check_in: b.check_in,
    check_out: b.check_out,
    num_guests: b.num_guests,
    total_price: b.total_price,
    ...extra,
  });

  if (type === "checkin" || type === "all") {
    const { data } = await (supabase as any)
      .from("bookings")
      .select(
        "booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, rooms(name)",
      )
      .eq("check_in", targetDate)
      .eq("status", "confirmed");

    results.checkin_guests = (data as BookingRow[]).map((b) => mapGuest(b));
  }

  if (type === "checkout" || type === "all") {
    const { data } = await (supabase as any)
      .from("bookings")
      .select(
        "booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, rooms(name)",
      )
      .eq("check_out", targetDate)
      .in("status", ["confirmed", "checked_in"]);

    results.checkout_guests = (data as BookingRow[]).map((b) => mapGuest(b));
  }

  if (type === "staying" || type === "all") {
    const { data } = await (supabase as any)
      .from("bookings")
      .select(
        "booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, rooms(name)",
      )
      .in("status", ["confirmed", "checked_in"]);

    results.staying_guests = (data as BookingRow[])
      .filter((b) =>
        isBeforeCheckoutTime
          ? isDateInRange(b.check_in, b.check_out, targetDate)
          : isDateInRange(b.check_in, b.check_out, targetDate),
      )
      .map((b) => mapGuest(b, { is_checkout_today: b.check_out === targetDate }));
  }

  results.summary = {
    checkin_count: results.checkin_guests.length,
    checkout_count: results.checkout_guests.length,
    staying_count: results.staying_guests.length,
    total_guests_in_house: results.staying_guests.length,
  };

  return results;
}
