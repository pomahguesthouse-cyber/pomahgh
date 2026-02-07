import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { checkIn, checkOut } = await req.json()
    
    console.log(`Checking availability for ${checkIn} to ${checkOut}`)

    if (!checkIn || !checkOut) {
      return new Response(
        JSON.stringify({ error: 'checkIn and checkOut are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Query all available rooms with room_numbers
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id, allotment, room_numbers")
      .eq("available", true)

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError)
      throw roomsError
    }

    console.log(`Found ${rooms?.length || 0} available room types`)

    // Query blocked dates (bypasses RLS with service role)
    const { data: unavailableDates, error: unavailableError } = await supabase
      .from("room_unavailable_dates")
      .select("room_id, room_number, unavailable_date")
      .gte("unavailable_date", checkIn)
      .lt("unavailable_date", checkOut)

    if (unavailableError) {
      console.error('Error fetching unavailable dates:', unavailableError)
      throw unavailableError
    }

    console.log(`Found ${unavailableDates?.length || 0} blocked date entries`)

    // Query direct bookings (bypasses RLS with service role)
    const { data: directBookings, error: directBookingsError } = await supabase
      .from("bookings")
      .select("room_id, allocated_room_number, check_in, check_out, status")
      .not("status", "in", '("cancelled","rejected")')
      .lt("check_in", checkOut)
      .gt("check_out", checkIn)

    if (directBookingsError) {
      console.error('Error fetching direct bookings:', directBookingsError)
      throw directBookingsError
    }

    console.log(`Found ${directBookings?.length || 0} direct bookings`)

    // Query booking_rooms for multi-room bookings (bypasses RLS with service role)
    const { data: bookedRooms, error: bookedRoomsError } = await supabase
      .from("booking_rooms")
      .select(`
        room_id,
        room_number,
        booking:bookings!inner(
          check_in,
          check_out,
          status
        )
      `)

    if (bookedRoomsError) {
      console.error('Error fetching booking_rooms:', bookedRoomsError)
      throw bookedRoomsError
    }

    console.log(`Found ${bookedRooms?.length || 0} booking_rooms entries`)

    // Calculate availability per room type
    const availability: Record<string, number> = {}

    rooms?.forEach((room) => {
      const roomNumbers = (room.room_numbers as string[]) || []
      const totalUnits = roomNumbers.length || room.allotment

      // Set to track unavailable room_numbers for this room type
      const unavailableRoomNumbers = new Set<string>()

      // 1. Check blocked dates per room_number
      unavailableDates?.forEach((ud) => {
        if (ud.room_id === room.id) {
          if (!ud.room_number) {
            // NULL room_number = block ALL units of this room type
            roomNumbers.forEach(rn => unavailableRoomNumbers.add(rn))
          } else {
            // Specific room_number blocked
            unavailableRoomNumbers.add(ud.room_number)
          }
        }
      })

      // 2. Check bookings from booking_rooms table (multi-room bookings)
      bookedRooms?.forEach((br) => {
        if (br.room_id === room.id && br.room_number) {
          const booking = br.booking as { status: string; check_in: string; check_out: string } | null
          // Check if booking is active and overlaps with date range
          if (
            booking &&
            booking.status !== "cancelled" &&
            booking.status !== "rejected" &&
            booking.check_in < checkOut &&
            booking.check_out > checkIn
          ) {
            unavailableRoomNumbers.add(br.room_number)
          }
        }
      })

      // 3. Check direct bookings (backward compatibility)
      directBookings?.forEach((booking) => {
        if (booking.room_id === room.id && booking.allocated_room_number) {
          unavailableRoomNumbers.add(booking.allocated_room_number)
        }
      })

      // Calculate available count
      const availableCount = Math.max(0, totalUnits - unavailableRoomNumbers.size)
      availability[room.id] = availableCount

      console.log(`Room ${room.id}: ${availableCount}/${totalUnits} available (${unavailableRoomNumbers.size} unavailable: ${Array.from(unavailableRoomNumbers).join(', ')})`)
    })

    return new Response(
      JSON.stringify(availability),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-room-availability:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
