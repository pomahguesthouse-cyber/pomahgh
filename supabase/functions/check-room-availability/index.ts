import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { checkIn, checkOut } = await req.json()
    
    if (!checkIn || !checkOut) {
      return new Response(
        JSON.stringify({ error: 'checkIn and checkOut are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id, allotment, room_numbers")
      .eq("available", true)

    if (roomsError) throw roomsError

    const { data: unavailableDates, error: unavailableError } = await supabase
      .from("room_unavailable_dates")
      .select("room_id, room_number, unavailable_date")
      .gte("unavailable_date", checkIn)
      .lt("unavailable_date", checkOut)

    if (unavailableError) throw unavailableError

    const { data: directBookings, error: directBookingsError } = await supabase
      .from("bookings")
      .select("room_id, allocated_room_number, check_in, check_out, status")
      .not("status", "in", '("cancelled","rejected")')
      .lt("check_in", checkOut)
      .gt("check_out", checkIn)

    if (directBookingsError) throw directBookingsError

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

    if (bookedRoomsError) throw bookedRoomsError

    const availability: Record<string, number> = {}

    rooms?.forEach((room) => {
      const roomNumbers = (room.room_numbers as string[]) || []
      const totalUnits = roomNumbers.length || room.allotment

      const unavailableRoomNumbers = new Set<string>()

      unavailableDates?.forEach((ud) => {
        if (ud.room_id === room.id) {
          if (!ud.room_number) {
            roomNumbers.forEach(rn => unavailableRoomNumbers.add(rn))
          } else {
            unavailableRoomNumbers.add(ud.room_number)
          }
        }
      })

      // booking is an array from the join
      bookedRooms?.forEach((br) => {
        if (br.room_id === room.id && br.room_number) {
          const bookings = Array.isArray(br.booking) ? br.booking : [br.booking];
          for (const booking of bookings) {
            if (
              booking &&
              booking.status !== "cancelled" &&
              booking.status !== "rejected" &&
              booking.check_in < checkOut &&
              booking.check_out > checkIn
            ) {
              unavailableRoomNumbers.add(br.room_number)
              break;
            }
          }
        }
      })

      directBookings?.forEach((booking) => {
        if (booking.room_id === room.id && booking.allocated_room_number) {
          unavailableRoomNumbers.add(booking.allocated_room_number)
        }
      })

      const availableCount = Math.max(0, totalUnits - unavailableRoomNumbers.size)
      availability[room.id] = availableCount
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
