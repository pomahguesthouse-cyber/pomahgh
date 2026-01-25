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
    const checkoutTime = settings?.check_out_time || '12:00';
    const [checkoutHour, checkoutMinute] = checkoutTime.split(':').map(Number);
    
    // Calculate reminder time (1 hour before checkout)
    const reminderHour = checkoutHour - 1;
    
    // Check if current time is within the reminder window (between reminderHour:00 and reminderHour:59)
    // This allows the function to work regardless of exact cron timing
    const isReminderTime = currentHour === reminderHour;
    
    console.log(`Standard checkout: ${checkoutTime}, Reminder hour: ${reminderHour}:00`);
    console.log(`Current time: ${currentHour}:${currentMinute}, Is reminder time: ${isReminderTime}`);

    // If not reminder time, we can still run manually by passing force=true
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    
    if (!isReminderTime && !force) {
      console.log("Not within reminder time window, skipping...");
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Not reminder time. Current: ${currentHour}:${currentMinute}, Reminder at: ${reminderHour}:00`,
        date: today,
        sent_to: 0 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    const count = checkoutBookings?.length || 0;
    console.log(`Found ${count} checkouts today`);

    if (count === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No checkouts today",
        date: today,
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
      checkoutBookings.map(async (booking: any) => {
        // Get all room numbers for this booking
        const roomNumbers: string[] = [];
        if (booking.allocated_room_number) {
          roomNumbers.push(booking.allocated_room_number);
        }
        if (booking.booking_rooms) {
          booking.booking_rooms.forEach((br: any) => {
            if (br.room_number && !roomNumbers.includes(br.room_number)) {
              roomNumbers.push(br.room_number);
            }
          });
        }
        
        const roomDisplay = roomNumbers.length > 0 ? roomNumbers.join(', ') : 'N/A';
        const roomType = booking.rooms?.name || booking.booking_rooms?.[0]?.rooms?.name || 'N/A';
        const pricePerNight = booking.rooms?.price_per_night || 0;
        
        // Store conversation context in session for follow-up
        const reminderMessage = 
          `🔔 *REMINDER CHECK-OUT*\n\n` +
          `Selamat siang, sekedar mengingatkan:\n` +
          `Tamu a.n. *${booking.guest_name}* Kamar *${roomDisplay}* (${roomType}) hari ini check-out jam ${checkoutTime}.\n\n` +
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
          managers_notified: managerResults.filter(r => r.status === 'fulfilled').length
        };
      })
    );

    const successfulReminders = sendResults.filter(r => r.status === 'fulfilled');
    
    console.log(`Checkout reminders sent for ${successfulReminders.length}/${count} bookings`);
    
    return new Response(JSON.stringify({ 
      success: true,
      date: today,
      reminder_time: `${reminderHour}:00 WIB`,
      checkout_time: checkoutTime,
      checkouts: count,
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
