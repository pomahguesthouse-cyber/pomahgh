

# Plan: AI Chatbot Belajar dari Log Percakapan WhatsApp

## Analisis Kondisi Saat Ini
Sistem sudah memiliki:
- **Manual promote**: Admin bisa klik "Jadikan Contoh" per pesan di ChatLogsTab (rating ≥ 4)
- **Training examples**: Disimpan di `chatbot_training_examples` dan diinjeksi ke system prompt AI
- **Chat logs**: Semua percakapan WhatsApp & web tersimpan di `chat_conversations` + `chat_messages`

Yang belum ada: **fitur bulk/otomatis** untuk mengekstrak pola Q&A berkualitas dari log WhatsApp dan menjadikannya training examples.

## Fitur yang Akan Dibangun

### 1. Edge Function `extract-training-data`
Backend function yang menggunakan AI (Lovable AI) untuk menganalisis log percakapan WhatsApp dan mengekstrak pasangan Q&A berkualitas tinggi secara otomatis.

**Alur kerja:**
- Ambil percakapan WhatsApp terbaru yang belum dianalisis (session_id dimulai `wa_`)
- Kirim batch percakapan ke AI dengan instruksi mengekstrak Q&A terbaik
- AI mengembalikan structured output (tool calling) berisi pasangan question/answer/category
- Simpan hasil ke `chatbot_training_examples` dengan status `is_active = false` (draft, butuh approval admin)
- Tandai percakapan yang sudah dianalisis

### 2. Database Migration
- Tambah kolom `analyzed_for_training` (boolean, default false) di `chat_conversations` untuk tracking
- Tambah kolom `source` (text, default 'manual') di `chatbot_training_examples` untuk membedakan manual vs auto-extracted

### 3. UI Admin: Tab "Auto-Learn" di Chatbot Settings
Tombol "Analisis Percakapan WhatsApp" yang:
- Menjalankan edge function `extract-training-data`
- Menampilkan hasil ekstraksi sebagai draft
- Admin bisa approve/reject/edit setiap contoh sebelum diaktifkan
- Menampilkan statistik: berapa percakapan dianalisis, berapa contoh diekstrak

## Perubahan File

| File | Perubahan |
|------|-----------|
| `supabase/functions/extract-training-data/index.ts` | **Baru** — Edge function untuk analisis log dengan AI |
| `supabase/config.toml` | Tambah konfigurasi function baru |
| `src/components/admin/TrainingTab.tsx` atau file terkait | Tambah section "Auto-Learn dari WhatsApp" dengan tombol analisis dan daftar draft |
| `src/hooks/useTrainingExamples.tsx` | Tambah hook untuk trigger extraction dan manage drafts |
| Database migration | Tambah kolom `analyzed_for_training` dan `source` |

## Detail Teknis

### Edge Function Logic
```text
1. Query chat_conversations WHERE session_id LIKE 'wa_%' AND analyzed_for_training = false
2. Untuk setiap conversation, ambil chat_messages
3. Kirim ke Lovable AI (gemini-2.5-flash) dengan prompt:
   "Analisis percakapan ini. Ekstrak pasangan Q&A yang bagus untuk melatih chatbot hotel."
4. Gunakan tool calling untuk structured output (question, answer, category)
5. Insert ke chatbot_training_examples (is_active = false, source = 'auto_whatsapp')
6. Update chat_conversations SET analyzed_for_training = true
```

### UI Flow
```text
Admin Panel → Chatbot → Training Tab
  ├── [Tombol] "Analisis Log WhatsApp" → trigger edge function
  ├── Draft Examples (is_active = false, source = 'auto_whatsapp')
  │   ├── Preview Q&A
  │   ├── Edit question/answer
  │   ├── [Approve] → set is_active = true
  │   └── [Reject] → delete
  └── Stats: X percakapan dianalisis, Y contoh diekstrak
```

