# Perbaikan Log WhatsApp & Parser Tanggal Chatbot

## Temuan dari log database

Nomor tamu `+62 819-1025-9085` mengirim 3 pesan kemarin (21:13–21:15). Hasil pengecekan database:

1. **Setiap pesan tamu membuat baris `chat_conversations` baru** (3 session berbeda: `wa_6281910259085_1778681587006`, `_1778681676245`, `_1778681710724`) padahal hanya jeda 30–90 detik.
2. **Tidak ada baris `whatsapp_sessions` untuk nomor tersebut sama sekali.** Itulah sebabnya percakapan ini "tidak masuk log" di tab WhatsApp Admin — UI WA admin membaca dari `whatsapp_sessions`.
3. Jawaban bot salah:
   - "12-13 Juni" → bot baca **13/06 – 14/06** (regex tangkap angka terakhir saja, lalu +1 malam default).
   - Koreksi tamu "12-13 kak bukan 13-14" → bot baca **12/01/2027** (regex `dd-mm` menangkap `12-13` sebagai tgl 12 bulan 13 → Date.UTC overflow ke Januari tahun depan).

## Akar masalah

### Masalah 1 — Session WA tidak pernah ter-create saat alur booking
File: `supabase/functions/whatsapp-webhook/agents/booking.ts`

Agent FAQ, priceList, fullHouse, dan manager semua memanggil `updateSession(...)` setelah balas. **Booking agent tidak.** Jadi:
- Baris di `whatsapp_sessions` tidak pernah di-upsert untuk tamu yang langsung tanya availability.
- Lookup `session.conversation_id` di orchestrator selalu `null` → `ensureConversation` bikin `chat_conversations` baru tiap pesan masuk.
- Tab WhatsApp Sessions admin kosong untuk tamu tersebut.

### Masalah 2 — Parser tanggal di `booking.ts` tidak handle range
File: `supabase/functions/whatsapp-webhook/agents/booking.ts` (fungsi `parseDateFrom`)

- Regex `(\d{1,2})\s*(jan|...)` cuma tangkap satu angka sebelum nama bulan. Untuk "12-13 Juni" yang ke-match adalah "13 Juni".
- Regex fallback `(\d{1,2})[\/-](\d{1,2})` menangkap "12-13" tanpa validasi `month ∈ 1..12`, sehingga bulan 13 di-overflow Date.UTC menjadi Januari tahun depan.
- Tidak ada deteksi pola range `dd-dd <bulan>` atau `dd <bulan> - dd <bulan>` yang akan menentukan check-in & check-out langsung dari tamu, sehingga tetap pakai default `nights = 1`.

## Rencana perbaikan

### Fix 1 — Pasang `updateSession` di booking agent
Di `supabase/functions/whatsapp-webhook/agents/booking.ts`, tambahkan import `updateSession` dan panggil sebelum return di **setiap jalur balasan** (awaiting_date, available, full house, error). Konsisten dengan `agents/faq.ts:99`. Ini memastikan:
- `whatsapp_sessions` row ter-upsert (phone, conversation_id, last_message_at, is_active, session_type='guest').
- Pesan tamu berikutnya akan reuse `conversation_id` yang sama → log percakapan utuh dalam satu thread.

### Fix 2 — Parser tanggal range yang benar
Di `parseDateFrom` (atau fungsi baru `parseDateRangeFrom`) di `booking.ts`:

1. **Tambah pola range eksplisit, dicek dulu sebelum pola single:**
   - `(\d{1,2})\s*[-–/]\s*(\d{1,2})\s*(jan|feb|mar|apr|mei|jun|jul|agt|agu|ags|sep|okt|nov|des)[a-z]*\s*(\d{4})?` → check-in = hari1, check-out = hari2.
   - `(\d{1,2})\s*(jan|...)\s*[-–]\s*(\d{1,2})\s*(jan|...)\s*(\d{4})?` → range dengan dua bulan berbeda.
   - `(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\s*[-–]\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})` → range numerik penuh.
2. **Validasi `month ∈ 1..12` dan `day ∈ 1..31`** di pola `dd-mm` numerik supaya "12-13" tanpa konteks bulan **tidak** diparse sebagai tanggal valid (return null, lanjut cek pola lain atau tanya ulang).
3. **Auto-roll year** kalau hasilnya di masa lalu (sudah ada untuk pola single, terapkan juga ke range).
4. Ubah signature jadi return `{ checkIn, checkOut } | null` ketika range terdeteksi, lalu pakai itu untuk override `nights` default. Kalau cuma single date yang ke-detect, behavior lama tetap (`nights = 1` atau dari "X malam").
5. Tambah unit test di `supabase/functions/whatsapp-webhook/agents/` untuk:
   - "12-13 Juni" → 12/06 – 13/06
   - "12 Juni - 13 Juni 2026" → 12/06 – 13/06 (sudah work, regression guard)
   - "12-13 kak bukan 13-14" (tanpa nama bulan) → null (jangan tebak)
   - "13/06/2026 - 15/06/2026" → 13/06 – 15/06

### Fix 3 (opsional, cepat) — Guard angka tahun di pola dd-mm
Tambahkan `if (month < 1 || month > 12) return null;` setelah parse pola `(\d{1,2})[\/-](\d{1,2})` untuk hindari overflow Date.UTC ke tahun depan walaupun fix 2 sudah cover.

## File yang akan disentuh

- `supabase/functions/whatsapp-webhook/agents/booking.ts` (fix 1, 2, 3)
- `supabase/functions/whatsapp-webhook/agents/booking.test.ts` (baru, tes parser tanggal)

## Catatan

- Tidak menyentuh `messageBatcher` — perilakunya benar, batasan 5 detik memang melebihi jeda 30 detik antar pesan tamu ini.
- Tidak mengubah skema database.
- Setelah deploy, percakapan baru dari nomor manapun yang masuk via alur booking akan otomatis muncul di tab WhatsApp Sessions admin sebagai satu thread berkelanjutan.
