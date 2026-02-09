import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { data: todayBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        booking_code, guest_name, guest_phone, num_guests,
        check_in, check_out, total_nights, allocated_room_number,
        rooms(name)
      `)
      .eq('check_in', today)
      .eq('status', 'confirmed')
      .order('guest_name');

    if (bookingsError) throw bookingsError;

    const count = todayBookings?.length || 0;

    if (count === 0) {
      return new Response(JSON.stringify({ success: true, message: "No check-ins today", date: today, sent_to: 0 }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    interface CheckinBooking {
      booking_code: string;
      guest_name: string;
      guest_phone: string | null;
      num_guests: number;
      check_in: string;
      check_out: string;
      total_nights: number;
      allocated_room_number: string | null;
      rooms: unknown;
    }

    const guestList = (todayBookings as unknown as CheckinBooking[]).map((b, i: number) => {
      const roomsJoin = b.rooms;
      const roomName = Array.isArray(roomsJoin)
        ? (roomsJoin[0] as { name?: string } | undefined)?.name || 'N/A'
        : (roomsJoin as { name?: string } | null)?.name || 'N/A';
      
      return `${i + 1}. *${b.guest_name}* (${b.num_guests} tamu)\n` +
        `   📱 ${b.guest_phone || '-'}\n` +
        `   🛏️ ${roomName} - ${b.allocated_room_number}\n` +
        `   📅 ${b.total_nights} malam s.d. ${b.check_out}\n` +
        `   🎫 ${b.booking_code}`;
    }).join('\n\n');

    const reminderMessage = 
      `🌅 *DAFTAR TAMU CHECK-IN HARI INI*\n` +
      `📅 ${formatDateIndonesian(today)}\n\n` +
      `Total: ${count} tamu\n\n` +
      `${guestList}\n\n` +
      `_Pesan otomatis dari sistem Pomah Guesthouse_`;

    const { data: settings, error: settingsError } = await supabase
      .from('hotel_settings')
      .select('whatsapp_manager_numbers, hotel_name')
      .single();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
    }

    interface ManagerContact { phone: string; name: string }
    const managers: ManagerContact[] = settings?.whatsapp_manager_numbers || [];
    
    if (managers.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No managers to notify", date: today, check_ins: count, sent_to: 0 }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sendResults = await Promise.allSettled(
      managers.map(async (manager: ManagerContact) => {
        const phone = (manager.phone || '').toString().replace(/\D/g, '');
        if (!phone) throw new Error(`No phone number for ${manager.name}`);
        
        const { error } = await supabase.functions.invoke('send-whatsapp', {
          body: { phone, message: reminderMessage }
        });
        
        if (error) throw error;
        return manager.name;
      })
    );

    const successCount = sendResults.filter(r => r.status === 'fulfilled').length;
    const failedManagers = sendResults
      .filter(r => r.status === 'rejected')
      .map((_, i) => managers[i]?.name || 'Unknown');
    
    return new Response(JSON.stringify({ 
      success: true, date: today, check_ins: count,
      managers_notified: successCount, managers_total: managers.length,
      failed: failedManagers.length > 0 ? failedManagers : undefined
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Daily reminder error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function formatDateIndonesian(dateStr: string): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const date = new Date(dateStr);
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
