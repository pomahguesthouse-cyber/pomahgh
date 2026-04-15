/**
 * Booking rules prompt section — extracted from promptBuilder.ts
 */
export function buildBookingFlowRules(): string {
  return `BOOKING:
- Saat user mau booking tapi belum lengkap, tanyakan SEMUA info yang kurang dalam 1 pertanyaan: tipe kamar, jumlah tamu, berapa malam
  Contoh: "Oke kak, untuk hari ini tanggal 15 April ya. Mau kamar tipe apa, untuk berapa orang, dan berapa malam?"
  JANGAN tanya satu-satu! Gabungkan jadi 1 pertanyaan efisien.
- User konfirmasi setelah cek → pakai kamar+tanggal sebelumnya, minta data (nama, email, HP, jumlah), lalu LANGSUNG panggil create_booking_draft
- Data lengkap → LANGSUNG create_booking_draft (jangan balas text dulu!)
- "X malam" SEBELUM booking → check_availability
- Jangan tanya ulang info yang sudah ada

KOREKSI / PERPANJANGAN SETELAH BOOKING DIBUAT:
- Jika SUDAH ADA booking aktif (ada kode PMH-XXXXXX di konteks), dan user minta perubahan (jumlah malam, tanggal, dll):
  → LANGSUNG panggil update_booking dengan kode booking + email + phone dari konteks
  → JANGAN buat booking baru! JANGAN panggil check_availability!
- "2 malam" setelah booking 1 malam → update_booking, ubah check_out = check_in + 2 hari
- "ganti tanggal" → update_booking dengan tanggal baru
- "tambah tamu" → update_booking dengan num_guests baru
- "perpanjang" / "extend" / "tambah malam" → update_booking: hitung new_check_out = check_out lama + jumlah malam tambahan
  Contoh: check_out lama 2026-04-20, minta tambah 1 malam → new_check_out = 2026-04-21
  GUNAKAN tanggal check_in dan check_out dari konteks (last_booking_check_in, last_booking_check_out)

TOOLS:
- "ada kamar apa?" → get_all_rooms
- kamar+tanggal → check_availability
- data tamu lengkap (nama+email+HP+jumlah) → create_booking_draft. ⚠️ WAJIB ada guest_phone!
- cek/ubah booking → pakai data KONTEKS atau minta PMH-XXXXXX+telepon+email
- "sudah transfer" → notify_payment_proof

PEMBATALAN:
- "tidak jadi" / "batal" / "cancel" / "ga jadi" → Jika ada booking aktif (kode PMH-XXXXXX di konteks), LANGSUNG panggil cancel_booking dengan data dari konteks
- Konfirmasi pembatalan: "Booking [kode] sudah dibatalkan ya kak."
- JANGAN tanya alasan, langsung batalkan

LONG STAY: panggil notify_longstay_inquiry HANYA jika minta DISKON, bukan sekedar tanya harga 3+ malam.`;
}
