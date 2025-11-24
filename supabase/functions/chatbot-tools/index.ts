import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      case "check_availability": {
        let { check_in, check_out, num_guests } = parameters;
        
        // Validate and fix dates if needed
        check_in = validateAndFixDate(check_in, "check_in");
        check_out = validateAndFixDate(check_out, "check_out");
        
        console.log(`✅ Checking availability: ${check_in} to ${check_out} for ${num_guests || 'any'} guests`);
        
        // Get all rooms
        const { data: rooms, error: roomsError } = await supabase
          .from("rooms")
          .select("*")
          .eq("available", true);

        if (roomsError) throw roomsError;

        // Get bookings that overlap with requested dates
        const { data: bookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("room_id, allocated_room_number")
          .or(`status.eq.confirmed,status.eq.pending`)
          .gte("check_out", check_in)
          .lte("check_in", check_out);

        if (bookingsError) throw bookingsError;

        // Calculate available rooms
        const availableRooms = rooms.map(room => {
          const bookedNumbers = bookings
            .filter(b => b.room_id === room.id)
            .map(b => b.allocated_room_number);
          
          const availableCount = room.room_count - bookedNumbers.length;
          
          return {
            name: room.name,
            available_count: Math.max(0, availableCount),
            price_per_night: room.price_per_night,
            max_guests: room.max_guests,
            description: room.description,
            suitable: num_guests ? num_guests <= room.max_guests : true
          };
        }).filter(r => r.available_count > 0);

        result = {
          check_in,
          check_out,
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
        let { guest_name, guest_email, guest_phone, check_in, check_out, room_name, num_guests, special_requests } = parameters;
        
        // Validate required fields
        if (!guest_phone || !guest_phone.trim()) {
          throw new Error("Nomor telepon wajib diisi untuk membuat booking");
        }
        
        // Validate and fix dates if needed
        check_in = validateAndFixDate(check_in, "check_in");
        check_out = validateAndFixDate(check_out, "check_out");
        
        console.log("Creating booking with params:", { guest_name, guest_email, guest_phone, check_in, check_out, room_name });
        
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
          .select("id, name, price_per_night")
          .eq("available", true);

        if (roomsError) {
          console.error("Rooms fetch error:", roomsError);
          throw new Error(`Error fetching rooms: ${roomsError.message}`);
        }

        // Find best matching room
        const normalizedSearchName = normalizeRoomName(room_name);
        const room = allRooms?.find(r => {
          const normalizedRoomName = normalizeRoomName(r.name);
          return normalizedRoomName.includes(normalizedSearchName) || 
                 normalizedSearchName.includes(normalizedRoomName);
        });

        if (!room) {
          const roomList = allRooms?.map(r => r.name).join(", ") || "none";
          console.error(`Room "${room_name}" not found. Available rooms: ${roomList}`);
          throw new Error(`Kamar "${room_name}" tidak ditemukan. Kamar yang tersedia: ${roomList}`);
        }

        console.log(`Matched "${room_name}" to room "${room.name}"`);

        // Calculate nights and price
        const checkInDate = new Date(check_in);
        const checkOutDate = new Date(check_out);
        const total_nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const total_price = total_nights * room.price_per_night;

        console.log("Calculated:", { total_nights, total_price, room_id: room.id });

        // Check for existing pending booking from chatbot for this guest
        const { data: existingBooking } = await supabase
          .from("bookings")
          .select("id, check_in, check_out, room_id, total_price")
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

        if (existingBooking) {
          // UPDATE existing booking (reschedule)
          console.log(`Found existing booking ${existingBooking.id}, updating...`);
          
          const { data: updatedBooking, error: updateError } = await supabase
            .from("bookings")
            .update({
              check_in,
              check_out,
              room_id: room.id,
              num_guests: num_guests || 1,
              special_requests: special_requests || null,
              total_nights,
              total_price,
              allocated_room_number: null, // Reset room allocation
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
              room_id: room.id,
              num_guests: num_guests || 1,
              special_requests: special_requests || null,
              total_nights,
              total_price,
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

        // Get hotel settings for WhatsApp
        const { data: hotelSettings } = await supabase
          .from("hotel_settings")
          .select("whatsapp_number, hotel_name")
          .single();

        // Send WhatsApp notifications (background task)
        if (hotelSettings?.whatsapp_number) {
          const adminMessage = isUpdate
            ? `🔄 *RESCHEDULE BOOKING (Chatbot AI)*\n\nNama: ${guest_name}\nEmail: ${guest_email}\nTelp: ${guest_phone || '-'}\nKamar: ${room.name}\nCheck-in: ${check_in}\nCheck-out: ${check_out}\nTamu: ${num_guests}\nTotal Malam: ${total_nights}\nTotal: Rp ${total_price.toLocaleString('id-ID')}\n\nBooking ID: ${booking.id}\n\n⚠️ Booking ini telah diperbarui oleh guest melalui chatbot.`
            : `🔔 *BOOKING BARU (Chatbot AI)*\n\nNama: ${guest_name}\nEmail: ${guest_email}\nTelp: ${guest_phone || '-'}\nKamar: ${room.name}\nCheck-in: ${check_in}\nCheck-out: ${check_out}\nTamu: ${num_guests}\nTotal Malam: ${total_nights}\nTotal: Rp ${total_price.toLocaleString('id-ID')}\n\nBooking ID: ${booking.id}`;
          
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
              ? `Booking Anda telah diperbarui! 🔄\n\n📍 ${hotelSettings.hotel_name}\n🛏️ Kamar: ${room.name}\n📅 Check-in: ${check_in}\n📅 Check-out: ${check_out}\n👥 Tamu: ${num_guests}\n💰 Total: Rp ${total_price.toLocaleString('id-ID')}\n\n📝 Booking ID: ${booking.id}\n⏳ Status: Menunggu konfirmasi\n\nKami akan segera menghubungi Anda untuk konfirmasi pembayaran.`
              : `Terima kasih ${guest_name}! 🙏\n\nBooking Anda telah kami terima:\n\n📍 ${hotelSettings.hotel_name}\n🛏️ Kamar: ${room.name}\n📅 Check-in: ${check_in}\n📅 Check-out: ${check_out}\n👥 Tamu: ${num_guests}\n💰 Total: Rp ${total_price.toLocaleString('id-ID')}\n\n📝 Booking ID: ${booking.id}\n⏳ Status: Menunggu konfirmasi\n\nKami akan segera menghubungi Anda untuk konfirmasi pembayaran.`;
            
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
            ? `Booking berhasil diperbarui! Nomor booking: ${booking.id}. Check-in baru: ${check_in}, Check-out baru: ${check_out}. Total baru: Rp ${total_price.toLocaleString('id-ID')}. Kami akan segera menghubungi Anda untuk konfirmasi pembayaran.`
            : `Booking berhasil dibuat! Nomor booking: ${booking.id}. Status: Menunggu konfirmasi. Total: Rp ${total_price.toLocaleString('id-ID')}. Kami akan segera menghubungi Anda untuk konfirmasi pembayaran melalui WhatsApp.`,
          booking_id: booking.id,
          total_price,
          status: 'pending',
          is_update: isUpdate
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
