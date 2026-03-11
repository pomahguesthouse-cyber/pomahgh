

## Plan: Form Koneksi OTA Booking.com

### Masalah Saat Ini
Kredensial Booking.com (Username, Password, Hotel ID) disimpan sebagai secrets yang hanya bisa diubah oleh developer. Admin tidak punya cara untuk mengelola koneksi OTA dari UI.

### Solusi
Buat tabel database `ota_connections` untuk menyimpan konfigurasi koneksi OTA, lalu tambahkan form koneksi di BookingcomSyncPanel.

### Perubahan

**1. Database Migration**
- Tabel baru `ota_connections` dengan kolom: `id`, `provider` (enum: booking_com, agoda, traveloka, dll), `hotel_id`, `username`, `password_encrypted`, `api_endpoint`, `is_active`, `is_connected`, `last_tested_at`, `created_at`, `updated_at`
- RLS: admin-only untuk semua operasi
- Satu row per provider (unique constraint on provider)

**2. Update Edge Functions**
- `bookingcom-push-availability` dan `bookingcom-pull-reservations`: baca kredensial dari tabel `ota_connections` (fallback ke env vars untuk backward compatibility)

**3. Komponen UI: OTA Connection Form**
- Card "Koneksi OTA" di bagian atas BookingcomSyncPanel
- Form fields: Hotel ID, Username, Password
- Tombol "Test Koneksi" untuk verifikasi kredensial
- Status badge (Connected/Disconnected)
- Simpan/update ke tabel `ota_connections`

**4. File yang Diubah**
- `supabase/migrations/` — tabel `ota_connections`
- `src/components/admin/BookingcomSyncPanel.tsx` — tambah connection form card
- `supabase/functions/bookingcom-push-availability/index.ts` — baca dari DB
- `supabase/functions/bookingcom-pull-reservations/index.ts` — baca dari DB

