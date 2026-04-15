import type { SupabaseClient } from '../types.ts';
import { normalizePhone } from '../utils/phone.ts';
import { indonesianDateToISO } from '../utils/format.ts';

/** Extract conversation context from message history for booking continuation */
export function extractConversationContext(
  messages: Array<{ role: string; content: string }>,
): Record<string, unknown> | null {
  const context: Record<string, unknown> = {};

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    if (msg.role === 'assistant') {
      // Extract booking code
      if (!context.last_booking_code) {
        const bookingCodeMatch = msg.content.match(/PMH-[A-Z0-9]{6}/);
        if (bookingCodeMatch) {
          context.last_booking_code = bookingCodeMatch[0];

          const nameMatch = msg.content.match(/(?:Nama(?:\s+tamu)?|Atas nama|a\.n\.?)\s*[:\-]?\s*\*?([A-Za-z\s]+?)\*?(?:\n|$|,|\|)/i);
          if (nameMatch) context.last_booking_guest_name = nameMatch[1].trim();

          const emailMatch = msg.content.match(/(?:Email)\s*[:\-]?\s*\*?([^\s*\n]+@[^\s*\n]+)\*?/i);
          if (emailMatch) context.last_booking_guest_email = emailMatch[1].trim();

          const phoneMatch = msg.content.match(/(?:(?:No\.?\s*)?(?:HP|Telepon|WhatsApp|WA|Telp))\s*[:\-]?\s*\*?([0-9+\-\s]{8,})\*?/i);
          if (phoneMatch) context.last_booking_guest_phone = phoneMatch[1].trim();

          const bookingRoomMatch = msg.content.match(/(?:Kamar|Tipe|Room)\s*[:\-]?\s*\*?(Single|Deluxe|Grand Deluxe|Family Suite)\*?/i);
          if (bookingRoomMatch) context.last_booking_room = bookingRoomMatch[1];
        }
      }

      // Extract room from availability responses
      if (!context.preferred_room) {
        const roomPatterns = [
          /[Uu]ntuk\s+(Single|Deluxe|Grand Deluxe|Family Suite),?\s*(tersedia|available)/i,
          /(Single|Deluxe|Grand Deluxe|Family Suite),?\s*(tersedia|available)/i,
          /(Single|Deluxe|Grand Deluxe|Family Suite)\s+untuk\s+check-?in/i,
          /(?:kamar|tipe|room)\s+(Single|Deluxe|Grand Deluxe|Family Suite)/i,
          /(?:booking|pesan|book)\s+(Single|Deluxe|Grand Deluxe|Family Suite)/i,
        ];
        for (const pattern of roomPatterns) {
          const match = msg.content.match(pattern);
          if (match) {
            context.preferred_room = match[1];
            break;
          }
        }
      }

      // Extract dates
      if (!context.check_in_date || !context.check_out_date) {
        const monthPattern = '(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)';

        const fullDateRangeRegex = new RegExp(
          `(\\d{1,2})\\s+${monthPattern}\\s+(\\d{4}),?\\s*(?:sampai|hingga|s\\.?d\\.?|ke|-)\\s*(\\d{1,2})\\s+${monthPattern}\\s+(\\d{4})`, 'i'
        );
        const fullMatch = msg.content.match(fullDateRangeRegex);
        if (fullMatch) {
          context.check_in_date = indonesianDateToISO(fullMatch[1], fullMatch[2], fullMatch[3]);
          context.check_out_date = indonesianDateToISO(fullMatch[4], fullMatch[5], fullMatch[6]);
          context.dates_mentioned = fullMatch[0];
        }

        if (!context.check_in_date) {
          const shortDateRangeRegex = new RegExp(`(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+${monthPattern}\\s+(\\d{4})`, 'i');
          const shortMatch = msg.content.match(shortDateRangeRegex);
          if (shortMatch) {
            context.check_in_date = indonesianDateToISO(shortMatch[1], shortMatch[3], shortMatch[4]);
            context.check_out_date = indonesianDateToISO(shortMatch[2], shortMatch[3], shortMatch[4]);
            context.dates_mentioned = shortMatch[0];
          }
        }

        if (!context.check_in_date) {
          const checkInRegex = new RegExp(`check-?in[:\\s]+(\\d{1,2})\\s+${monthPattern}\\s+(\\d{4})`, 'i');
          const checkInMatch = msg.content.match(checkInRegex);
          if (checkInMatch) {
            context.check_in_date = indonesianDateToISO(checkInMatch[1], checkInMatch[2], checkInMatch[3]);
          }
        }
      }

      // Check if AI asked for guest data
      if (!context.awaiting_guest_data) {
        const guestDataPatterns = [
          /mohon\s+informasikan/i, /mohon\s+info/i, /nama\s+lengkap.*anda/i,
          /data\s+(untuk\s+)?booking/i, /nama.*email.*(?:hp|nomor|telepon|whatsapp)/i,
          /silakan\s+(?:berikan|kirim).*data/i, /butuh.*(?:nama|data|informasi)/i,
        ];
        for (const pattern of guestDataPatterns) {
          if (pattern.test(msg.content)) {
            context.awaiting_guest_data = true;
            break;
          }
        }
      }
    }

    // User messages
    if (msg.role === 'user') {
      if (!context.last_booking_code) {
        const m = msg.content.match(/PMH-[A-Z0-9]{6}/i);
        if (m) context.last_booking_code = m[0].toUpperCase();
      }
      if (!context.last_booking_guest_email) {
        const m = msg.content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (m) context.last_booking_guest_email = m[0].toLowerCase();
      }
      if (!context.last_booking_guest_phone) {
        const m = msg.content.match(/(?:\+62|62|0)\d{8,13}/);
        if (m) context.last_booking_guest_phone = normalizePhone(m[0]);
      }
      if (!context.preferred_room) {
        const m = msg.content.match(/(single|deluxe|grand\s*deluxe|family\s*suite)/i);
        if (m) context.preferred_room = m[1].replace(/\s+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }
  }

  return Object.keys(context).length > 0 ? context : null;
}

/** Get latest booking context from DB by phone */
export async function getLatestBookingContextByPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<Record<string, unknown> | null> {
  const localPhone = phone.startsWith('62') ? `0${phone.slice(2)}` : phone;

  const { data: booking } = await supabase
    .from('bookings')
    .select(`booking_code, guest_name, guest_email, guest_phone, rooms:room_id (name)`)
    .or(`guest_phone.eq.${phone},guest_phone.eq.${localPhone}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!booking?.booking_code) return null;

  const roomsData = booking.rooms as unknown;
  const roomName = Array.isArray(roomsData)
    ? (roomsData[0] as { name: string } | undefined)?.name
    : (roomsData as { name: string } | null)?.name;

  return {
    last_booking_code: booking.booking_code,
    last_booking_guest_name: booking.guest_name || undefined,
    last_booking_guest_email: booking.guest_email || undefined,
    last_booking_guest_phone: booking.guest_phone ? normalizePhone(booking.guest_phone) : undefined,
    last_booking_room: roomName || undefined,
  };
}
