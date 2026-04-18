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
  const { guest_name, guest_email, guest_phone, room_name, room_selections, num_guests, special_requests, add_ons } = params;
  
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
  console.log("Total room price:", totalPrice);

  // Resolve add-ons (e.g. Extra Bed) → restrict to selected rooms
  const matchedAddons: Array<{
    addonId: string;
    addonName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }> = [];

  if (add_ons && add_ons.length > 0) {
    const selectedRoomIds = matchedRooms.map(r => r.roomId);
    const { data: availableAddons, error: addonsErr } = await supabase
      .from("room_addons")
      .select("id, name, price, room_id")
      .eq("is_active", true)
      .in("room_id", selectedRoomIds.length > 0 ? selectedRoomIds : ["00000000-0000-0000-0000-000000000000"]);

    if (addonsErr) {
      console.error("Add-ons fetch error:", addonsErr);
    }

    for (const sel of add_ons) {
      const qty = Math.max(1, Number(sel.quantity) || 1);
      const lowerName = (sel.addon_name || "").toLowerCase().trim();

      // Prefer addon tied to a specific selected room when room_name supplied
      let addon = null as { id: string; name: string; price: number; room_id: string | null } | null;
      if (sel.room_name) {
        const targetRoom = matchedRooms.find(
          r => r.roomName.toLowerCase() === sel.room_name!.toLowerCase()
        );
        if (targetRoom) {
          addon = (availableAddons || []).find(
            a => a.room_id === targetRoom.roomId && a.name.toLowerCase().includes(lowerName)
          ) as typeof addon || null;
        }
      }
      if (!addon) {
        addon = (availableAddons || []).find(
          a => a.name.toLowerCase().includes(lowerName)
        ) as typeof addon || null;
      }

      if (!addon) {
        console.warn(`Add-on "${sel.addon_name}" not found, skipping`);
        continue;
      }

      const unitPrice = Number(addon.price) || 0;
      const lineTotal = unitPrice * qty;
      matchedAddons.push({
        addonId: addon.id,
        addonName: addon.name,
        quantity: qty,
        unitPrice,
        totalPrice: lineTotal,
      });
      totalPrice += lineTotal;
    }
  }

  console.log("Matched add-ons:", matchedAddons);
  console.log("Grand total price:", totalPrice);
  // Idempotency: match by email+phone+dates+source to prevent duplicate bookings from webhook retries
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id, booking_code, check_in, check_out, room_id, total_price")
    .eq("guest_email", guest_email)
    .eq("guest_phone", guest_phone)
    .eq("status", "pending")
    .eq("booking_source", "other")
    .eq("other_source", "Chatbot AI")
    .eq("check_in", check_in)
    .eq("check_out", check_out)
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
    await supabase.from("booking_addons").delete().eq("booking_id", booking.id);
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
      // Rollback: remove orphaned booking
      if (!isUpdate) {
        await supabase.from("bookings").delete().eq("id", booking.id);
      }
      throw new Error(`Gagal menyimpan detail kamar: ${bookingRoomsError.message}`);
    }

    // Optimistic concurrency check: re-verify availability after insert
    // to prevent race condition where two concurrent requests book the same room
    if (!isUpdate) {
      for (const room of matchedRooms) {
        const roomNumbers: string[] = room.availableNumbers;
        const { available: postCheckAvailable } = await getAvailableRoomNumbers(supabase, {
          roomId: room.roomId,
          roomNumbers,
          checkIn: check_in,
          checkOut: check_out,
          excludeBookingId: booking.id
        });
        
        // If another booking took the same room numbers between our check and insert
        const conflictingNumbers = roomNumbers.filter(rn => !postCheckAvailable.includes(rn));
        if (conflictingNumbers.length > 0) {
          console.error(`⚠️ Race condition detected for room ${room.roomName}: ${conflictingNumbers.join(', ')} no longer available`);
          // Rollback: delete booking and booking_rooms
          await supabase.from("booking_rooms").delete().eq("booking_id", booking.id);
          await supabase.from("bookings").delete().eq("id", booking.id);
          throw new Error(`Maaf, kamar ${room.roomName} baru saja dipesan oleh tamu lain. Silakan cek ketersediaan ulang.`);
        }
      }
    }
  }

  // Insert booking_addons (e.g. extra bed)
  if (matchedAddons.length > 0) {
    const bookingAddonsData = matchedAddons.map(a => ({
      booking_id: booking.id,
      addon_id: a.addonId,
      quantity: a.quantity,
      unit_price: a.unitPrice,
      total_price: a.totalPrice,
    }));
    const { error: addonsInsertError } = await supabase
      .from("booking_addons")
      .insert(bookingAddonsData);
    if (addonsInsertError) {
      console.error("Failed to insert booking_addons:", addonsInsertError);
      // Non-fatal: booking already created, just warn
    }
  }

  const { data: hotelSettings } = await supabase
    .from("hotel_settings")
    .select("whatsapp_number, hotel_name, hotel_policies_enabled, hotel_policies_text, check_in_time, check_out_time")
    .single();

  const roomsText = roomsSummary.join(", ");
  const totalRooms = bookingRoomsData.length;

  // Send notification to the single hotel WhatsApp + customer
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

  // Also notify ALL managers via notify-new-booking edge function
  try {
    await supabase.functions.invoke('notify-new-booking', {
      body: {
        booking_code: booking.booking_code,
        guest_name,
        guest_email,
        guest_phone,
        room_name: roomsText,
        room_number: bookingRoomsData.map(r => r.room_number).join(', '),
        check_in,
        check_out,
        total_nights,
        total_price: totalPrice,
        num_guests: num_guests || 1,
        booking_source: 'other',
        other_source: 'Chatbot AI',
      }
    });
    console.log("✅ Manager notifications sent via notify-new-booking");
  } catch (notifyErr) {
    console.error("Failed to notify managers:", notifyErr);
  }

  // Fetch bank accounts from DB (dynamic, not hardcoded)
  const { data: bankAccountsData } = await supabase
    .from("bank_accounts")
    .select("bank_name, account_number, account_holder_name")
    .eq("is_active", true)
    .order("display_order")
    .limit(3);

  const bankInfo = (bankAccountsData && bankAccountsData.length > 0)
    ? `Silakan transfer ke:\n${bankAccountsData.map(b => `🏦 ${b.bank_name}\n💳 No. Rek: ${b.account_number}\n👤 a.n. ${b.account_holder_name}`).join('\n\n')}\n\nSetelah transfer, kirimkan bukti pembayaran kepada kami.`
    : `Silakan hubungi kami untuk informasi pembayaran.`;

  // Build hotel policies section
  let policiesInfo = '';
  if (hotelSettings?.hotel_policies_enabled && hotelSettings?.hotel_policies_text) {
    policiesInfo = `\n\n📋 *PERATURAN MENGINAP DI ${(hotelSettings.hotel_name || 'POMAH GUESTHOUSE').toUpperCase()}:*\n${hotelSettings.hotel_policies_text}`;
  }

  const checkInTime = hotelSettings?.check_in_time || '14:00';
  const checkOutTime = hotelSettings?.check_out_time || '12:00';
  const timeInfo = `\n\n⏰ *Jam Check-in:* ${checkInTime} WIB\n⏰ *Jam Check-out:* ${checkOutTime} WIB`;

  return {
    message: isUpdate
      ? `Booking berhasil diperbarui! Kode: ${booking.booking_code}. Kamar: ${roomsText}. Total baru: Rp ${totalPrice.toLocaleString('id-ID')}.\n\n${bankInfo}${timeInfo}${policiesInfo}`
      : `Booking berhasil dibuat! Kode: ${booking.booking_code}. Kamar: ${roomsText} (${totalRooms} kamar). Total: Rp ${totalPrice.toLocaleString('id-ID')}.\n\n${bankInfo}${timeInfo}${policiesInfo}`,
    booking_code: booking.booking_code,
    booking_id: booking.id,
    rooms_booked: roomsSummary,
    total_rooms: totalRooms,
    total_price: totalPrice,
    status: 'pending',
    is_update: isUpdate
  };
}
