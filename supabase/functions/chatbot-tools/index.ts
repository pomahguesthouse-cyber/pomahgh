import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool_name, parameters } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    let result;

    switch (tool_name) {
      case "check_availability": {
        const { check_in, check_out, num_guests } = parameters;
        
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
        
        const { data, error } = await supabase
          .from("rooms")
          .select("*")
          .ilike("name", `%${room_name}%`)
          .single();

        if (error) throw error;
        
        result = data;
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
        const { guest_name, guest_email, guest_phone, check_in, check_out, room_id, num_guests, special_requests } = parameters;
        
        console.log("Creating booking with params:", { guest_name, guest_email, check_in, check_out, room_id });
        
        // Get room details to calculate price
        const { data: room, error: roomError } = await supabase
          .from("rooms")
          .select("price_per_night")
          .eq("id", room_id)
          .single();

        if (roomError) {
          console.error("Room fetch error:", roomError);
          throw new Error(`Room not found: ${roomError.message}`);
        }

        // Calculate nights and price
        const checkInDate = new Date(check_in);
        const checkOutDate = new Date(check_out);
        const total_nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const total_price = total_nights * room.price_per_night;

        console.log("Calculated:", { total_nights, total_price });

        // Insert booking
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            guest_name,
            guest_email,
            guest_phone: guest_phone || null,
            check_in,
            check_out,
            room_id,
            num_guests: num_guests || 1,
            special_requests: special_requests || null,
            total_nights,
            total_price,
            status: 'pending',
            payment_status: 'unpaid'
          })
          .select()
          .single();

        if (bookingError) {
          console.error("Booking insert error:", bookingError);
          throw new Error(`Failed to create booking: ${bookingError.message}`);
        }

        console.log("Booking created successfully:", booking.id);

        result = {
          message: `Booking berhasil dibuat! Nomor booking: ${booking.id}. Status: Menunggu konfirmasi. Total: Rp ${total_price.toLocaleString('id-ID')}. Kami akan segera menghubungi Anda untuk konfirmasi pembayaran.`,
          booking_id: booking.id,
          total_price,
          status: 'pending'
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
