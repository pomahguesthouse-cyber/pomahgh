import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const bookingData = await req.json();
    console.log("📨 Notify new booking:", bookingData);

    // Get manager phone numbers and hotel name
    const { data: settings, error: settingsError } = await supabase
      .from('hotel_settings')
      .select('whatsapp_manager_numbers, hotel_name')
      .single();

    if (settingsError) {
      console.error("Failed to fetch hotel settings:", settingsError);
      return new Response(JSON.stringify({ 
        success: false, 
        reason: "Failed to fetch hotel settings" 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const managers = settings?.whatsapp_manager_numbers || [];
    
    if (!Array.isArray(managers) || managers.length === 0) {
      console.log("No managers configured for notifications");
      return new Response(JSON.stringify({ 
        success: false, 
        reason: "No managers configured" 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build source label
    const sourceLabels: Record<string, string> = {
      'direct': '📞 Direct Booking',
      'ota': `🌐 OTA${bookingData.ota_name ? ` (${bookingData.ota_name})` : ''}`,
      'walk_in': '🚶 Walk-in',
      'admin': '👨‍💼 Admin Chatbot',
      'other': `📝 ${bookingData.other_source || 'Website'}`
    };
    const sourceLabel = sourceLabels[bookingData.booking_source] || '📝 Website';

    // Build notification message
    const roomDisplay = bookingData.room_number 
      ? `*${bookingData.room_name}* - ${bookingData.room_number}`
      : `*${bookingData.room_name}*`;

    const message = 
      `🆕 *BOOKING BARU!*\n\n` +
      `👤 *${bookingData.guest_name}*\n` +
      `📱 ${bookingData.guest_phone || '-'}\n\n` +
      `🛏️ ${roomDisplay}\n` +
      `📅 ${formatDate(bookingData.check_in)} → ${formatDate(bookingData.check_out)}\n` +
      `🌙 ${bookingData.total_nights} malam\n` +
      `👥 ${bookingData.num_guests} tamu\n\n` +
      `💰 *Rp ${Number(bookingData.total_price).toLocaleString('id-ID')}*\n\n` +
      `📍 ${sourceLabel}\n` +
      `🎫 Kode: *${bookingData.booking_code}*\n\n` +
      `_Notifikasi otomatis dari ${settings?.hotel_name || 'Pomah Guesthouse'}_`;

    console.log("📝 Message to send:", message);

    // Send to each manager
    let successCount = 0;
    let errors: string[] = [];

    for (const manager of managers) {
      const phone = ((manager as any).phone || '').toString().replace(/\D/g, '');
      const name = (manager as any).name || 'Manager';
      
      if (!phone) {
        console.log(`Skipping manager ${name}: no phone number`);
        continue;
      }

      console.log(`📤 Sending to ${name} (${phone})...`);

      try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp', {
          body: { phone, message }
        });

        if (error) {
          console.error(`Failed to send to ${name}:`, error);
          errors.push(`${name}: ${error.message}`);
        } else {
          console.log(`✅ Sent to ${name}`);
          successCount++;
        }
      } catch (e) {
        console.error(`Error sending to ${name}:`, e);
        errors.push(`${name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    console.log(`📊 Notification summary: ${successCount}/${managers.length} sent`);

    return new Response(JSON.stringify({
      success: successCount > 0,
      managers_notified: successCount,
      total_managers: managers.length,
      errors: errors.length > 0 ? errors : undefined
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Notify new booking error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
