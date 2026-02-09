import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CreateBookingParams, MatchedRoom, RoomSelection } from '../lib/types.ts';
import { validateAndFixDate, calculateNights } from '../lib/dateUtils.ts';
import { findBestRoomMatch, getRoomListString } from '../lib/roomMatcher.ts';
import { getAvailableRoomNumbers } from '../services/availabilityService.ts';
import { sendBookingNotifications } from '../services/whatsappService.ts';

export async function handleCreateBookingDraft(
  supabase: SupabaseClient,
  params: CreateBookingParams
) {
  const { guest_name, guest_email, guest_phone, room_name, room_selections, num_guests, special_requests } = params;
  
  if (!guest_phone || !guest_phone.trim()) {
    throw new Error("Nomor telepon wajib diisi untuk membuat booking");
  }
  
  const checkInResult = validateAndFixDate(params.check_in, "check_in");
  const checkOutResult = validateAndFixDate(params.check_out, "check_out");
  
  const check_in = checkInResult.date;
  const check_out = checkOutResult.date;
  
  console.log("Creating booking with params:", { guest_name, guest_email, guest_phone, check_in, check_out, room_name, room_selections });
  
  const total_nights = calculateNights(check_in, check_out);

  let roomsToBook: RoomSelection[] = [];
  
  if (room_selections && room_selections.length > 0) {
    roomsToBook = room_selections.map(r => ({
      room_name: r.room_name,
      quantity: r.quantity || 1
    }));
  } else if (room_name) {
    roomsToBook = [{ room_name, quantity: 1 }];
  } else {
    throw new Error("Mohon pilih minimal satu kamar untuk booking");
  }
  
  const { data: allRooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, price_per_night, allotment, room_numbers")
    .eq("available", true);

  if (roomsError) {
    console.error("Rooms fetch error:", roomsError);
    throw new Error(`Error fetching rooms: ${roomsError.message}`);
  }

  const matchedRooms: MatchedRoom[] = [];
  let totalPrice = 0;
  const roomsSummary: string[] = [];

  for (const selection of roomsToBook) {
    const room = findBestRoomMatch(selection.room_name, allRooms || []);

    if (!room) {
      const roomList = getRoomListString(allRooms || []);
      throw new Error(`Kamar "${selection.room_name}" tidak ditemukan. Kamar yang tersedia: ${roomList}`);
    }

    console.log(`Matched "${selection.room_name}" to room "${room.name}"`);

    const roomNumbers: string[] = (room.room_numbers as string[] | null) || [];
    const { available: availableNumbers } = await getAvailableRoomNumbers(supabase, {
      roomId: room.id as string,
      roomNumbers,
      checkIn: check_in,
      checkOut: check_out
    });

    if (availableNumbers.length < selection.quantity) {
      throw new Error(`Kamar ${room.name} hanya tersisa ${availableNumbers.length}, tidak cukup untuk ${selection.quantity} kamar yang diminta`);
    }

    const pricePerNight = room.price_per_night as number;
    const roomPrice = pricePerNight * selection.quantity * total_nights;
    totalPrice += roomPrice;

    matchedRooms.push({
      roomId: room.id as string,
      roomName: room.name as string,
      pricePerNight: pricePerNight,
      quantity: selection.quantity,
      availableNumbers: availableNumbers.slice(0, selection.quantity)
    });

    roomsSummary.push(`${selection.quantity}x ${room.name}`);
  }

  console.log("Matched rooms:", matchedRooms);
  console.log("Total price:", totalPrice);

  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id, booking_code, check_in, check_out, room_id, total_price")
    .eq("guest_email", guest_email)
    .eq("guest_phone", guest_phone)
    .eq("status", "pending")
    .eq("booking_source", "other")
    .eq("other_source", "Chatbot AI")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let booking: { id: string; booking_code: string; [key: string]: unknown };
  let isUpdate = false;

  const primaryRoom = matchedRooms[0];

  if (existingBooking) {
    console.log(`Found existing booking ${existingBooking.id}, updating...`);
    
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        check_in,
        check_out,
        room_id: primaryRoom.roomId,
        allocated_room_number: primaryRoom.availableNumbers[0],
        num_guests: num_guests || 1,
        special_requests: special_requests || null,
        total_nights,
        total_price: totalPrice,
        updated_at: new Date().toISOString()
      })
      .eq("id", existingBooking.id)
      .select()
      .single();
      
    if (updateError) {
      console.error("Booking update error:", updateError);
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }
    
    booking = updatedBooking;
    isUpdate = true;

    await supabase.from("booking_rooms").delete().eq("booking_id", booking.id);
  } else {
    console.log("No existing booking found, creating new...");
    
    const { data: newBooking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        guest_name,
        guest_email,
        guest_phone,
        check_in,
        check_out,
        room_id: primaryRoom.roomId,
        allocated_room_number: primaryRoom.availableNumbers[0],
        num_guests: num_guests || 1,
        special_requests: special_requests || null,
        total_nights,
        total_price: totalPrice,
        status: 'pending',
        payment_status: 'unpaid',
        booking_source: 'other',
        other_source: 'Chatbot AI'
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking insert error:", bookingError);
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }
    
    booking = newBooking;
    isUpdate = false;
  }

  const bookingRoomsData: Array<{
    booking_id: string;
    room_id: string;
    room_number: string;
    price_per_night: number;
  }> = [];

  for (const room of matchedRooms) {
    for (let i = 0; i < room.quantity; i++) {
      bookingRoomsData.push({
        booking_id: booking.id,
        room_id: room.roomId,
        room_number: room.availableNumbers[i],
        price_per_night: room.pricePerNight
      });
    }
  }

  if (bookingRoomsData.length > 0) {
    const { error: bookingRoomsError } = await supabase
      .from("booking_rooms")
      .insert(bookingRoomsData);
    
    if (bookingRoomsError) {
      console.error("Failed to insert booking_rooms:", bookingRoomsError);
    }
  }

  const { data: hotelSettings } = await supabase
    .from("hotel_settings")
    .select("whatsapp_number, hotel_name")
    .single();

  const roomsText = roomsSummary.join(", ");
  const totalRooms = bookingRoomsData.length;

  sendBookingNotifications(hotelSettings, {
    guestName: guest_name,
    guestEmail: guest_email,
    guestPhone: guest_phone,
    roomsText,
    totalRooms,
    checkIn: check_in,
    checkOut: check_out,
    numGuests: num_guests || 1,
    totalNights: total_nights,
    totalPrice,
    bookingCode: booking.booking_code as string
  }, isUpdate ? 'reschedule' : 'new');

  const paymentUrl = `https://pomahgh.lovable.app/payment/${booking.id}`;

  return {
    message: isUpdate
      ? `Booking berhasil diperbarui! Kode: ${booking.booking_code}. Kamar: ${roomsText}. Total baru: Rp ${totalPrice.toLocaleString('id-ID')}. Silakan lakukan pembayaran melalui link berikut: ${paymentUrl}`
      : `Booking berhasil dibuat! Kode: ${booking.booking_code}. Kamar: ${roomsText} (${totalRooms} kamar). Total: Rp ${totalPrice.toLocaleString('id-ID')}. Silakan lakukan pembayaran melalui link berikut: ${paymentUrl}`,
    booking_code: booking.booking_code,
    booking_id: booking.id,
    payment_url: paymentUrl,
    rooms_booked: roomsSummary,
    total_rooms: totalRooms,
    total_price: totalPrice,
    status: 'pending',
    is_update: isUpdate
  };
}
