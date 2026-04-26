/**
 * Preview WhatsApp message templates untuk admin manual booking.
 * Mirror dari supabase/functions/chatbot-tools/services/whatsappService.ts
 * agar admin bisa melihat pesan persis seperti yang akan dikirim.
 */
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export type PreviewPaymentMethod = "transfer" | "pay_at_hotel";

export interface PreviewPayload {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  roomsText: string;
  totalRooms: number;
  checkIn: Date;
  checkOut: Date;
  numGuests: number;
  totalNights: number;
  totalPrice: number;
  bookingCode?: string;
  hotelName?: string;
  paymentMethod: PreviewPaymentMethod;
}

const fmt = (d: Date) => format(d, "EEEE, dd/MM/yyyy", { locale: localeId });

export function buildAdminPreview(p: PreviewPayload): string {
  const isPay = p.paymentMethod === "pay_at_hotel";
  const paymentLine = isPay
    ? "💵 Metode Bayar: BAYAR DI TEMPAT (cash/transfer saat check-in)"
    : "💳 Metode Bayar: Transfer Bank";
  const code = p.bookingCode ?? "(akan dibuat otomatis)";

  const base = `🔔 *BOOKING BARU (Admin Manual)*

Nama: ${p.guestName || "-"}
Email: ${p.guestEmail || "-"}
Telp: ${p.guestPhone || "-"}
🛏️ Kamar: ${p.roomsText} (${p.totalRooms} unit)
Check-in: ${fmt(p.checkIn)}
Check-out: ${fmt(p.checkOut)}
Tamu: ${p.numGuests}
Total Malam: ${p.totalNights}
💰 Total: Rp ${p.totalPrice.toLocaleString("id-ID")}
${paymentLine}

Kode Booking: ${code}`;

  if (isPay) {
    return `${base}\n\n⚠️ Tamu memilih BAYAR DI TEMPAT — wajib konfirmasi via WhatsApp sebelum tanggal check-in.`;
  }
  return base;
}

export function buildCustomerPreview(p: PreviewPayload): string {
  const isPay = p.paymentMethod === "pay_at_hotel";
  const code = p.bookingCode ?? "(akan dibuat otomatis)";
  const hotel = p.hotelName ?? "Pomah Guest House";

  if (isPay) {
    return `Terima kasih ${p.guestName || "-"}! 🙏

Booking Anda telah kami terima:

📍 ${hotel}
🛏️ Kamar: ${p.roomsText} (${p.totalRooms} kamar)
📅 Check-in: ${fmt(p.checkIn)}
📅 Check-out: ${fmt(p.checkOut)}
👥 Tamu: ${p.numGuests}
💰 Total: Rp ${p.totalPrice.toLocaleString("id-ID")}
💵 Pembayaran: BAYAR DI TEMPAT (cash/transfer saat check-in)

📝 Kode Booking: ${code}
⏳ Status: Menunggu konfirmasi

Tim kami akan menghubungi Anda via WhatsApp untuk konfirmasi reservasi sebelum tanggal check-in. 🙏`;
  }

  return `Terima kasih ${p.guestName || "-"}! 🙏

Booking Anda telah kami terima:

📍 ${hotel}
🛏️ Kamar: ${p.roomsText} (${p.totalRooms} kamar)
📅 Check-in: ${fmt(p.checkIn)}
📅 Check-out: ${fmt(p.checkOut)}
👥 Tamu: ${p.numGuests}
💰 Total: Rp ${p.totalPrice.toLocaleString("id-ID")}

📝 Kode Booking: ${code}
⏳ Status: Menunggu konfirmasi

Kami akan segera menghubungi Anda untuk konfirmasi pembayaran.`;
}