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

    // Get current time in WIB (UTC+7)
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(now.getTime() + wibOffset);
    const today = wibDate.toISOString().split('T')[0];
    const currentHour = wibDate.getHours();
    const currentMinute = wibDate.getMinutes();

    console.log(`🔔 Checkout Reminder - Date: ${today}, Time: ${currentHour}:${currentMinute} WIB`);

    // Get hotel settings for checkout time
    const { data: settings, error: settingsError } = await supabase
      .from('hotel_settings')
      .select('check_out_time, whatsapp_manager_numbers, hotel_name')
      .single();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw settingsError;
    }

    // Standard checkout time (default 12:00)
    const standardCheckoutTime = settings?.check_out_time || '12:00';
    const [standardCheckoutHour] = standardCheckoutTime.split(':').map(Number);
    
    // If not reminder time, we can still run manually by passing force=true
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    
    console.log(`Standard checkout: ${standardCheckoutTime}, Force mode: ${force}`);

    // Get bookings checking out today with status checked_in or confirmed
    const { data: checkoutBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_code,
        guest_name,
        guest_phone,
        check_in,
        check_out,
        check_out_time,
        total_nights,
        total_price,
        status,
        allocated_room_number,
        rooms(name, price_per_night),
        booking_rooms(room_number, rooms(name))
      `)
      .eq('check_out', today)
      .in('status', ['checked_in', 'confirmed'])
      .order('guest_name');

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      throw bookingsError;
    }

    const allBookings = checkoutBookings || [];
    console.log(`Found ${allBookings.length} total checkouts today`);

    if (allBookings.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No checkouts today",
        date: today,
        sent_to: 0 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Filter bookings based on their individual checkout time
    // Reminder should be sent 1 hour before the actual checkout time
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
      rooms: { name: string; price_per_night: number } | null;
      booking_rooms: Array<{ room_number: string; rooms: { name: string } | null }> | null;
    }

    const bookingsToNotify = (allBookings as CheckoutBooking[]).filter((booking) => {
      const bookingCheckoutTime = booking.check_out_time || standardCheckoutTime;
      const [checkoutHour] = bookingCheckoutTime.split(':').map(Number);
      const reminderHour = checkoutHour - 1;
      
      const isReminderTime = currentHour === reminderHour;
      
      console.log(`Booking ${booking.booking_code}: checkout ${bookingCheckoutTime}, reminder at ${reminderHour}:00, current ${currentHour}:00, notify: ${isReminderTime || force}`);
      
      return isReminderTime || force;
    });

    const count = bookingsToNotify.length;
    console.log(`${count} bookings need reminder notification now`);

    if (count === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: `No bookings need reminder at ${currentHour}:${currentMinute} WIB`,
        date: today,
        total_checkouts: allBookings.length,
        sent_to: 0 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const managers: Manager[] = settings?.whatsapp_manager_numbers || [];
    
    if (managers.length === 0) {
      console.log("No managers configured to receive notifications");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No managers to notify",
        date: today,
        checkouts: count,
        sent_to: 0
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Sending checkout reminders to ${managers.length} managers...`);

    // Build individual checkout reminders for each booking
    const sendResults = await Promise.allSettled(
      bookingsToNotify.map(async (booking) => {
        // Get all room numbers for this booking
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
        const roomType = booking.rooms?.name || booking.booking_rooms?.[0]?.rooms?.name || 'N/A';
        
        // Use booking's custom checkout time or standard checkout time
        const bookingCheckoutTime = booking.check_out_time || standardCheckoutTime;
        const isLateCheckout = booking.check_out_time && booking.check_out_time !== standardCheckoutTime;
        
        // Store conversation context in session for follow-up
        const reminderMessage = 
          `🔔 *REMINDER CHECK-OUT${isLateCheckout ? ' (Late Check-out)' : ''}*\n\n` +
          `Selamat siang, sekedar mengingatkan:\n` +
          `Tamu a.n. *${booking.guest_name}* Kamar *${roomDisplay}* (${roomType}) hari ini check-out jam ${bookingCheckoutTime}${isLateCheckout ? ' (LCO)' : ''}.\n\n` +
          `📋 *Pilihan Status Booking:*\n` +
          `1️⃣ Checked-out\n` +
          `2️⃣ Late Check-out\n` +
          `3️⃣ Extend\n\n` +
          `Balas dengan angka (1/2/3) untuk kamar ${roomDisplay}\n\n` +
          `_Contoh: "${roomNumbers[0] || '207'} 1" untuk checkout_\n` +
          `_"${roomNumbers[0] || '207'} 2 jam 17.00 biaya 100000"_\n` +
          `_"${roomNumbers[0] || '207'} 3 tambah 2 malam"_\n\n` +
          `🎫 Kode: ${booking.booking_code}`;
        
        // Send to each manager
        const managerResults = await Promise.allSettled(
          managers.map(async (manager: Manager) => {
            const phone = (manager.phone || '').toString().replace(/\D/g, '');
            if (!phone) return null;
            
            const { error } = await supabase.functions.invoke('send-whatsapp', {
              body: { phone, message: reminderMessage }
            });
            
            if (error) {
              console.error(`Failed to send to ${manager.name}:`, error);
              throw error;
            }
            
            console.log(`✅ Sent reminder for ${booking.guest_name} to ${manager.name}`);
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
    
    console.log(`Checkout reminders sent for ${successfulReminders.length}/${count} bookings`);
    
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
