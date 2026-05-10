
## Apa yang terjadi pada tamu 6282226749990 (IIN)

Log percakapan jam 02:03–02:04 WIB hari ini:

```
[system] reset_past_checkout — memory di-reset
[user] "ya booking"
[bot] "Booking PMH-LWUVX3 untuk Deluxe tanggal 30 April – 1 Mei 2026. Total Rp 600.000."
```

Faktanya di DB, booking yang dibuat justru:
- `PMH-LWUVX3` Deluxe **2026-05-30 → 2026-06-01** (2 malam, Rp 600.000)
- Tapi pesan ke tamu menulis **30 April – 1 Mei 2026** (tanggal yang sudah lewat)

Tamu hanya mengetik dua kata "ya booking" — tidak pernah menerima draft konfirmasi, tidak pernah disebutkan tanggal/kamar, langsung dibuatkan booking dengan data lama.

## Root cause (3 lapis bug)

1. **Ghost booking context.** `getLatestBookingContextByPhone` (services/context.ts) menarik booking terakhir non-cancelled tanpa cek apakah `check_out` sudah lewat. Tamu ini punya `PMH-QCQCV9` (Deluxe, 2026-04-30 → 2026-05-01, `pending_payment` sejak 17 April, tidak pernah ke-cancel karena `payment_expires_at` NULL). Setiap pesan baru, konteks ini dimuat sebagai `last_booking_*` + alias `preferred_room`, `check_in_date`, `check_out_date` → AI mengira tamu sedang melanjutkan booking lama.

2. **Memory reset tidak mencegah re-load DB.** Orchestrator mendeteksi `pastCheckout` lalu membuat conversation baru, tapi `buildBookingContext` tetap memanggil `getLatestBookingContextByPhone` → konteks basi dimuat ulang. Reset memory praktis tidak berarti.

3. **`validateAndFixDate` diam-diam menggeser tanggal.** Saat AI memanggil `create_booking_draft` dengan `check_in=2026-04-30 / check_out=2026-05-01` (dari context basi), tool diam-diam shift ke `2026-05-30 / 2026-06-01`, insert booking, dan kembalikan sukses. AI kemudian membuat balasan teks pakai tanggal asli (yang sudah lewat) karena tidak tahu tanggal sudah dikoreksi. Tamu menerima tanggal salah.

Tambahan: `auto_cancel_expired_bookings` hanya jalan kalau `payment_expires_at` terisi. PMH-QCQCV9 dibuat tanpa expiry → terus jadi zombie.

## Yang akan diperbaiki

### A. Filter konteks booking — wajib aktif (file: `supabase/functions/whatsapp-webhook/services/context.ts`)

`getLatestBookingContextByPhone` hanya mengembalikan booking yang:
- `status IN ('pending_payment','confirmed','checked_in')` **dan**
- `check_out >= today (WIB)`

Jika tidak ada booking aktif → return `null`. Alias `preferred_room`, `check_in_date`, `check_out_date` hanya diisi kalau booking benar-benar aktif (bukan zombie pending_payment dari bulan lalu).

### B. Skip context load saat `pastCheckout` reset (file: `supabase/functions/whatsapp-webhook/agents/orchestrator.ts` + tempat panggil context)

Saat `isNewSession && pastCheckout`, lewati `getLatestBookingContextByPhone` untuk request itu — jangan re-load apapun ke memory yang baru di-reset. Tamu mulai dari nol.

### C. Hentikan silent date-shift di booking creation (file: `supabase/functions/chatbot-tools/lib/dateUtils.ts` + `tools/createBookingDraft.ts`)

`validateAndFixDate` diberi mode strict. Untuk `createBookingDraft` (dan juga `updateBooking` saat `new_check_in/out` di masa lalu):
- Jika tanggal di masa lalu → **lempar error** dengan pesan: `Tanggal check-in/out sudah lewat. Mohon konfirmasi ulang tanggal yang benar dengan tamu.`
- AI menerima error, harus tanya ulang ke tamu — tidak boleh insert booking dengan tanggal hasil tebakan.

`checkAvailability` boleh tetap auto-shift (mode loose) karena hanya untuk lihat-lihat, tidak menulis ke DB; tapi response harus menyertakan `date_corrected: true` + tanggal asli vs tanggal aktual yang dicek, supaya AI tahu harus mengoreksi narasi.

### D. Patch isi prompt booking agent (file: `supabase/functions/chatbot/agents/bookingPrompt.ts`)

Tambah aturan eksplisit:
- **JANGAN** anggap pesan singkat tamu ("ya", "ok", "lanjut", "ya booking") sebagai konfirmasi draft jika di percakapan turn ini belum ada draft summary yang ditampilkan oleh agent.
- Sebelum `create_booking_draft`, draft summary (Nama/Email/HP/Kamar/Check-in/Check-out/Total) **WAJIB** sudah dikirim di pesan asisten sebelumnya pada conversation aktif. Kalau memory baru di-reset → kumpulkan ulang data dari awal.

### E. Cleanup zombie `PMH-QCQCV9` (one-off SQL, bukan migration)

Update booking ini ke `cancelled` dengan reason `Stale unpaid — auto-cleanup` supaya tidak terus mencemari konteks tamu lain. Akan saya tampilkan SQL-nya untuk approve sebelum dijalankan.

### F. Backstop: `payment_expires_at` wajib terisi saat booking via chatbot

Audit cepat di `createBookingDraft` insert payload — pastikan field `payment_expires_at` selalu di-set (mis. `now() + 1 hour`) sehingga `auto_cancel_expired_bookings` cron bisa membersihkan zombie ke depan. Kalau ternyata sudah di-set dan PMH-QCQCV9 anomali, cukup catat saja.

## Yang TIDAK diubah

- Logika orchestrator routing (intent, batching, dedup) — sudah benar mengirim ke booking agent.
- `is_admin` / RLS / auth.
- UI dashboard.
- File chatbot prompt lain selain bookingPrompt.

## Verifikasi setelah patch

1. Unit test `validateAndFixDate` strict mode (past date → throw).
2. Unit test `getLatestBookingContextByPhone` (zombie booking → null).
3. Smoke test manual via WhatsApp dari nomor 6282226749990:
   - Kirim "ya booking" → bot harus minta data lengkap (bukan auto-create).
   - Kirim alur lengkap "Mau booking Deluxe 25/12/2026–27/12/2026, 2 dewasa, IIN, 0822..." → bot tampilkan draft summary → tamu balas "ya" → booking tercipta dengan tanggal yang benar dan pesan konfirmasi mencantumkan tanggal yang benar.
4. Cek `bookings` baru: `payment_expires_at` terisi.

## Estimasi

~4 file kode yang diedit + 1 SQL one-off cleanup. Setelah approve plan, saya mulai dengan A → C → D → B → E → F dalam commit terpisah.
