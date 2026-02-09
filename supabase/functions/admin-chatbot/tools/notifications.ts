// ============= NOTIFICATION TOOLS =============

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatDateIndonesian, getWibDate, formatDateISO } from "../lib/dateHelpers.ts";
import { getTemplate, replaceTemplateVariables } from "../lib/templateHelpers.ts";

// Default template if database template not found
const DEFAULT_CHECKIN_REMINDER_TEMPLATE = `🌅 *DAFTAR TAMU CHECK-IN*
📅 {{tanggal}}

Total: {{jumlah_tamu}} tamu

{{list_tamu}}

_Pesan otomatis dari sistem_`;

export async function sendCheckinReminder(supabase: SupabaseClient, dateStr?: string) {
  const wibDate = getWibDate();
  const targetDate = dateStr || formatDateISO(wibDate);

  console.log(`📅 sendCheckinReminder for date: ${targetDate}`);

  // Get bookings for the date
  const { data: todayBookings, error } = await supabase
    .from('bookings')
    .select('id, booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_nights, rooms(name)')
    .eq('check_in', targetDate)
    .in('status', ['confirmed', 'checked_in'])
    .order('guest_name');

  if (error) {
    console.error('Error fetching check-in bookings:', error);
    throw error;
  }

  const count = todayBookings?.length || 0;

  if (count === 0) {
    return {
      success: true,
      message: `Tidak ada tamu check-in pada ${formatDateIndonesian(targetDate)}`,
      sent_to: 0
    };
  }

  // Helper function to get room numbers for a booking
  async function getRoomNumbers(bookingId: string, fallback: string | null): Promise<string> {
    const { data: roomData } = await supabase
      .from('booking_rooms')
      .select('room_number')
      .eq('booking_id', bookingId);
    
    if (roomData && roomData.length > 0) {
      return roomData.map((r: { room_number: string }) => r.room_number).join(', ');
    }
    return fallback || '-';
  }

  // Build guest list
  const guestListParts: string[] = [];
  for (let i = 0; i < todayBookings.length; i++) {
    const b = todayBookings[i];
    const roomNumbers = await getRoomNumbers(b.id, b.allocated_room_number);
    guestListParts.push(
      `${i + 1}. *${b.guest_name}* (${b.num_guests} tamu)\n` +
      `   📱 ${b.guest_phone || '-'}\n` +
      `   🛏️ ${(b.rooms as unknown as { name: string })?.name} - ${roomNumbers}\n` +
      `   📅 ${b.total_nights} malam s.d. ${formatDateIndonesian(b.check_out)}\n` +
      `   🎫 ${b.booking_code}`
    );
  }
  const guestList = guestListParts.join('\n\n');

  // Get template from database
  const template = await getTemplate(supabase, 'checkin_reminder') || DEFAULT_CHECKIN_REMINDER_TEMPLATE;
  
  // Replace variables
  const reminderMessage = replaceTemplateVariables(template, {
    tanggal: formatDateIndonesian(targetDate),
    jumlah_tamu: count.toString(),
    list_tamu: guestList
  });

  // Get manager phone numbers
  const { data: settings } = await supabase
    .from('hotel_settings')
    .select('whatsapp_manager_numbers, hotel_name')
    .single();

  const managers = settings?.whatsapp_manager_numbers || [];
  
  if (managers.length === 0) {
    return {
      success: true,
      message: `Ada ${count} tamu check-in, tapi tidak ada manager yang dikonfigurasi`,
      check_ins: count,
      sent_to: 0
    };
  }

  // Send to each manager
  let successCount = 0;
  const sendResults: string[] = [];

  for (const manager of managers) {
    try {
      const phone = (manager.phone || '').toString().replace(/\D/g, '');
      if (!phone) continue;

      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: { phone, message: reminderMessage }
      });

      if (error) {
        console.error(`Failed to send to ${manager.name}:`, error);
        sendResults.push(`❌ ${manager.name}: gagal`);
      } else {
        successCount++;
        sendResults.push(`✅ ${manager.name}`);
        console.log(`✅ Sent to ${manager.name} (${phone})`);
      }
    } catch (err) {
      console.error(`Error sending to ${manager.name}:`, err);
      sendResults.push(`❌ ${manager.name}: error`);
    }
  }

  return {
    success: true,
    date: targetDate,
    check_ins: count,
    managers_notified: successCount,
    managers_total: managers.length,
    details: sendResults
  };
}

