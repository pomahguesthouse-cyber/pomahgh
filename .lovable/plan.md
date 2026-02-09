

# Tampilkan Metode Pembayaran di Checkout & Chatbot

## Ringkasan
Dua perubahan utama:
1. **Booking Checkout (Website)**: Setelah tamu konfirmasi booking, tampilkan pilihan metode pembayaran Duitku langsung di dialog konfirmasi, sebelum redirect ke halaman pembayaran.
2. **Guest Chatbot**: Tambahkan tool baru `get_payment_methods` agar chatbot bisa menampilkan opsi pembayaran kepada tamu dan mengarahkan mereka ke link pembayaran.

## Perubahan Detail

### 1. Update BookingDialog - Tampilkan Payment Methods Setelah Booking Sukses

**Alur baru:**
```text
Isi Form Booking --> Konfirmasi --> Booking Dibuat --> Tampil Metode Pembayaran --> Pilih & Redirect ke Payment Page
```

**File yang diubah:**
- `src/components/BookingDialog.tsx` - Setelah `createBooking` sukses, simpan `bookingId` dari response, lalu tampilkan `BookingConfirmationDialog` dengan tombol "Bayar Sekarang"
- `src/components/BookingConfirmationDialog.tsx` - Tambahkan tampilan daftar metode pembayaran (VA, QRIS, E-Wallet) dengan logo langsung di dialog. Tamu bisa pilih metode lalu klik "Bayar" untuk redirect ke halaman Duitku.
- `src/hooks/useBooking.tsx` - Pastikan `onSuccess` callback mengembalikan `booking.id` agar bisa digunakan untuk redirect payment

**Perubahan teknis:**
- `BookingDialog` akan menyimpan `bookingId` state setelah booking berhasil
- `BookingConfirmationDialog` sekarang menjadi dialog "Booking Berhasil + Pilih Pembayaran":
  - Fetch metode pembayaran dari `duitku-payment-methods` menggunakan `useDuitkuPayment`
  - Tampilkan grid metode bayar (dengan gambar/logo)
  - Tombol "Bayar Sekarang" memanggil `duitku-create-transaction` lalu redirect
  - Tombol alternatif "Transfer Manual" mengarah ke `/confirm-payment/:bookingId`

### 2. Tambah Tool Chatbot: `get_payment_methods`

**Tool baru di chatbot** agar AI bisa menampilkan opsi pembayaran:

**File yang diubah/dibuat:**
- `supabase/functions/chatbot-tools/tools/getPaymentMethods.ts` (baru) - Handler yang memanggil Duitku API untuk mendapatkan daftar metode pembayaran berdasarkan `booking_id` atau `amount`
- `supabase/functions/chatbot-tools/index.ts` - Tambah routing untuk tool `get_payment_methods`
- `supabase/functions/chatbot-tools/lib/types.ts` - Tambah interface `GetPaymentMethodsParams`
- `supabase/functions/chatbot/ai/tools.ts` - Tambah definisi tool `get_payment_methods` agar AI tahu kapan memanggilnya
- `supabase/functions/chatbot/ai/promptBuilder.ts` - Tambah instruksi di system prompt tentang kapan menawarkan metode pembayaran (setelah booking dibuat, atau saat tamu bertanya cara bayar)

**Definisi tool AI:**
```text
get_payment_methods:
  description: "Tampilkan metode pembayaran online (VA, QRIS, E-Wallet) untuk booking tertentu. Gunakan setelah booking berhasil dibuat atau saat tamu bertanya tentang cara pembayaran."
  parameters:
    - booking_id (string, required): Kode booking PMH-XXXXXX
    - guest_phone (string, required): Nomor telepon tamu
    - guest_email (string, required): Email tamu
```

**Logika handler:**
1. Verifikasi booking (kode + telepon + email) - reuse validasi yang sudah ada
2. Ambil `total_price` dari booking
3. Panggil Duitku API `getpaymentmethod` dengan amount tersebut
4. Return daftar metode bayar + link pembayaran (`/payment/{bookingId}`)

**Update System Prompt:**
- Setelah `create_booking_draft` berhasil, AI akan secara otomatis menawarkan opsi pembayaran
- Jika tamu bertanya "bagaimana cara bayar?" atau "metode pembayaran apa saja?", AI bisa memanggil `get_payment_methods`
- AI akan menyertakan link pembayaran: `/payment/{bookingId}`

### 3. Update Response Booking Draft

**File yang diubah:**
- `supabase/functions/chatbot-tools/tools/createBookingDraft.ts` - Tambahkan `booking_id` dan `payment_url` di response, sehingga AI bisa langsung menginformasikan link pembayaran

Response baru dari `create_booking_draft`:
```text
{
  message: "Booking berhasil! Kode: PMH-XXXXXX...",
  booking_code: "PMH-XXXXXX",
  booking_id: "uuid-here",
  payment_url: "https://pomahgh.lovable.app/payment/{bookingId}",
  ...
}
```

Dengan ini, AI bisa langsung memberikan link pembayaran setelah booking dibuat, dan juga menyebutkan metode yang tersedia (VA BCA, QRIS, OVO, dll).

### 4. Tidak Ada Perubahan Database

Semua perubahan menggunakan tabel dan struktur yang sudah ada (`payment_transactions`, `bookings`). Tidak perlu migrasi database baru.

## Rangkuman File

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/components/BookingDialog.tsx` | Edit | Simpan bookingId, tampilkan payment dialog setelah sukses |
| `src/components/BookingConfirmationDialog.tsx` | Edit | Tambah grid metode pembayaran dengan Duitku |
| `supabase/functions/chatbot-tools/tools/getPaymentMethods.ts` | Baru | Handler tool untuk fetch metode pembayaran |
| `supabase/functions/chatbot-tools/index.ts` | Edit | Tambah routing tool `get_payment_methods` |
| `supabase/functions/chatbot-tools/lib/types.ts` | Edit | Tambah interface params |
| `supabase/functions/chatbot/ai/tools.ts` | Edit | Tambah definisi tool AI |
| `supabase/functions/chatbot/ai/promptBuilder.ts` | Edit | Update prompt tentang pembayaran |
| `supabase/functions/chatbot-tools/tools/createBookingDraft.ts` | Edit | Sertakan booking_id & payment_url di response |
