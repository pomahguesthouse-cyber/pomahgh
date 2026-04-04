

# Perbaikan Performa Analisa Log WhatsApp - Guest Chatbot

## Temuan Masalah

Dari analisis edge function logs dan database schema, ditemukan **2 bug kritis** yang menyebabkan analisa log **gagal total**:

### Bug 1: Kolom `auto_generated` tidak ada
Mode `analyze_logs` (baris 464) menyisipkan field `auto_generated: true` ke tabel `chatbot_training_examples`, tapi kolom ini **tidak ada** di tabel. Error ini muncul berulang di logs.

### Bug 2: Kolom `answer` tidak ada  
Mode `generate_for_category` (baris 249) menyisipkan field `answer` padahal kolom sebenarnya bernama `ideal_answer`. Juga menyisipkan field `tags` yang tidak ada di tabel.

### Dampak
- **210 percakapan WhatsApp** belum teranalisis (dari 280 total)
- Hanya **10 training examples** berhasil tersimpan (kemungkinan dari sebelum bug muncul)
- Setiap kali analisis dijalankan, semua insert gagal → data training tidak bertambah

---

## Rencana Perbaikan

### 1. Tambah kolom `auto_generated` dan `source` yang hilang
Migrasi database untuk menambahkan kolom `auto_generated` (boolean, default false) ke tabel `chatbot_training_examples`.

### 2. Fix mode `generate_for_category` 
- Ganti `answer` → `ideal_answer`
- Hapus field `tags` (kolom tidak ada, gunakan `response_tags` jika perlu)

### 3. Fix mode `analyze_logs`
Pastikan semua field yang di-insert sesuai dengan schema tabel (sudah benar menggunakan `ideal_answer`, tapi perlu memastikan `auto_generated` tersedia setelah migrasi).

### 4. Deploy ulang edge function

---

## Detail Teknis

**File yang diubah:**
- `supabase/functions/ai-training-generator/index.ts` — fix field mapping di 2 tempat
- Database migration — tambah kolom `auto_generated`

**Perubahan kode (baris 245-255):**
```typescript
// BEFORE (broken)
{ question, answer, category, tags, is_active: false, auto_generated: true, display_order }

// AFTER (fixed)
{ question, ideal_answer: answer, category, is_active: false, source: 'ai_generated', display_order }
```

**Perubahan kode (baris 456-466):**
```typescript
// analyze_logs mode - hapus auto_generated jika kolom tidak ditambahkan
// atau tetap gunakan setelah migrasi menambahkan kolom
```

