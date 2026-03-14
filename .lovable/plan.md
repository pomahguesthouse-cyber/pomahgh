

# Plan: Menggunakan Resend.com untuk Pengiriman Email Invoice

## Ringkasan
Mengganti sistem pengiriman email saat ini (email queue internal) dengan Resend.com API langsung di edge function `generate-invoice`. Ini akan membuat pengiriman email lebih sederhana dan reliable.

## Langkah-langkah

### 1. Simpan Resend API Key sebagai Secret
- Menyimpan `RESEND_API_KEY` sebagai secret yang aman di backend (bukan di kode)

### 2. Update Edge Function `generate-invoice`
- Mengganti bagian pengiriman email yang menggunakan `supabase.rpc('enqueue_email', ...)` dengan panggilan langsung ke Resend API (`https://api.resend.com/emails`)
- Menggunakan `RESEND_API_KEY` dari environment variable
- Sender email: `noreply@notify.pomahguesthouse.com` (domain yang sudah dikonfigurasi)
- Mengirim invoice HTML sebagai body email

### 3. Deploy ulang Edge Function
- Deploy `generate-invoice` dan test untuk memastikan email terkirim

## Perubahan File
- `supabase/functions/generate-invoice/index.ts` — ganti logika email dari queue ke Resend API

