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
        result = {
          message: "Terima kasih! Data booking Anda sudah saya catat. Untuk menyelesaikan booking, silakan klik tombol 'Buat Booking' di bawah ini atau hubungi kami langsung.",
          booking_data: parameters
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
