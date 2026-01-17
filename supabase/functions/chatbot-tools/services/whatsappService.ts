import { formatDateWithDay } from '../lib/dateUtils.ts';
import { formatPrice } from '../lib/validation.ts';
import { WhatsAppMessagePayload } from '../lib/types.ts';

/**
 * WhatsApp Message Template Engine
 * SINGLE SOURCE OF TRUTH for message formatting
 */

/**
 * Build admin notification message
 */
export function buildAdminMessage(
  type: 'new' | 'update' | 'reschedule',
  payload: WhatsAppMessagePayload
): string {
  const checkInFormatted = formatDateWithDay(payload.checkIn);
  const checkOutFormatted = formatDateWithDay(payload.checkOut);
  const priceFormatted = payload.totalPrice.toLocaleString('id-ID');

  const headers: Record<string, string> = {
    new: '🔔 *BOOKING BARU (Chatbot AI)*',
    update: '🔄 *PERUBAHAN BOOKING*',
    reschedule: '🔄 *RESCHEDULE BOOKING (Chatbot AI)*'
  };

  const baseMessage = `${headers[type]}

Nama: ${payload.guestName}
Email: ${payload.guestEmail}
Telp: ${payload.guestPhone || '-'}
🛏️ Kamar: ${payload.roomsText} (${payload.totalRooms} unit)
Check-in: ${checkInFormatted}
Check-out: ${checkOutFormatted}
Tamu: ${payload.numGuests}
Total Malam: ${payload.totalNights}
💰 Total: Rp ${priceFormatted}

Kode Booking: ${payload.bookingCode}`;

  // Add status for update type
  if (type === 'update' && payload.status) {
    return `${baseMessage}\nStatus: ${payload.status}`;
  }

  // Add warning for reschedule
  if (type === 'reschedule') {
    return `${baseMessage}\n\n⚠️ Booking ini telah diperbarui oleh guest melalui chatbot.`;
  }

  return baseMessage;
}

/**
 * Build customer notification message
 */
export function buildCustomerMessage(
  type: 'new' | 'update',
  payload: WhatsAppMessagePayload
): string {
  const checkInFormatted = formatDateWithDay(payload.checkIn);
  const checkOutFormatted = formatDateWithDay(payload.checkOut);
  const priceFormatted = payload.totalPrice.toLocaleString('id-ID');

  if (type === 'update') {
    return `Booking Anda telah diperbarui! 🔄

📍 ${payload.hotelName}
🛏️ Kamar: ${payload.roomsText} (${payload.totalRooms} kamar)
📅 Check-in: ${checkInFormatted}
📅 Check-out: ${checkOutFormatted}
👥 Tamu: ${payload.numGuests}
💰 Total: Rp ${priceFormatted}

📝 Kode Booking: ${payload.bookingCode}
📊 Status: ${payload.status || 'Menunggu konfirmasi'}`;
  }

  // New booking message
  return `Terima kasih ${payload.guestName}! 🙏

Booking Anda telah kami terima:

📍 ${payload.hotelName}
🛏️ Kamar: ${payload.roomsText} (${payload.totalRooms} kamar)
📅 Check-in: ${checkInFormatted}
📅 Check-out: ${checkOutFormatted}
👥 Tamu: ${payload.numGuests}
💰 Total: Rp ${priceFormatted}

📝 Kode Booking: ${payload.bookingCode}
⏳ Status: Menunggu konfirmasi

Kami akan segera menghubungi Anda untuk konfirmasi pembayaran.`;
}

/**
 * Send WhatsApp message via edge function
 */
export async function sendWhatsApp(
  phone: string,
  message: string,
  type: 'admin' | 'customer'
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !anonKey) {
      console.error("Missing Supabase environment variables for WhatsApp");
      return;
    }

    await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ phone, message, type })
    });

    console.log(`✅ WhatsApp sent to ${type}: ${phone}`);
  } catch (err) {
    console.error(`Failed to send ${type} WhatsApp:`, err);
  }
}

/**
 * Send booking notifications to admin and customer
 */
export async function sendBookingNotifications(
  hotelSettings: { whatsapp_number?: string; hotel_name?: string } | null,
  payload: WhatsAppMessagePayload,
  messageType: 'new' | 'update' | 'reschedule'
): Promise<void> {
  if (!hotelSettings?.whatsapp_number) {
    console.log("No WhatsApp number configured, skipping notifications");
    return;
  }

  // Send admin notification
  const adminMessage = buildAdminMessage(messageType, payload);
  sendWhatsApp(hotelSettings.whatsapp_number, adminMessage, 'admin');

  // Send customer notification if phone provided
  if (payload.guestPhone) {
    const customerType = messageType === 'reschedule' ? 'update' : messageType;
    const customerMessage = buildCustomerMessage(customerType as 'new' | 'update', {
      ...payload,
      hotelName: hotelSettings.hotel_name
    });
    sendWhatsApp(payload.guestPhone, customerMessage, 'customer');
  }
}
