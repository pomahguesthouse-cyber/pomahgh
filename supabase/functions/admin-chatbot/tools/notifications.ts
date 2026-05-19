// ============= NOTIFICATION TOOLS =============

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatDateIndonesian, formatDateDDMMYYYY, getWibDate, formatDateISO } from "../lib/dateHelpers.ts";
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

  return {
    success: true,
    date: targetDate,
    check_ins: count,
    managers_notified: 0,
    managers_total: managers.length,
    details: ["WhatsApp notifications disabled — Fonnte integration removed"]
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

export async function sendWhatsAppMessage(_supabase: SupabaseClient, _args: { phone: string; message: string; booking_code?: string }) {
  return {
    success: false,
    error: "WhatsApp send not available — Fonnte integration removed",
  };
}

/**
 * Get list of all registered managers
 */
export async function getManagerList(supabase: SupabaseClient) {
  return await _getManagerListImpl(supabase);
}

export async function sendBrochureToGuest(
  _supabase: SupabaseClient,
  _args: { phone: string; caption?: string }
) {
  return {
    success: false,
    error: "WhatsApp file send not available — Fonnte integration removed",
  };
}

async function _getManagerListImpl(supabase: SupabaseClient) {
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

/**
 * Generate invoice and send via WhatsApp / Email to guest and/or booking manager
 */
export async function sendInvoice(
  supabase: SupabaseClient,
  args: {
    booking_code: string;
    recipient: 'guest' | 'booking_manager' | 'both';
    send_whatsapp?: boolean;
    send_email?: boolean;
    manager_phone?: string;
  }
) {
  const { booking_code, recipient } = args;
  const sendWa = args.send_whatsapp !== false; // default true
  const sendEmail = args.send_email === true; // default false

  console.log(`📧 sendInvoice: ${booking_code} → ${recipient} (wa=${sendWa}, email=${sendEmail})`);

  // 1. Find booking
  const { data: booking, error: bookErr } = await supabase
    .from('bookings')
    .select('id, booking_code, guest_name, guest_phone, guest_email, total_price, payment_status, payment_amount, check_in, check_out, rooms(name)')
    .eq('booking_code', booking_code)
    .single();

  if (bookErr || !booking) {
    return { success: false, error: `Booking ${booking_code} tidak ditemukan` };
  }

  // 2. Generate invoice PDF (always email=false here, we control sending separately)
  let invoiceUrl: string | null = null;
  let guestEmailSent = false;
  let guestWaSent = false;

  const wantsGuest = recipient === 'guest' || recipient === 'both';
  const wantsManager = recipient === 'booking_manager' || recipient === 'both';

  try {
    const { data: invData, error: invErr } = await supabase.functions.invoke('generate-invoice', {
      body: {
        booking_id: booking.id,
        send_email: wantsGuest && sendEmail,
        send_whatsapp: wantsGuest && sendWa,
      },
    });

    if (invErr) {
      console.error('generate-invoice error:', invErr);
      return { success: false, error: `Gagal membuat invoice: ${invErr.message}` };
    }

    invoiceUrl = invData?.invoice_pdf_url || null;
    guestEmailSent = !!invData?.email_sent;
    guestWaSent = false;
  } catch (e) {
    console.error('generate-invoice exception:', e);
    return { success: false, error: `Gagal generate invoice: ${e instanceof Error ? e.message : 'Unknown'}` };
  }

  // 3. Send invoice link to booking manager via WA if requested
  let managerWaSent = false;
  let managerPhoneUsed: string | null = null;
  if (wantsManager && sendWa && invoiceUrl) {
    const phone = args.manager_phone || '';
    if (!phone) {
      console.warn('⚠️ booking_manager recipient requested without manager_phone — skipping');
    } else {
      const room = (booking.rooms as unknown as { name: string } | null)?.name || '-';
      const remaining = (booking.total_price || 0) - (booking.payment_amount || 0);
      const statusLabel = booking.payment_status === 'paid' ? '✅ Lunas' :
        booking.payment_status === 'down_payment' ? `🟡 DP Rp ${(booking.payment_amount || 0).toLocaleString('id-ID')} (sisa Rp ${remaining.toLocaleString('id-ID')})` :
        '⏳ Belum bayar';
      const msg = `📄 *INVOICE BOOKING*\n\n` +
        `Kode: *${booking.booking_code}*\n` +
        `Tamu: ${booking.guest_name}\n` +
        `Kamar: ${room}\n` +
        `Check-in: ${formatDateDDMMYYYY(booking.check_in)}\n` +
        `Check-out: ${formatDateDDMMYYYY(booking.check_out)}\n` +
        `Total: Rp ${(booking.total_price || 0).toLocaleString('id-ID')}\n` +
        `Status: ${statusLabel}\n\n` +
        `📎 Invoice PDF:\n${invoiceUrl}`;

      const result = await sendWhatsAppMessage(supabase, {
        phone,
        message: msg,
        booking_code: booking.booking_code,
      });
      managerWaSent = !!(result as { success?: boolean }).success;
      managerPhoneUsed = phone;
    }
  }

  return {
    success: true,
    booking_code: booking.booking_code,
    invoice_url: invoiceUrl,
    recipient,
    guest_whatsapp_sent: guestWaSent,
    guest_email_sent: guestEmailSent,
    guest_phone: booking.guest_phone,
    guest_email: booking.guest_email,
    manager_whatsapp_sent: managerWaSent,
    manager_phone: managerPhoneUsed,
  };
}
