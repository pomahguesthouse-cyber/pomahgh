
# Web Voice Agent - Voice Chat di Website

## Ringkasan
Menambahkan fitur voice chat real-time di website hotel menggunakan ElevenLabs untuk Speech-to-Text (STT) dan Text-to-Speech (TTS), digabungkan dengan AI chatbot hotel yang sudah ada. Tamu bisa bicara langsung dan mendapat balasan suara dari asisten AI hotel.

## Cara Kerja

Alur interaksi:
1. Tamu klik tombol "Voice Chat" di website
2. Tamu bicara melalui mikrofon
3. Suara dikonversi ke teks (ElevenLabs STT)
4. Teks dikirim ke chatbot AI hotel yang sudah ada (sudah punya semua fitur booking, cek kamar, dll)
5. Jawaban AI dikonversi ke suara (ElevenLabs TTS)
6. Tamu mendengar jawaban dalam bentuk suara

Pendekatan ini memanfaatkan ulang seluruh logika chatbot yang sudah ada (termasuk tool cek ketersediaan, booking, dsb) tanpa perlu konfigurasi ulang.

## Langkah Implementasi

### Langkah 1: Hubungkan ElevenLabs
- Link koneksi ElevenLabs yang sudah ada di workspace ke project ini
- Secret `ELEVENLABS_API_KEY` akan otomatis tersedia di backend

### Langkah 2: Buat Backend Functions

**Edge Function: `elevenlabs-tts`**
- Menerima teks dari frontend
- Memanggil ElevenLabs TTS API untuk menghasilkan audio
- Menggunakan voice Indonesia/ramah (bisa dipilih)
- Mengembalikan audio MP3 ke frontend

**Edge Function: `elevenlabs-stt-token`**
- Generate single-use token untuk realtime STT
- Token dipakai oleh frontend untuk koneksi WebSocket ke ElevenLabs

### Langkah 3: Buat Komponen Voice Chat

**Komponen `VoiceChatButton`**
- Tombol floating "Voice Chat" di website (di samping tombol chatbot text)
- Saat diklik, buka modal voice chat

**Komponen `VoiceChatModal`**
- UI modal dengan animasi gelombang suara
- Tombol mikrofon push-to-talk atau toggle
- Status indicator: mendengarkan / memproses / menjawab
- Tampilkan transkrip percakapan (teks kecil di bawah)
- Tombol tutup/akhiri sesi

**Hook `useVoiceChat`**
- Menggunakan `useScribe` dari `@elevenlabs/react` untuk realtime STT
- Setelah mendapat transkrip, kirim ke edge function chatbot yang sudah ada
- Terima jawaban teks dari chatbot
- Kirim teks jawaban ke edge function `elevenlabs-tts`
- Play audio respons otomatis
- Kelola state: idle, listening, processing, speaking

### Langkah 4: Integrasi ke Website
- Tambahkan tombol voice chat di sebelah chatbot widget yang sudah ada
- Aksesibel dari semua halaman (termasuk landing page)

## Detail Teknis

### Dependensi Baru
- `@elevenlabs/react` - SDK untuk realtime STT (useScribe hook)

### File yang Akan Dibuat
1. `supabase/functions/elevenlabs-tts/index.ts` - Edge function TTS
2. `supabase/functions/elevenlabs-stt-token/index.ts` - Edge function token STT
3. `src/hooks/useVoiceChat.ts` - Hook untuk voice chat logic
4. `src/components/VoiceChatButton.tsx` - Tombol floating voice
5. `src/components/VoiceChatModal.tsx` - Modal UI voice chat

### File yang Akan Diedit
1. `src/App.tsx` atau layout utama - Tambahkan VoiceChatButton
2. `supabase/config.toml` - Register edge functions baru (otomatis)

### Alur Data Teknis

```text
[Mikrofon Tamu]
      |
      v
[ElevenLabs Realtime STT] -- WebSocket --> Transkrip Teks
      |
      v
[Edge Function: chatbot] -- Chatbot AI + Tools --> Jawaban Teks
      |
      v
[Edge Function: elevenlabs-tts] -- ElevenLabs API --> Audio MP3
      |
      v
[Browser Audio Playback] --> Tamu Mendengar Jawaban
```

### Voice yang Digunakan
- Default: Sarah (EXAVITQu4vr4xnSDxMaL) - suara ramah dan natural
- Bisa dikonfigurasi di chatbot settings nanti

### Penanganan Error
- Jika mikrofon ditolak: tampilkan pesan minta izin
- Jika STT gagal: fallback ke input teks
- Jika TTS gagal: tampilkan jawaban sebagai teks saja
- Rate limit (429) dan credit habis (402): tampilkan pesan yang jelas
