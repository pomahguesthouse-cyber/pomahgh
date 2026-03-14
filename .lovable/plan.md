

# Plan: Simpan Nama Tamu di Log WhatsApp

## Kondisi Saat Ini
- Kolom `guest_name` sudah ada di tabel `whatsapp_sessions` (migration sebelumnya)
- UI (`SessionRow.tsx`) sudah menampilkan `guest_name` jika ada
- Tapi **tidak pernah diisi** — webhook tidak menanyakan atau menyimpan nama

## Yang Akan Dibangun

### 1. Alur Tanya Nama di Sesi Baru
Saat sesi WhatsApp baru dimulai (session baru atau session expired), chatbot akan **menanyakan nama terlebih dahulu** sebelum melanjutkan percakapan. Alurnya:

```text
Guest: "Halo"
Bot: "Halo! 👋 Selamat datang di Pomah Guesthouse. Boleh saya tahu nama Anda?"
Guest: "Budi"
Bot: "Terima kasih, Kak Budi! Ada yang bisa saya bantu?" 
→ guest_name = "Budi" disimpan ke whatsapp_sessions
```

### 2. Perubahan di `whatsapp-webhook/index.ts`

**Logika deteksi nama:**
- Ketika sesi baru (belum ada `guest_name` dan belum ada riwayat pesan), kirim pesan sapaan + tanya nama, tandai session sebagai `awaiting_name = true`
- Ketika pesan berikutnya masuk dan session `awaiting_name = true`, simpan isi pesan sebagai `guest_name` di `whatsapp_sessions`, lalu lanjutkan ke AI seperti biasa
- Jika sesi sudah punya `guest_name`, langsung proses seperti biasa

**Perubahan spesifik:**
- Tambah logika setelah pengecekan session expired/baru (sekitar line 731)
- Jika sesi baru & belum ada nama → kirim sapaan + tanya nama, simpan session dengan flag
- Jika flag aktif → pesan ini adalah nama, simpan, balas konfirmasi + tanya kebutuhan

### 3. Database Migration
- Tambah kolom `awaiting_name` (boolean, default false) di `whatsapp_sessions` untuk tracking state

### 4. Juga Simpan ke `chat_conversations`
- Saat nama didapat, update juga `guest_email` field di `chat_conversations` dengan format `"Nama (WA: phone)"` agar terlihat di log percakapan admin

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | Tambah logika tanya nama di awal sesi baru |
| Database migration | Tambah kolom `awaiting_name` di `whatsapp_sessions` |

Tidak perlu ubah UI karena `SessionRow.tsx` sudah menampilkan `guest_name`.

