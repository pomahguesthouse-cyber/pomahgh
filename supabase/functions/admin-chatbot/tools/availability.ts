export async function getTodayGuests(supabase: any, type: string = "all", dateStr?: string) {
  const wibDate = getWibDate();
  const targetDate = dateStr || formatDateISO(wibDate);
  const currentTimeStr = getCurrentTimeWIB();

  // Fetch checkout time from hotel settings
  const { data: hotelSettings } = await supabase.from("hotel_settings").select("check_out_time").single();

  const checkoutTime = hotelSettings?.check_out_time || "12:00";
  const isBeforeCheckoutTime = isBeforeTime(checkoutTime);

  const results: any = {
    date: targetDate,
    current_time: currentTimeStr,
    checkout_time: checkoutTime,
    is_before_checkout_time: isBeforeCheckoutTime,
    checkin_guests: [],
    checkout_guests: [],
    staying_guests: [],
  };

  // ================= CHECK-IN TODAY =================
  if (type === "checkin" || type === "all") {
    const { data } = await supabase
      .from("bookings")
      .select(
        "booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, rooms(name)",
      )
      .eq("check_in", targetDate)
      .eq("status", "confirmed")
      .order("guest_name");

    results.checkin_guests = (data || []).map((b: any) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      room_name: b.rooms?.name,
      room_number: b.allocated_room_number,
      check_in: b.check_in,
      check_out: b.check_out,
      num_guests: b.num_guests,
      total_price: b.total_price,
    }));
  }

  // ================= CHECK-OUT TODAY =================
  if (type === "checkout" || type === "all") {
    const { data } = await supabase
      .from("bookings")
      .select(
        "booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, rooms(name)",
      )
      .eq("check_out", targetDate)
      .eq("status", "confirmed")
      .order("guest_name");

    results.checkout_guests = (data || []).map((b: any) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      room_name: b.rooms?.name,
      room_number: b.allocated_room_number,
      check_in: b.check_in,
      check_out: b.check_out,
      num_guests: b.num_guests,
      total_price: b.total_price,
    }));
  }

  // ================= STAYING GUESTS (FIXED) =================
  if (type === "staying" || type === "all") {
    const { data } = await supabase
      .from("bookings")
      .select(
        "booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_price, rooms(name)",
      )
      .eq("status", "confirmed")
      .order("guest_name");

    const staying = (data || []).filter((b: any) => {
      // Check-in sudah lewat atau hari ini
      if (b.check_in > targetDate) return false;

      // Check-out setelah hari ini → pasti menginap
      if (b.check_out > targetDate) return true;

      // Check-out hari ini → masih menginap kalau belum lewat jam checkout
      if (b.check_out === targetDate) {
        return isBeforeCheckoutTime;
      }

      return false;
    });

    results.staying_guests = staying.map((b: any) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      room_name: b.rooms?.name,
      room_number: b.allocated_room_number,
      check_in: b.check_in,
      check_out: b.check_out,
      num_guests: b.num_guests,
      total_price: b.total_price,
      is_checkout_today: b.check_out === targetDate,
    }));
  }

  results.summary = {
    checkin_count: results.checkin_guests.length,
    checkout_count: results.checkout_guests.length,
    staying_count: results.staying_guests.length,
    total_guests_in_house: results.staying_guests.length,
  };

  return results;
}
