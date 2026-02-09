import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Manager {
  name: string;
  phone: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(now.getTime() + wibOffset);
    const today = wibDate.toISOString().split('T')[0];
    const currentHour = wibDate.getHours();
    const currentMinute = wibDate.getMinutes();

    const { data: settings, error: settingsError } = await supabase
      .from('hotel_settings')
      .select('check_out_time, whatsapp_manager_numbers, hotel_name')
      .single();

    if (settingsError) throw settingsError;

    const standardCheckoutTime = settings?.check_out_time || '12:00';
    const [standardCheckoutHour] = standardCheckoutTime.split(':').map(Number);
    
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;

    const { data: checkoutBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id, booking_code, guest_name, guest_phone, check_in, check_out,
        check_out_time, total_nights, total_price, status, allocated_room_number,
        rooms(name, price_per_night),
        booking_rooms(room_number, rooms(name))
      `)
      .eq('check_out', today)
      .in('status', ['checked_in', 'confirmed'])
      .order('guest_name');

    if (bookingsError) throw bookingsError;

    const allBookings = checkoutBookings || [];

    if (allBookings.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No checkouts today", date: today, sent_to: 0 }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // rooms from join can be array or single object
    interface CheckoutBooking {
      booking_code: string;
      guest_name: string;
      guest_phone: string | null;
      check_in: string;
      check_out: string;
      check_out_time: string | null;
      total_nights: number;
      total_price: number;
      status: string;
      allocated_room_number: string | null;
      rooms: unknown;
      booking_rooms: Array<{ room_number: string; rooms: unknown }> | null;
    }

    const bookingsToNotify = (allBookings as unknown as CheckoutBooking[]).filter((booking) => {
      const bookingCheckoutTime = booking.check_out_time || standardCheckoutTime;
      const [checkoutHour] = bookingCheckoutTime.split(':').map(Number);
      const reminderHour = checkoutHour - 1;
      const isReminderTime = currentHour === reminderHour;
      return isReminderTime || force;
    });

    const count = bookingsToNotify.length;

    if (count === 0) {
      return new Response(JSON.stringify({ success: true, message: `No bookings need reminder at ${currentHour}:${currentMinute} WIB`, date: today, total_checkouts: allBookings.length, sent_to: 0 }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const managers: Manager[] = settings?.whatsapp_manager_numbers || [];
    
    if (managers.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No managers to notify", date: today, checkouts: count, sent_to: 0 }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sendResults = await Promise.allSettled(
      bookingsToNotify.map(async (booking) => {
        const roomNumbers: string[] = [];
        if (booking.allocated_room_number) {
          roomNumbers.push(booking.allocated_room_number);
        }
        if (booking.booking_rooms) {
          booking.booking_rooms.forEach((br) => {
            if (br.room_number && !roomNumbers.includes(br.room_number)) {
              roomNumbers.push(br.room_number);
            }
          });
        }
        
        const roomDisplay = roomNumbers.length > 0 ? roomNumbers.join(', ') : 'N/A';
        
        // Extract room name from join result (can be array or object)
        const roomsJoin = booking.rooms;
        const roomType = Array.isArray(roomsJoin) 
          ? (roomsJoin[0] as { name?: string } | undefined)?.name || 'N/A'
          : (roomsJoin as { name?: string } | null)?.name || 
            (booking.booking_rooms?.[0]?.rooms as { name?: string } | null)?.name || 'N/A';
        
        const bookingCheckoutTime = booking.check_out_time || standardCheckoutTime;
        const isLateCheckout = booking.check_out_time && booking.check_out_time !== standardCheckoutTime;
        
        const reminderMessage = 
          `🔔 *REMINDER CHECK-OUT${isLateCheckout ? ' (Late Check-out)' : ''}*\n\n` +
          `Selamat siang, sekedar mengingatkan:\n` +
          `Tamu a.n. *${booking.guest_name}* Kamar *${roomDisplay}* (${roomType}) hari ini check-out jam ${bookingCheckoutTime}${isLateCheckout ? ' (LCO)' : ''}.\n\n` +
          `📋 *Pilihan Status Booking:*\n` +
          `1️⃣ Checked-out\n2️⃣ Late Check-out\n3️⃣ Extend\n\n` +
          `Balas dengan angka (1/2/3) untuk kamar ${roomDisplay}\n\n` +
          `🎫 Kode: ${booking.booking_code}`;
        
        const managerResults = await Promise.allSettled(
          managers.map(async (manager: Manager) => {
            const phone = (manager.phone || '').toString().replace(/\D/g, '');
            if (!phone) return null;
            
            const { error } = await supabase.functions.invoke('send-whatsapp', {
              body: { phone, message: reminderMessage }
            });
            
            if (error) throw error;
            return { manager: manager.name, booking: booking.booking_code };
          })
        );
        
        return {
          booking_code: booking.booking_code,
          guest_name: booking.guest_name,
          room_numbers: roomDisplay,
          checkout_time: bookingCheckoutTime,
          is_late_checkout: isLateCheckout,
          managers_notified: managerResults.filter(r => r.status === 'fulfilled').length
        };
      })
    );

    const successfulReminders = sendResults.filter(r => r.status === 'fulfilled');
    
    return new Response(JSON.stringify({ 
      success: true,
      date: today,
      current_time: `${currentHour}:${currentMinute} WIB`,
      standard_checkout: standardCheckoutTime,
      total_checkouts_today: allBookings.length,
      reminders_sent: successfulReminders.length,
      details: successfulReminders.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean)
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Checkout reminder error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
