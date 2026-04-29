## SEO Agent untuk Konten "Seputar Semarang"

Agen AI yang melakukan riset keyword, generate artikel SEO + thumbnail, lalu mempublish ke halaman `/explore-semarang/:slug` yang sudah ada. Memanfaatkan tabel `city_attractions` (sudah lengkap field SEO-nya) sebagai storage konten, plus tabel baru untuk pipeline keyword & log evaluasi.

### Arsitektur

```
[Admin UI: /admin/seo-agent]
        |
        v
[Riset Keyword]  --(Google Suggest via edge fn)--> keyword_pool
        |
        v
[Filter Intent]  --(rules + Lovable AI klasifikasi)--> status: qualified
        |
        v
[Generate Artikel] --(Lovable AI: gemini-2.5-pro)--> draft (title, slug, long_description, meta)
        |
        v
[Generate Thumbnail] --(gemini-3.1-flash-image-preview)--> upload ke bucket attraction-images
        |
        v
[Publish] --> insert city_attractions (is_active=false → admin review → activate)
        |
        v
[Log + Evaluasi] --> seo_agent_runs (skor SEO, readability, keyword density, status)
```

### 1. Tabel Baru (Migrasi)

**`seo_keywords`** — pool keyword + status pipeline
- `id`, `keyword` (unique), `source` (`google_suggest` / `manual` / `gsc`), `seed_keyword`, `search_volume_estimate`, `intent_category` (`accommodation` / `attraction` / `event` / `food` / `other`), `intent_score` (0-1), `status` (`new` / `qualified` / `rejected` / `generated` / `published`), `rejection_reason`, `created_at`, `processed_at`

**`seo_agent_settings`** — knob admin
- Single-row config: `seed_keywords` (text[]), `target_intents` (text[], default `['accommodation','attraction']`), `intent_threshold` (numeric default 0.6), `auto_publish` (bool, default false → wajib review), `article_min_words` (int, default 800), `article_tone`, `internal_link_targets` (text[] berisi slug rooms / landing pages untuk back-link), `model_text`, `model_image`

**`seo_agent_runs`** — log per artikel yang dihasilkan
- `id`, `keyword_id` (fk), `attraction_id` (fk nullable, terisi saat publish), `step` (`research` / `filter` / `article` / `image` / `publish`), `status` (`success` / `failed` / `skipped`), `model_used`, `tokens_used`, `cost_estimate`, `seo_score` (0-100), `readability_score`, `keyword_density`, `word_count`, `issues` (jsonb), `error_message`, `duration_ms`, `created_at`

**RLS**: semua tabel admin-only (`is_admin()`).

### 2. Edge Functions Baru

Semua di `supabase/functions/`, mengikuti pola yang sudah ada (`ai-landing-page-assist`, `chatbot-tools`).

**`seo-agent-keywords`** — POST: jalankan riset keyword
- Input: `{ seed: string, source: 'google_suggest' | 'manual', keywords?: string[] }`
- Google Suggest: fetch `https://suggestqueries.google.com/complete/search?client=firefox&hl=id&q={seed} semarang` → ambil array suggestion. Loop seed (`seed`, `seed a`, `seed b`, …, `seed z`) untuk variasi.
- Manual: langsung insert dari array `keywords`.
- Dedup by `(keyword, source)`, simpan ke `seo_keywords` status `new`.

**`seo-agent-classify`** — POST: filter intent
- Input: `{ keywordIds?: string[], limit?: number }` (default proses semua status `new`)
- Per keyword: panggil Lovable AI (`google/gemini-2.5-flash-lite`, structured output via tool calling) → `{ intent: 'accommodation'|'attraction'|...|'other', score, reasoning }`
- Hybrid: kombinasikan dengan keyword rules (regex `hotel|penginapan|guesthouse|stay|menginap|villa`) untuk bobot ekstra.
- Update status `qualified` jika `intent ∈ target_intents` & `score ≥ threshold`, lainnya `rejected` + `rejection_reason`.
- Catat ke `seo_agent_runs` step `filter`.

**`seo-agent-generate`** — POST: generate 1 artikel + thumbnail + publish
- Input: `{ keywordId: string }`
- Step A — Article (Lovable AI `google/gemini-2.5-pro`, structured tool call):
  - Output schema: `title`, `slug`, `meta_description` (≤160 char), `category`, `short_description` (≤200), `long_description` (markdown, ≥800 kata, mengandung keyword utama 3-7×, H2/H3, internal link ke `/rooms/{slug}` dari `internal_link_targets`), `tips`, `best_time_to_visit`, `price_range`, `address`, `image_alt`.
  - Slug auto-unik (cek collision di `city_attractions`).
- Step B — Thumbnail (Lovable AI `google/gemini-3.1-flash-image-preview`):
  - Prompt dibangun dari `title` + style guideline brand Pomah (warm, photorealistic, Semarang vibe).
  - Decode base64 → upload ke bucket `attraction-images` (sudah ada, public) → ambil public URL.
- Step C — Publish:
  - Insert `city_attractions` dengan `is_active = seo_agent_settings.auto_publish` (default false).
  - Update `seo_keywords.status = 'published'`, simpan `attraction_id`.
