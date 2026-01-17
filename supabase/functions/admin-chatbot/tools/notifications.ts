// ============= NOTIFICATION TOOLS =============

import { formatDateIndonesian, getWibDate, formatDateISO } from "../lib/dateHelpers.ts";

export async function sendCheckinReminder(supabase: any, dateStr?: string) {
  const wibDate = getWibDate();
  const targetDate = dateStr || formatDateISO(wibDate);

  console.log(`📅 sendCheckinReminder for date: ${targetDate}`);

  // Get bookings for the date
  const { data: todayBookings, error } = await supabase
    .from('bookings')
    .select('booking_code, guest_name, guest_phone, check_in, check_out, allocated_room_number, num_guests, total_nights, rooms(name)')
    .eq('check_in', targetDate)
    .eq('status', 'confirmed')
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

  // Build reminder message
  const guestList = todayBookings.map((b: any, i: number) => 
    `${i + 1}. *${b.guest_name}* (${b.num_guests} tamu)\n` +
    `   📱 ${b.guest_phone || '-'}\n` +
    `   🛏️ ${b.rooms?.name} - ${b.allocated_room_number}\n` +
    `   📅 ${b.total_nights} malam s.d. ${b.check_out}\n` +
    `   🎫 ${b.booking_code}`
  ).join('\n\n');

  const reminderMessage = 
    `🌅 *DAFTAR TAMU CHECK-IN*\n` +
    `📅 ${formatDateIndonesian(targetDate)}\n\n` +
    `Total: ${count} tamu\n\n` +
    `${guestList}\n\n` +
    `_Pesan otomatis dari sistem_`;

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
