import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Indonesian month names
const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Helper function to format date in Indonesian (e.g., "15 Januari 2025")
function formatDateIndonesian(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = INDONESIAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// Helper function to format date with day name (e.g., "Rabu, 15 Januari 2025")
function formatDateWithDay(dateStr: string): string {
  const date = new Date(dateStr);
  const dayName = INDONESIAN_DAYS[date.getDay()];
  const day = date.getDate();
  const month = INDONESIAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
}

// Helper function to sanitize booking ID input
function sanitizeBookingId(bookingId: string): string {
  return bookingId
    .trim()
    .replace(/,/g, '')      // Remove commas
    .replace(/\s+/g, '')    // Remove all whitespace
    .replace(/[^\w-]/g, ''); // Keep only alphanumeric, underscore, dash
}

// Helper function to validate booking code format
function validateBookingCodeFormat(code: string): boolean {
  // Format valid: PMH-XXXXXX (6 karakter alfanumerik)
  return /^PMH-[A-Z0-9]{6}$/i.test(code);
}

// Helper function to validate and fix dates
function validateAndFixDate(dateStr: string, fieldName: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  
  // If year is before 2025, correct it to 2025
  if (year < 2025) {
    console.warn(`⚠️ ${fieldName} has year ${year}, correcting to 2025`);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `2025-${month}-${day}`;
  }
  
  return dateStr;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool_name, parameters } = await req.json();
    
    // Use service role for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let result;

    switch (tool_name) {
      case "get_all_rooms": {
        // Get all available room types with prices (no date needed)
        const { data: rooms, error: roomsError } = await supabase
          .from("rooms")
          .select("name, description, price_per_night, max_guests, size_sqm, features, allotment")
          .eq("available", true)
          .order("price_per_night");

        if (roomsError) throw roomsError;

        const roomList = (rooms || []).map(room => ({
          name: room.name,
          price_per_night: room.price_per_night,
          price_formatted: `Rp ${room.price_per_night.toLocaleString('id-ID')}`,
          max_guests: room.max_guests,
          size_sqm: room.size_sqm,
          total_units: room.allotment,
          description: room.description,
          features: room.features || []
        }));

        result = {
          message: "Daftar tipe kamar yang tersedia:",
          rooms: roomList,
          note: "Untuk cek ketersediaan tanggal tertentu, silakan sebutkan tanggal check-in dan check-out yang diinginkan."
        };
        break;
      }

      case "check_availability": {
        let { check_in, check_out, num_guests } = parameters;
        
        // Validate and fix dates if needed
        check_in = validateAndFixDate(check_in, "check_in");
        check_out = validateAndFixDate(check_out, "check_out");
        
        console.log(`✅ Checking availability: ${check_in} to ${check_out} for ${num_guests || 'any'} guests`);
        
        // Get all rooms with room_numbers
        const { data: rooms, error: roomsError } = await supabase
          .from("rooms")
          .select("id, name, allotment, room_numbers, price_per_night, max_guests, description")
          .eq("available", true);

        if (roomsError) throw roomsError;

        // Get blocked dates from room_unavailable_dates
        const { data: unavailableDates } = await supabase
          .from("room_unavailable_dates")
          .select("room_id, room_number, unavailable_date")
          .gte("unavailable_date", check_in)
          .lt("unavailable_date", check_out);

        // Get booking_rooms entries for multi-room bookings
        const { data: bookingRoomsData } = await supabase
          .from("booking_rooms")
          .select("room_id, room_number, booking:bookings!inner(check_in, check_out, status)")
          .not("booking.status", "in", '("cancelled","rejected")');

        // Get direct bookings
        const { data: directBookings } = await supabase
          .from("bookings")
          .select("room_id, allocated_room_number, check_in, check_out")
          .not("status", "in", '("cancelled","rejected")')
          .lt("check_in", check_out)
          .gt("check_out", check_in);

        // Calculate available rooms using Set to track unavailable room numbers
        const availableRooms = (rooms || []).map(room => {
          const roomNumbers: string[] = room.room_numbers || [];
          const totalUnits = roomNumbers.length || room.allotment || 0;
          const unavailableRoomNumbers = new Set<string>();

          // Check blocked dates per room_number
          (unavailableDates || []).forEach(ud => {
            if (ud.room_id === room.id) {
              if (!ud.room_number) {
                // If no specific room_number, block all rooms of this type
                roomNumbers.forEach(rn => unavailableRoomNumbers.add(rn));
              } else {
                unavailableRoomNumbers.add(ud.room_number);
              }
            }
          });

          // Check booking_rooms (multi-room bookings)
          (bookingRoomsData || []).forEach((br: any) => {
            if (br.room_id === room.id && br.room_number) {
              const booking = br.booking;
              if (booking && 
                  booking.check_in < check_out && 
                  booking.check_out > check_in) {
                unavailableRoomNumbers.add(br.room_number);
              }
            }
          });

          // Check direct bookings
          (directBookings || []).forEach(b => {
            if (b.room_id === room.id && b.allocated_room_number) {
              unavailableRoomNumbers.add(b.allocated_room_number);
            }
          });

          const availableCount = Math.max(0, totalUnits - unavailableRoomNumbers.size);
          
          return {
            name: room.name,
            available_count: availableCount,
            price_per_night: room.price_per_night,
            max_guests: room.max_guests,
            description: room.description,
            suitable: num_guests ? num_guests <= room.max_guests : true
          };
        }).filter(r => r.available_count > 0);

        result = {
          check_in: formatDateIndonesian(check_in),
          check_out: formatDateIndonesian(check_out),
          check_in_raw: check_in,
          check_out_raw: check_out,
          available_rooms: availableRooms
        };
        break;
      }

      case "get_room_details": {
        const { room_name } = parameters;
        
        // Normalize room name by removing common words
        const normalizeRoomName = (name: string) => {
          return name
            .toLowerCase()
            .replace(/\b(room|kamar|suite)\b/gi, '')
            .trim();
        };

        // Get all available rooms
        const { data: allRooms, error: roomsError } = await supabase
          .from("rooms")
          .select("*")
          .eq("available", true);

        if (roomsError) throw roomsError;

        // Find best matching room
        const normalizedSearchName = normalizeRoomName(room_name);
        const room = allRooms?.find(r => {
          const normalizedRoomName = normalizeRoomName(r.name);
          return normalizedRoomName.includes(normalizedSearchName) || 
                 normalizedSearchName.includes(normalizedRoomName);
        });

        if (!room) {
          const roomList = allRooms?.map(r => r.name).join(", ") || "none";
          throw new Error(`Kamar "${room_name}" tidak ditemukan. Kamar yang tersedia: ${roomList}`);
        }
        
        result = room;
        break;
      }

      case "get_facilities": {
        const { data, error } = await supabase
          .from("facilities")
          .select("title, description, icon_name")
          .eq("is_active", true)
          .order("display_order");

        if (error) throw error;
        
        result = { facilities: data };
        break;
      }

      case "create_booking_draft": {
        let { guest_name, guest_email, guest_phone, check_in, check_out, room_name, room_selections, num_guests, special_requests } = parameters;
        
        // Validate required fields
        if (!guest_phone || !guest_phone.trim()) {
          throw new Error("Nomor telepon wajib diisi untuk membuat booking");
        }
        
        // Validate and fix dates if needed
        check_in = validateAndFixDate(check_in, "check_in");
        check_out = validateAndFixDate(check_out, "check_out");
        
        console.log("Creating booking with params:", { guest_name, guest_email, guest_phone, check_in, check_out, room_name, room_selections });
        
        // Calculate nights
        const checkInDate = new Date(check_in);
        const checkOutDate = new Date(check_out);
        const total_nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

        // Normalize room selections - support both single and multiple
        let roomsToBook: Array<{ room_name: string; quantity: number }> = [];
        
        if (room_selections && room_selections.length > 0) {
          // Multiple room mode
          roomsToBook = room_selections.map((r: any) => ({
            room_name: r.room_name,
            quantity: r.quantity || 1
          }));
          console.log("Multiple room mode:", roomsToBook);
        } else if (room_name) {
          // Single room mode (backward compatible)
          roomsToBook = [{ room_name, quantity: 1 }];
          console.log("Single room mode:", roomsToBook);
        } else {
          throw new Error("Mohon pilih minimal satu kamar untuk booking");
        }
        
        // Normalize room name by removing common words
        const normalizeRoomName = (name: string) => {
          return name
            .toLowerCase()
            .replace(/\b(room|kamar|suite)\b/gi, '')
            .trim();
        };

        // Get all available rooms
        const { data: allRooms, error: roomsError } = await supabase
          .from("rooms")
          .select("id, name, price_per_night, allotment, room_numbers")
          .eq("available", true);

        if (roomsError) {
          console.error("Rooms fetch error:", roomsError);
          throw new Error(`Error fetching rooms: ${roomsError.message}`);
        }

        // Match and validate each room selection
        const matchedRooms: Array<{
          roomId: string;
          roomName: string;
          pricePerNight: number;
          quantity: number;
          availableNumbers: string[];
        }> = [];

        let totalPrice = 0;
        const roomsSummary: string[] = [];

        for (const selection of roomsToBook) {
          // Find matching room
          const normalizedSearch = normalizeRoomName(selection.room_name);
          const room = allRooms?.find(r => {
            const normalized = normalizeRoomName(r.name);
            return normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized);
          });

          if (!room) {
            const roomList = allRooms?.map(r => r.name).join(", ") || "none";
            throw new Error(`Kamar "${selection.room_name}" tidak ditemukan. Kamar yang tersedia: ${roomList}`);
          }

          console.log(`Matched "${selection.room_name}" to room "${room.name}"`);

          // Check availability for this room type - include blocked dates and booking_rooms
          const roomNumbers: string[] = room.room_numbers || [];
          const unavailableNumbers = new Set<string>();

          // Get blocked dates for this room
          const { data: blockedDates } = await supabase
            .from("room_unavailable_dates")
            .select("room_number, unavailable_date")
            .eq("room_id", room.id)
            .gte("unavailable_date", check_in)
            .lt("unavailable_date", check_out);

          (blockedDates || []).forEach(bd => {
            if (!bd.room_number) {
              roomNumbers.forEach(rn => unavailableNumbers.add(rn));
            } else {
              unavailableNumbers.add(bd.room_number);
            }
          });

          // Get booking_rooms entries
          const { data: bookingRoomsEntries } = await supabase
            .from("booking_rooms")
            .select("room_number, booking:bookings!inner(check_in, check_out, status)")
            .eq("room_id", room.id)
            .not("booking.status", "in", '("cancelled","rejected")');

          (bookingRoomsEntries || []).forEach((br: any) => {
            if (br.room_number && br.booking) {
              if (br.booking.check_in < check_out && br.booking.check_out > check_in) {
                unavailableNumbers.add(br.room_number);
              }
            }
          });

          // Get direct bookings
          const { data: directBookings } = await supabase
            .from("bookings")
            .select("allocated_room_number")
            .eq("room_id", room.id)
            .not("status", "in", '("cancelled","rejected")')
            .lt("check_in", check_out)
            .gt("check_out", check_in);

          (directBookings || []).forEach(b => {
            if (b.allocated_room_number) {
              unavailableNumbers.add(b.allocated_room_number);
            }
          });

          const availableNumbers = roomNumbers.filter(n => !unavailableNumbers.has(n));

          if (availableNumbers.length < selection.quantity) {
            throw new Error(`Kamar ${room.name} hanya tersisa ${availableNumbers.length}, tidak cukup untuk ${selection.quantity} kamar yang diminta`);
          }

          const roomPrice = room.price_per_night * selection.quantity * total_nights;
          totalPrice += roomPrice;

          matchedRooms.push({
            roomId: room.id,
            roomName: room.name,
            pricePerNight: room.price_per_night,
            quantity: selection.quantity,
            availableNumbers: availableNumbers.slice(0, selection.quantity)
          });

          roomsSummary.push(`${selection.quantity}x ${room.name}`);
        }

        console.log("Matched rooms:", matchedRooms);
        console.log("Total price:", totalPrice);

        // Check for existing pending booking from chatbot for this guest
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

        let booking;
        let isUpdate = false;

        // Use first room for primary booking (backward compatibility)
        const primaryRoom = matchedRooms[0];

        if (existingBooking) {
          // UPDATE existing booking (reschedule)
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
          console.log("Booking updated successfully:", booking.id);

          // Delete old booking_rooms entries
          await supabase
            .from("booking_rooms")
            .delete()
            .eq("booking_id", booking.id);
        } else {
          // CREATE new booking
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
          console.log("Booking created successfully:", booking.id);
        }

        // Insert all rooms into booking_rooms table
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
          } else {
            console.log(`Inserted ${bookingRoomsData.length} room entries into booking_rooms`);
          }
        }

        // Get hotel settings for WhatsApp
        const { data: hotelSettings } = await supabase
          .from("hotel_settings")
          .select("whatsapp_number, hotel_name")
          .single();

        // Prepare room summary text
        const roomsText = roomsSummary.join(", ");
        const totalRooms = bookingRoomsData.length;

        // Send WhatsApp notifications (background task)
        if (hotelSettings?.whatsapp_number) {
          const checkInFormatted = formatDateWithDay(check_in);
          const checkOutFormatted = formatDateWithDay(check_out);
          
          const adminMessage = isUpdate
            ? `🔄 *RESCHEDULE BOOKING (Chatbot AI)*\n\nNama: ${guest_name}\nEmail: ${guest_email}\nTelp: ${guest_phone || '-'}\n🛏️ Kamar: ${roomsText} (${totalRooms} unit)\nCheck-in: ${checkInFormatted}\nCheck-out: ${checkOutFormatted}\nTamu: ${num_guests}\nTotal Malam: ${total_nights}\n💰 Total: Rp ${totalPrice.toLocaleString('id-ID')}\n\nKode Booking: ${booking.booking_code}\n\n⚠️ Booking ini telah diperbarui oleh guest melalui chatbot.`
            : `🔔 *BOOKING BARU (Chatbot AI)*\n\nNama: ${guest_name}\nEmail: ${guest_email}\nTelp: ${guest_phone || '-'}\n🛏️ Kamar: ${roomsText} (${totalRooms} unit)\nCheck-in: ${checkInFormatted}\nCheck-out: ${checkOutFormatted}\nTamu: ${num_guests}\nTotal Malam: ${total_nights}\n💰 Total: Rp ${totalPrice.toLocaleString('id-ID')}\n\nKode Booking: ${booking.booking_code}`;
          
          // Send to admin
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              phone: hotelSettings.whatsapp_number,
              message: adminMessage,
              type: "admin"
            })
          }).catch(err => console.error("Failed to send admin WhatsApp:", err));

          // Send to customer if phone provided
          if (guest_phone) {
            const customerMessage = isUpdate
              ? `Booking Anda telah diperbarui! 🔄\n\n📍 ${hotelSettings.hotel_name}\n🛏️ Kamar: ${roomsText} (${totalRooms} kamar)\n📅 Check-in: ${checkInFormatted}\n📅 Check-out: ${checkOutFormatted}\n👥 Tamu: ${num_guests}\n💰 Total: Rp ${totalPrice.toLocaleString('id-ID')}\n\n📝 Kode Booking: ${booking.booking_code}\n⏳ Status: Menunggu konfirmasi\n\nKami akan segera menghubungi Anda untuk konfirmasi pembayaran.`
              : `Terima kasih ${guest_name}! 🙏\n\nBooking Anda telah kami terima:\n\n📍 ${hotelSettings.hotel_name}\n🛏️ Kamar: ${roomsText} (${totalRooms} kamar)\n📅 Check-in: ${checkInFormatted}\n📅 Check-out: ${checkOutFormatted}\n👥 Tamu: ${num_guests}\n💰 Total: Rp ${totalPrice.toLocaleString('id-ID')}\n\n📝 Kode Booking: ${booking.booking_code}\n⏳ Status: Menunggu konfirmasi\n\nKami akan segera menghubungi Anda untuk konfirmasi pembayaran.`;
            
            fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                phone: guest_phone,
                message: customerMessage,
                type: "customer"
              })
            }).catch(err => console.error("Failed to send customer WhatsApp:", err));
          }
        }

        result = {
          message: isUpdate
            ? `Booking berhasil diperbarui! Kode: ${booking.booking_code}. Kamar: ${roomsText}. Total baru: Rp ${totalPrice.toLocaleString('id-ID')}. Kami akan segera menghubungi Anda untuk konfirmasi pembayaran.`
            : `Booking berhasil dibuat! Kode: ${booking.booking_code}. Kamar: ${roomsText} (${totalRooms} kamar). Total: Rp ${totalPrice.toLocaleString('id-ID')}. Kami akan segera menghubungi Anda untuk konfirmasi pembayaran.`,
          booking_code: booking.booking_code,
          rooms_booked: roomsSummary,
          total_rooms: totalRooms,
          total_price: totalPrice,
          status: 'pending',
          is_update: isUpdate
        };
        break;
      }

      case "get_booking_details": {
        const { booking_id, guest_phone, guest_email } = parameters;
        
        if (!booking_id || !guest_phone || !guest_email) {
          throw new Error("Kode booking, nomor telepon, dan email wajib diisi untuk keamanan");
        }

        // Sanitize booking ID to remove commas and special characters
        const sanitizedBookingId = sanitizeBookingId(booking_id);
        
        if (!sanitizedBookingId) {
          throw new Error("Kode booking tidak valid. Mohon berikan kode booking yang benar.");
        }

        // Validate booking code format
        if (!validateBookingCodeFormat(sanitizedBookingId)) {
          throw new Error(`Format kode booking tidak valid. Kode booking seharusnya format PMH-XXXXXX (contoh: PMH-Y739M3). Yang Anda berikan: "${booking_id}"`);
        }

        console.log(`Original booking_id: "${booking_id}" -> Sanitized: "${sanitizedBookingId}"`);

        // Query booking by booking_code dengan verifikasi email
        const { data: booking, error } = await supabase
          .from("bookings")
          .select(`
            id, booking_code, guest_name, guest_email, guest_phone,
            check_in, check_out, check_in_time, check_out_time,
            num_guests, total_nights, total_price, status, payment_status,
            special_requests, allocated_room_number, created_at,
            rooms:room_id (name, price_per_night, max_guests)
          `)
          .eq("booking_code", sanitizedBookingId.toUpperCase())
          .ilike("guest_email", guest_email)
          .single();

        if (error || !booking) {
          throw new Error(`Booking dengan kode ${sanitizedBookingId.toUpperCase()} tidak ditemukan. Pastikan kode booking benar (format: PMH-XXXXXX) dan email sesuai dengan data booking.`);
        }

        // Verify phone number (normalize both for comparison)
        const normalizedPhone = guest_phone.replace(/\D/g, '');
        const bookingPhone = booking.guest_phone?.replace(/\D/g, '') || '';
        if (!bookingPhone.includes(normalizedPhone) && !normalizedPhone.includes(bookingPhone)) {
          throw new Error("Nomor telepon tidak cocok dengan data booking.");
        }

        result = {
          booking_code: booking.booking_code,
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          guest_phone: booking.guest_phone,
          room_name: (booking.rooms as any)?.name,
          check_in: formatDateIndonesian(booking.check_in),
          check_out: formatDateIndonesian(booking.check_out),
          check_in_time: booking.check_in_time,
          check_out_time: booking.check_out_time,
          num_guests: booking.num_guests,
          total_nights: booking.total_nights,
          total_price: booking.total_price,
          status: booking.status,
          payment_status: booking.payment_status,
          special_requests: booking.special_requests,
          allocated_room_number: booking.allocated_room_number,
          can_modify: booking.status !== 'cancelled'
        };
        break;
      }

      case "update_booking": {
        let { booking_id, guest_phone, guest_email, new_check_in, new_check_out, new_num_guests, new_special_requests } = parameters;

        // Sanitize booking ID
        const sanitizedBookingId = sanitizeBookingId(booking_id);
        
        if (!sanitizedBookingId) {
          throw new Error("Kode booking tidak valid. Mohon berikan kode booking yang benar.");
        }

        // Validate booking code format
        if (!validateBookingCodeFormat(sanitizedBookingId)) {
          throw new Error(`Format kode booking tidak valid. Kode booking seharusnya format PMH-XXXXXX (contoh: PMH-Y739M3). Yang Anda berikan: "${booking_id}"`);
        }

        console.log(`Original booking_id: "${booking_id}" -> Sanitized: "${sanitizedBookingId}"`);

        // 1. Verify booking by booking_code dengan 3 faktor
        const { data: existingBooking, error: findError } = await supabase
          .from("bookings")
          .select("id, booking_code, guest_name, guest_email, guest_phone, room_id, check_in, check_out, num_guests, status, total_price")
          .eq("booking_code", sanitizedBookingId.toUpperCase())
          .ilike("guest_email", guest_email)
          .single();

        if (findError || !existingBooking) {
          throw new Error(`Booking dengan kode ${sanitizedBookingId.toUpperCase()} tidak ditemukan. Pastikan kode booking benar (format: PMH-XXXXXX) dan email sesuai dengan data booking.`);
        }

        // Verify phone number
        const normalizedPhone = guest_phone.replace(/\D/g, '');
        const bookingPhone = existingBooking.guest_phone?.replace(/\D/g, '') || '';
        if (!bookingPhone.includes(normalizedPhone) && !normalizedPhone.includes(bookingPhone)) {
          throw new Error("Nomor telepon tidak cocok dengan data booking.");
        }

        // 2. Check if booking can be modified (NOT cancelled)
        if (existingBooking.status === 'cancelled') {
          throw new Error("Booking yang sudah dibatalkan tidak dapat diubah. Silakan buat booking baru.");
        }

        // 3. Prepare update data
        const updateData: any = { updated_at: new Date().toISOString() };

        // 4. Jika ada perubahan tanggal, CEK KETERSEDIAAN KAMAR
        if (new_check_in || new_check_out) {
          new_check_in = new_check_in ? validateAndFixDate(new_check_in, "new_check_in") : existingBooking.check_in;
          new_check_out = new_check_out ? validateAndFixDate(new_check_out, "new_check_out") : existingBooking.check_out;

          // Get room info
          const { data: room } = await supabase
            .from("rooms")
            .select("id, name, allotment, price_per_night")
            .eq("id", existingBooking.room_id)
            .single();

          if (!room) throw new Error("Data kamar tidak ditemukan");

          // Check unavailable dates
          const { data: unavailableDates } = await supabase
            .from("room_unavailable_dates")
            .select("unavailable_date")
            .eq("room_id", room.id)
            .gte("unavailable_date", new_check_in)
            .lt("unavailable_date", new_check_out);

          if (unavailableDates && unavailableDates.length > 0) {
            throw new Error(`Kamar ${room.name} tidak tersedia di tanggal yang dipilih. Silakan pilih tanggal lain.`);
          }

          // Check overlapping bookings (exclude current booking)
          const { data: overlappingBookings } = await supabase
            .from("bookings")
            .select("id")
            .eq("room_id", room.id)
            .neq("id", existingBooking.id)
            .neq("status", "cancelled")
            .lt("check_in", new_check_out)
            .gt("check_out", new_check_in);

          const bookedCount = overlappingBookings?.length || 0;
          const availableCount = room.allotment - bookedCount;

          if (availableCount <= 0) {
            throw new Error(`Maaf, kamar ${room.name} sudah penuh di tanggal tersebut. Silakan pilih tanggal lain.`);
          }

          // Calculate new price
          const total_nights = Math.ceil(
            (new Date(new_check_out).getTime() - new Date(new_check_in).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          updateData.check_in = new_check_in;
          updateData.check_out = new_check_out;
          updateData.total_nights = total_nights;
          updateData.total_price = total_nights * room.price_per_night;
          updateData.allocated_room_number = null; // Reset allocation
        }

        // 5. Update other fields
        if (new_num_guests) updateData.num_guests = new_num_guests;
        if (new_special_requests !== undefined) updateData.special_requests = new_special_requests;

        // 6. Save to database
        const { data: updatedBooking, error: updateError } = await supabase
          .from("bookings")
          .update(updateData)
          .eq("id", existingBooking.id)
          .select(`
            id, booking_code, guest_name, guest_email, guest_phone,
            check_in, check_out, num_guests, total_nights, total_price,
            special_requests, status, payment_status,
            rooms:room_id (name)
          `)
          .single();

        if (updateError) throw new Error(`Gagal mengubah booking: ${updateError.message}`);

        // 7. Send WhatsApp notification
        const { data: hotelSettings } = await supabase
          .from("hotel_settings")
          .select("whatsapp_number, hotel_name")
          .single();

        if (hotelSettings?.whatsapp_number) {
          const checkInFormatted = formatDateWithDay(updatedBooking.check_in);
          const checkOutFormatted = formatDateWithDay(updatedBooking.check_out);
          
          const adminMessage = `🔄 *PERUBAHAN BOOKING*\n\nNama: ${updatedBooking.guest_name}\nEmail: ${updatedBooking.guest_email}\nTelp: ${updatedBooking.guest_phone || '-'}\nKamar: ${(updatedBooking.rooms as any)?.name}\nCheck-in: ${checkInFormatted}\nCheck-out: ${checkOutFormatted}\nTamu: ${updatedBooking.num_guests}\nTotal: Rp ${updatedBooking.total_price.toLocaleString('id-ID')}\n\nKode Booking: ${updatedBooking.booking_code}\nStatus: ${updatedBooking.status}`;
          
          // Send to admin
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              phone: hotelSettings.whatsapp_number,
              message: adminMessage,
              type: "admin"
            })
          }).catch(err => console.error("Failed to send admin WhatsApp:", err));

          // Send to customer
          if (updatedBooking.guest_phone) {
            const customerMessage = `Booking Anda telah diperbarui! 🔄\n\n📍 ${hotelSettings.hotel_name}\n🛏️ Kamar: ${(updatedBooking.rooms as any)?.name}\n📅 Check-in: ${checkInFormatted}\n📅 Check-out: ${checkOutFormatted}\n👥 Tamu: ${updatedBooking.num_guests}\n💰 Total: Rp ${updatedBooking.total_price.toLocaleString('id-ID')}\n\n📝 Kode Booking: ${updatedBooking.booking_code}\n📊 Status: ${updatedBooking.status}`;
            
            fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                phone: updatedBooking.guest_phone,
                message: customerMessage,
                type: "customer"
              })
            }).catch(err => console.error("Failed to send customer WhatsApp:", err));
          }
        }

        result = {
          message: "Booking berhasil diubah!",
          booking_code: updatedBooking.booking_code,
          room_name: (updatedBooking.rooms as any)?.name,
          check_in: formatDateIndonesian(updatedBooking.check_in),
          check_out: formatDateIndonesian(updatedBooking.check_out),
          num_guests: updatedBooking.num_guests,
          total_nights: updatedBooking.total_nights,
          total_price: updatedBooking.total_price,
          special_requests: updatedBooking.special_requests,
          status: updatedBooking.status
        };
        break;
      }

    case "check_payment_status": {
      const { booking_id, guest_phone, guest_email } = parameters;
      
      if (!booking_id || !guest_phone || !guest_email) {
        throw new Error("Kode booking, nomor telepon, dan email wajib diisi untuk verifikasi");
      }

      // Sanitize booking ID
      const sanitizedBookingId = sanitizeBookingId(booking_id);
      
      if (!sanitizedBookingId) {
        throw new Error("Kode booking tidak valid. Mohon berikan kode booking yang benar.");
      }

      // Validate booking code format
      if (!validateBookingCodeFormat(sanitizedBookingId)) {
        throw new Error(`Format kode booking tidak valid. Kode booking seharusnya format PMH-XXXXXX (contoh: PMH-Y739M3). Yang Anda berikan: "${booking_id}"`);
      }

      console.log(`Original booking_id: "${booking_id}" -> Sanitized: "${sanitizedBookingId}"`);

      // Query booking by booking_code dengan verifikasi email
      const { data: booking, error } = await supabase
          .from("bookings")
        .select(`
          id, booking_code, guest_name, guest_email, guest_phone,
          check_in, check_out, total_price, payment_status, payment_amount,
          status, rooms:room_id (name)
        `)
        .eq("booking_code", sanitizedBookingId.toUpperCase())
          .ilike("guest_email", guest_email)
          .single();

        if (error || !booking) {
          throw new Error(`Booking dengan kode ${sanitizedBookingId.toUpperCase()} tidak ditemukan. Pastikan kode booking benar (format: PMH-XXXXXX) dan email sesuai dengan data booking.`);
        }

        // Verify phone number
        const normalizedPhone = guest_phone.replace(/\D/g, '');
        const bookingPhone = booking.guest_phone?.replace(/\D/g, '') || '';
        if (!bookingPhone.includes(normalizedPhone) && !normalizedPhone.includes(bookingPhone)) {
          throw new Error("Nomor telepon tidak cocok dengan data booking.");
        }

        // Calculate remaining amount
        const totalPrice = Number(booking.total_price) || 0;
        const paymentAmount = Number(booking.payment_amount) || 0;
        const remainingAmount = totalPrice - paymentAmount;

        // Determine status message
        let statusMessage = '';
        let isPaid = false;
        
        switch (booking.payment_status) {
          case 'paid':
            statusMessage = '✅ LUNAS - Pembayaran sudah diterima seluruhnya';
            isPaid = true;
            break;
          case 'partial':
            statusMessage = '⏳ BAYAR SEBAGIAN - Masih ada sisa yang harus dibayar';
            break;
          case 'unpaid':
          default:
            statusMessage = '❌ BELUM BAYAR - Belum ada pembayaran yang diterima';
            break;
        }

        // Get bank accounts if payment is not complete
        let bankAccounts: Array<{ bank_name: string; account_number: string; account_holder_name: string }> = [];
        if (!isPaid) {
          const { data: banks } = await supabase
            .from("bank_accounts")
            .select("bank_name, account_number, account_holder_name")
            .eq("is_active", true)
            .order("display_order");
          
          bankAccounts = banks || [];
        }

        result = {
          booking_code: booking.booking_code,
          guest_name: booking.guest_name,
          room_name: (booking.rooms as any)?.name,
          check_in: formatDateIndonesian(booking.check_in),
          check_out: formatDateIndonesian(booking.check_out),
          booking_status: booking.status,
          payment_status: booking.payment_status,
          payment_status_message: statusMessage,
          total_price: totalPrice,
          payment_amount: paymentAmount,
          remaining_amount: remainingAmount,
          is_fully_paid: isPaid,
          bank_accounts: bankAccounts,
          note: isPaid 
            ? "Terima kasih! Pembayaran Anda sudah kami terima." 
            : `Silakan transfer sisa pembayaran Rp ${remainingAmount.toLocaleString('id-ID')} ke salah satu rekening bank kami.`
        };
        break;
      }

      default:
        throw new Error(`Unknown tool: ${tool_name}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Tool execution error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