- Step D — Evaluasi (in-process, tanpa AI tambahan):
  - Hitung `word_count`, `keyword_density` (occurrences / words), `readability_score` (Flesch sederhana), `seo_score` (rumus: keyword di title +20, di meta +15, di H2 +15, density 1-3% +20, word_count ≥800 +15, internal link ≥1 +10, image_alt ada +5).
  - Simpan ke `seo_agent_runs` step per step.

**`seo-agent-cron`** (opsional, dijadwalkan) — orchestrator: ambil sampai N keyword `qualified`, jalankan `seo-agent-generate` per keyword secara serial dengan delay (hindari rate limit Lovable AI).

### 3. Admin UI Baru

**Halaman**: `/admin/seo-agent` (`src/pages/admin/AdminSeoAgent.tsx`) — di-route via `App.tsx` & sidebar `AdminLayout`.

Tabs:
1. **Settings** — form `seo_agent_settings`: seed keywords (chip input), target intents (multi-select), threshold (slider), auto-publish toggle, model picker, internal link targets (multi-select dari rooms).
2. **Keywords Pool** — tabel `seo_keywords` dengan filter status, intent, search; bulk action: classify, generate, reject, delete. Tombol "Tambah Manual" & "Riset dari Seed".
3. **Runs & Evaluasi** — tabel `seo_agent_runs` dengan SEO score (badge warna), word count, link ke artikel published, error inspector.
4. **Drafts** — list `city_attractions` dengan `is_active=false` hasil agen (filter by source flag) → preview, edit cepat (pakai dialog yang sudah ada di `AdminCityAttractions`), tombol "Publish".

Hooks baru: `useSeoAgentSettings`, `useSeoKeywords`, `useSeoAgentRuns` — pola sama dengan `useAdminChatbot`.

### 4. Saran Tambahan (Lovable Cloud-friendly)

- **Tambahkan kolom `created_by_agent boolean default false` di `city_attractions`** supaya Drafts tab bisa filter konten agen vs manual tanpa menyentuh entry lama.
- **Internal linking otomatis** ke `rooms` & landing page CTA WhatsApp → boost konversi dari traffic SEO ke booking (sesuai memori `comprehensive-seo-optimization-system`).
- **Integrasi Google Search Console** (sudah ada `search_console_*` tables): tambah opsi sumber keyword `gsc` — ambil query yang impression tinggi tapi CTR rendah, lalu generate artikel target query tsb. Bisa tahap 2.
- **Guard biaya**: hard limit per hari (mis. max 10 artikel/day) di `seo_agent_settings`, dicek di edge fn sebelum generate.
- **Human-in-the-loop default**: `auto_publish=false` agar admin selalu review dulu — mengurangi risiko hallucinated info tentang tempat di Semarang.
- **Hindari plagiarisme**: di prompt artikel, instruksikan AI untuk hanya pakai informasi umum + sebutkan jika butuh verifikasi (mis. jam buka). Tambah disclaimer footer otomatis.
- **Format tanggal dd/MM/yyyy** & timezone WIB di semua UI agen (sesuai core memory).
- **Sentry-style error capture** sudah dicover oleh `seo_agent_runs.error_message` + `issues` jsonb.
- **Rate limit Lovable AI**: serialize `generate` step dengan jeda 2-3 detik, surface 429/402 ke toast admin.

### 5. File yang Akan Dibuat / Diubah

Baru:
- `supabase/migrations/<ts>_seo_agent.sql` (3 tabel + RLS + kolom `created_by_agent`)
- `supabase/functions/seo-agent-keywords/index.ts`
- `supabase/functions/seo-agent-classify/index.ts`
- `supabase/functions/seo-agent-generate/index.ts`
- `supabase/functions/seo-agent-cron/index.ts` (opsional)
- `supabase/functions/_shared/seoScoring.ts` (rumus skor — dipakai ulang)
- `src/pages/admin/AdminSeoAgent.tsx`
- `src/components/admin/seo-agent/{SettingsTab,KeywordsTab,RunsTab,DraftsTab}.tsx`
- `src/hooks/useSeoAgent.tsx` (gabungan settings/keywords/runs)
- `src/types/seo-agent.types.ts`

Diubah:
- `src/App.tsx` — route `/admin/seo-agent`
- `src/components/admin/AdminLayout.tsx` (atau sidebar nav) — menu baru "SEO Agent"
- `mem://index.md` — tambah referensi `[SEO Agent](mem://features/seo-agent)`
- `mem://features/seo-agent.md` — dokumentasi fitur

### 6. Pertanyaan untuk dipastikan sebelum eksekusi

1. **Storage konten**: pakai tabel `city_attractions` (publish ke `/explore-semarang/:slug`) — OK? Atau mau tabel artikel terpisah (`seo_articles`) dengan rute baru `/blog/:slug`?
2. **Auto-publish**: default `false` (admin review dulu) — setuju? Atau langsung live?
3. **Sumber keyword awal**: hanya Google Suggest + manual, atau langsung sertakan integrasi GSC (lebih kompleks tapi datanya lebih akurat untuk hotel)?
4. **Cron**: aktifkan job harian (mis. jam 03:00 WIB) untuk auto-research+classify, atau full manual trigger dulu?
