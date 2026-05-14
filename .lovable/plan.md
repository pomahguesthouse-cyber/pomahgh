# Seleksi Training Berbasis Semantic Similarity

Mengganti seleksi keyword-kategori (`detectCategory` + filter manual) di `supabase/functions/chatbot/services/exampleSelector.ts` dengan ranking cosine similarity menggunakan **pgvector** + embeddings dari **OpenAI `text-embedding-3-small`** (1536-dim, key `OPENAI_API_KEY` sudah tersedia).

## Mengapa OpenAI embeddings, bukan Lovable AI Gateway

Lovable AI Gateway saat ini hanya melayani chat/image — **tidak ada endpoint embeddings**. Project sudah punya `OPENAI_API_KEY`, jadi panggil `https://api.openai.com/v1/embeddings` langsung dari edge function. Murah (~$0.02 / 1M token) dan stabil.

## Perubahan database (1 migrasi)

1. `CREATE EXTENSION IF NOT EXISTS vector;`
2. Tambah kolom ke `chatbot_training_examples`:
   - `embedding vector(1536)`
   - `embedding_source text` (gabungan `question + ideal_answer` yang dipakai saat embed, untuk deteksi staleness)
3. Index IVFFlat: `CREATE INDEX ON chatbot_training_examples USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);`
4. RPC `match_training_examples(query_embedding vector(1536), match_count int, min_similarity float)` — SECURITY DEFINER, return top-N dengan `(1 - (embedding <=> query)) AS similarity`, hanya `is_active=true`.
5. Trigger `BEFORE UPDATE` yang me-null-kan `embedding` bila `question` atau `ideal_answer` berubah (auto-stale).

## Edge function baru: `embed-training-examples`

- Input: opsional `{ ids?: string[], force?: boolean }`. Default: ambil semua row dengan `embedding IS NULL`.
- Batch 50 per panggilan ke OpenAI, retry sederhana, update kolom `embedding` + `embedding_source`.
- Auth: hanya admin (cek `user_roles` role=`admin`) atau via `CHATBOT_TOOLS_INTERNAL_SECRET` header.
- Dipanggil otomatis dari frontend setelah create/update training example (fire-and-forget) + tombol "Re-embed semua" di tab admin Training.

## Perubahan di guest chatbot (`supabase/functions/chatbot`)

1. `services/dataLoader.ts` — **hapus** preload `trainingExamples` dari `loadHotelData` (karena sekarang query per turn). Tetap load lainnya yang masih relevan.
2. `services/exampleSelector.ts`:
   - Tambah `selectRelevantExamplesSemantic(userMessage, supabase)`:
     - Embed `userMessage` via OpenAI (cache LRU sederhana: 5 menit, key=lowercased message).
     - Panggil RPC `match_training_examples(emb, 6, 0.55)`.
     - Fallback ke seleksi keyword lama bila embedding gagal / tidak ada hasil ≥ threshold.
3. `ai/promptBuilder.ts` — terima `relevantExamples` dari semantic selector (signature jadi async). Naikkan limit dari 4 → **6** karena ranking sudah lebih akurat.
4. Tambah log ringkas: `🎯 semantic match: 4/6 ≥ 0.55, top sim=0.82`.

## Perubahan di `admin-chatbot`

Sama: gabung `admin_chatbot_training_examples` + `chatbot_training_examples` (perlu kolom `embedding` di tabel admin juga — masuk ke migrasi yang sama). RPC kedua: `match_admin_training_examples`.

## UI admin (`AdminTrainingTab.tsx`)

- Tambah badge "Embedded ✓ / Pending" per row (dari `embedding IS NULL`).
- Tombol header "Embed semua yang tertunda" → `supabase.functions.invoke('embed-training-examples')`.
- Setelah save form, panggil embed function untuk row tsb.

## Backfill awal

Setelah migrasi disetujui, panggil sekali `embed-training-examples` tanpa filter untuk mengisi semua baris existing.

## File yang berubah

```
+ supabase/migrations/<ts>_training_embeddings.sql
+ supabase/functions/embed-training-examples/index.ts
~ supabase/functions/chatbot/services/dataLoader.ts
~ supabase/functions/chatbot/services/exampleSelector.ts
~ supabase/functions/chatbot/ai/promptBuilder.ts
~ supabase/functions/admin-chatbot/index.ts
~ supabase/functions/admin-chatbot/lib/knowledgeContext.ts (semantic version of buildTrainingContext)
~ src/components/admin/AdminTrainingTab.tsx (badge + tombol)
~ src/hooks/useAdminTrainingExamples.tsx (trigger embed setelah save)
```

## Risiko & mitigasi

- **Latensi tambahan ~150-300ms** untuk embed query → cache + fallback paralel.
- **Biaya OpenAI** kecil (text-embedding-3-small ~$0.00002/turn) tapi tetap dipantau.
- **IVFFlat lists=50** cocok untuk <10k baris; bila tumbuh besar, tuning ulang.
- **Stale embedding** ditangani trigger auto-null + UI badge.

Setelah Anda approve, saya jalankan migrasi dulu lalu kode.
