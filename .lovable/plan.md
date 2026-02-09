

# Integrasi Payment Gateway Duitku

## Ringkasan
Menambahkan Duitku sebagai payment gateway sehingga tamu hotel dapat membayar booking secara online melalui Virtual Account, QRIS, E-Wallet, dan metode pembayaran lainnya yang tersedia di Duitku.

## Alur Pembayaran

```text
Tamu Booking --> Konfirmasi --> Pilih Metode Bayar --> Redirect ke Duitku --> Bayar --> Callback Update Status --> Redirect Kembali
```

**Alur Detail:**
1. Tamu mengisi form booking dan klik "Konfirmasi"
2. Sistem membuat booking dengan status `pending` dan `payment_status: unpaid`
3. Tamu diarahkan ke halaman pilih pembayaran (Duitku atau transfer manual)
4. Jika pilih Duitku: sistem memanggil edge function yang membuat transaksi ke Duitku API
5. Tamu diarahkan ke halaman pembayaran Duitku
6. Setelah bayar, Duitku mengirim callback ke webhook untuk update status
7. Tamu di-redirect kembali ke halaman konfirmasi pembayaran berhasil

## Komponen yang Akan Dibuat/Diubah

### 1. Setup Secrets (Duitku API Key)
- Menyimpan `DUITKU_MERCHANT_CODE` dan `DUITKU_API_KEY` sebagai secrets
- Digunakan oleh edge functions untuk komunikasi dengan Duitku API

### 2. Database: Tabel `payment_transactions`
Tabel baru untuk menyimpan riwayat transaksi pembayaran:
- `id` (UUID, primary key)
- `booking_id` (UUID, FK ke bookings)
- `merchant_order_id` (text, unique - format: `PMH-{booking_code}-{timestamp}`)
- `duitku_reference` (text - reference dari Duitku)
- `payment_method` (text - kode metode bayar: VC, BK, M1, dll)
- `payment_method_name` (text - nama metode: "Bank BCA VA", "QRIS", dll)
- `amount` (numeric)
- `status` (text: pending/paid/failed/expired/cancelled)
- `payment_url` (text - URL redirect ke Duitku)
- `callback_data` (jsonb - raw callback dari Duitku)
- `expires_at` (timestamptz)
- `paid_at` (timestamptz)
- `created_at` / `updated_at`

RLS: Public read untuk booking owner (by booking_id), service role untuk insert/update.

### 3. Edge Function: `duitku-create-transaction`
Membuat transaksi pembayaran di Duitku:
- Menerima `booking_id` dan `payment_method`
- Mengambil data booking dari database
- Membuat signature MD5 sesuai Duitku API
- Memanggil Duitku API `v2/inquiry` (sandbox/production)
- Menyimpan response ke `payment_transactions`
- Mengembalikan `payment_url` untuk redirect tamu

### 4. Edge Function: `duitku-callback`
Webhook endpoint untuk menerima notifikasi pembayaran dari Duitku:
- Memvalidasi signature callback
- Update status di `payment_transactions`
- Jika berhasil (`00`): Update `bookings.payment_status` ke `paid`, `bookings.payment_amount` ke full amount
- Kirim notifikasi WhatsApp ke manager (reuse existing `send-whatsapp`)

### 5. Edge Function: `duitku-check-status`
Untuk mengecek status pembayaran secara manual:
- Memanggil Duitku API `transactionStatus`
- Update database sesuai response terbaru

### 6. Edge Function: `duitku-payment-methods`
Mengambil daftar metode pembayaran aktif dari Duitku:
- Memanggil Duitku API `getpaymentmethod`
- Mengembalikan list metode bayar beserta fee dan gambar

### 7. Halaman Payment: `/payment/:bookingId`
Halaman public (tanpa login) untuk memilih dan melakukan pembayaran:
- Menampilkan ringkasan booking (nama, kamar, tanggal, total)
- Menampilkan opsi pembayaran:
  - **Duitku**: Grid metode pembayaran (VA, QRIS, E-Wallet) dengan logo dan fee
  - **Transfer Manual**: Info rekening bank (existing feature)
- Setelah pilih metode Duitku dan klik bayar, redirect ke Duitku payment page

### 8. Halaman Payment Status: `/payment/:bookingId/status`
Halaman return setelah pembayaran:
- Cek status pembayaran real-time
- Tampilkan status: berhasil / pending / gagal
- Tombol kembali ke halaman utama

### 9. Update Booking Flow
- **BookingDialog**: Setelah booking sukses, tampilkan tombol "Bayar Sekarang" yang redirect ke `/payment/:bookingId`
- **useBooking hook**: Setelah sukses create booking, sertakan booking ID di response untuk redirect

## Detail Teknis

### Duitku API Endpoints (Sandbox)
- **Create Transaction**: `POST https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry`
- **Check Status**: `POST https://sandbox.duitku.com/webapi/api/merchant/transactionStatus`
- **Get Payment Methods**: `POST https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod`

### Signature Generation
```text
Signature (Create) = MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
Signature (Callback) = MD5(merchantCode + paymentAmount + merchantOrderId + apiKey)
Signature (Check Status) = MD5(merchantCode + merchantOrderId + apiKey)
```

### File Baru
- `supabase/functions/duitku-create-transaction/index.ts`
- `supabase/functions/duitku-callback/index.ts`
- `supabase/functions/duitku-check-status/index.ts`
- `supabase/functions/duitku-payment-methods/index.ts`
- `src/pages/public/Payment.tsx`
- `src/pages/public/PaymentStatus.tsx`
- `src/hooks/useDuitkuPayment.tsx`

### File yang Diubah
- `src/App.tsx` - Tambah routes `/payment/:bookingId` dan `/payment/:bookingId/status`
- `src/hooks/useBooking.tsx` - Return booking ID setelah sukses untuk redirect
- `src/components/BookingConfirmationDialog.tsx` - Tambah tombol "Bayar Sekarang"
- Database migration untuk tabel `payment_transactions`

### Keamanan
- Callback endpoint memvalidasi signature MD5 dari Duitku
- Tabel `payment_transactions` dilindungi RLS (read-only untuk anonymous by booking_id)
- API keys disimpan sebagai secrets, hanya diakses dari edge functions
- Tidak ada data sensitif yang di-expose ke frontend