export async function sendCalendarLink(supabase: SupabaseClient, message?: string) {
  // 1. Get active token from manager_access_tokens
  const { data: token, error: tokenError } = await supabase
    .from('manager_access_tokens')
    .select('token, name')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (tokenError || !token) {
    return {
      success: false,
      error: "Tidak ada token calendar aktif. Hubungi admin untuk membuat token akses calendar."
    };
  }
  
  // 2. Generate URL
  const baseUrl = Deno.env.get("SITE_URL") || "https://pomahgh.lovable.app";
  const calendarUrl = `${baseUrl}/manager/view-calendar/${token.token}`;
  
  // 3. Format response message
  const responseMessage = message 
    ? `${message}\n\n📅 *Link Calendar*\n${calendarUrl}`
    : `📅 *Link Booking Calendar*\n\nKlik link berikut untuk melihat jadwal booking secara real-time:\n\n${calendarUrl}\n\n_Link ini dapat diakses langsung dari browser dan dioptimalkan untuk mobile._`;
  
  return {
    success: true,
    calendar_url: calendarUrl,
    token_name: token.name,
    formatted_message: responseMessage
  };
}

/**
 * Send WhatsApp message to a phone number
 */
export async function sendWhatsAppMessage(supabase: SupabaseClient, args: { phone: string; message: string; booking_code?: string }) {
  const { phone, message, booking_code } = args;
  
  if (!phone || !message) {
    return {
      success: false,
      error: "Nomor telepon dan pesan wajib diisi"
    };
  }
  
  // Normalize phone number
  let normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '62' + normalizedPhone.slice(1);
  }
  if (!normalizedPhone.startsWith('62')) {
    normalizedPhone = '62' + normalizedPhone;
  }
  
  console.log(`📤 Sending WhatsApp to ${normalizedPhone}: "${message.substring(0, 50)}..."`);
  
  try {
    // Call send-whatsapp edge function
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { 
        phone: normalizedPhone, 
        message: message 
      }
    });
    
    if (error) {
      console.error('WhatsApp send error:', error);
      return {
        success: false,
        error: `Gagal mengirim pesan: ${error.message || 'Unknown error'}`,
        phone: normalizedPhone
      };
    }
    
    console.log('✅ WhatsApp sent successfully:', data);
    
    // Get booking info if booking_code provided
    let bookingInfo = null;
    if (booking_code) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('guest_name, rooms(name)')
        .eq('booking_code', booking_code)
        .single();
      
      if (booking) {
        bookingInfo = {
          booking_code,
          guest_name: booking.guest_name,
          room_name: (booking.rooms as unknown as { name: string })?.name
        };
      }
    }
    
    return {
      success: true,
      message: `✅ Pesan berhasil dikirim ke ${normalizedPhone}`,
      phone: normalizedPhone,
      sent_message: message,
      booking_info: bookingInfo
    };
  } catch (err: unknown) {
    console.error('WhatsApp send exception:', err);
    return {
      success: false,
      error: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      phone: normalizedPhone
    };
  }
}

/**
 * Get list of all registered managers
 */
export async function getManagerList(supabase: SupabaseClient) {
  const { data: settings, error } = await supabase
    .from('hotel_settings')
    .select('whatsapp_manager_numbers')
    .single();
  
  if (error) {
    console.error('Error fetching manager list:', error);
    return {
      success: false,
      error: 'Gagal mengambil daftar pengelola'
    };
  }
  
  const managers = settings?.whatsapp_manager_numbers || [];
  
  if (managers.length === 0) {
    return {
      success: true,
      managers: [],
      count: 0,
      message: 'Belum ada pengelola yang terdaftar'
    };
  }
  
  interface ManagerEntry { name: string; phone: string; role?: string }

  return {
    success: true,
    managers: (managers as ManagerEntry[]).map((m) => ({
      name: m.name,
      phone: m.phone,
      role: m.role || 'manager'
    })),
    count: managers.length,
    formatted_list: (managers as ManagerEntry[]).map((m, i: number) => 
      `${i + 1}. ${m.name} (${m.phone}) - ${m.role || 'manager'}`
    ).join('\n')
  };
}
