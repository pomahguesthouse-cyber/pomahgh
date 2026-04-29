
## Tujuan

Lengkapi tab **Drafts** SEO Agent dengan kemampuan:
1. **Generate artikel langsung dari halaman Drafts** (untuk keyword qualified yang belum punya draft).
2. **Preview artikel di dalam dialog** (tanpa harus buka tab `/explore-semarang/:slug`) — render markdown, thumbnail, meta, skor SEO.
3. Aksi cepat: **Publish/Unpublish, Regenerate, Edit cepat, Hapus**.
4. Indikator loading saat generasi berjalan (proses bisa 20–60 detik).

## Perubahan UI

### Tab Drafts (`AdminSeoAgent.tsx` → `DraftsTab`)

Tambah header bar dengan:
- Dropdown **"Pilih keyword qualified…"** + tombol **Generate Artikel** (memanggil `seo-agent-generate` dengan `keyword_id`).
- State loading global "Sedang generate…" dengan estimasi waktu.

Ubah tabel drafts: tambah kolom **Thumbnail** (gambar 48x32) dan kolom **SEO Score** (diambil dari run terakhir untuk `attraction_id` tsb).

Aksi per baris:
- **Preview** → buka dialog internal (bukan tab baru lagi; tetap sediakan link "Buka di tab baru").
- **Publish toggle** (sudah ada).
- **Regenerate** → konfirmasi → panggil `seo-agent-generate` ulang dengan `keyword_id` draft (perlu kolom `agent_keyword_id` yg sudah ada).
- **Hapus** (sudah ada).

### Dialog Preview Artikel (komponen baru `SeoDraftPreviewDialog`)

Layout 2 kolom (responsive → 1 kolom di mobile):
- **Kiri (sticky meta)**: thumbnail besar, judul, slug, meta description, daftar skor SEO (score, density, word count, readability) dari `seo_agent_runs` terbaru, daftar issues bila ada.
- **Kanan (scroll)**: render `long_description` via `react-markdown` (sudah terpasang di project) dengan styling `prose`.
- Footer: tombol **Publish/Unpublish**, **Buka halaman publik**, **Regenerate**, **Tutup**.

### Tab Keywords Pool — penyesuaian kecil

Tombol **Generate** yg sudah ada tetap dipertahankan, tetapi:
- Setelah sukses, langsung redirect ke tab Drafts (via `setActiveTab`) dan auto-buka dialog preview saat draft baru muncul (polling `useSeoDrafts` setiap 5 detik selama job berjalan, max 90 detik).

## Perubahan Hook (`useSeoAgent.ts`)

1. `useSeoDrafts` → tambah join skor terakhir:
   - Tambah query baru `useSeoLatestRunByAttraction(attractionId)` yang mengambil 1 row terbaru dari `seo_agent_runs` di mana `attraction_id = ?` dan `step = 'generate'`. Dipakai dialog preview.
2. Tambah hook `useQualifiedKeywordsWithoutDraft()` — keyword `status = 'qualified'` yang `attraction_id IS NULL`, untuk dropdown generate di Drafts.
3. Re-export tipe `SeoAgentRun` (sudah ada).

Tidak ada perubahan database / edge function — semua sudah tersedia (`seo-agent-generate`, tabel `seo_agent_runs`, `city_attractions.long_description`, `image_url`).

## Detail Teknis

- Render markdown: `import ReactMarkdown from "react-markdown"` di dalam dialog, dibungkus `<div className="prose prose-sm max-w-none">`.
- Polling generasi: `setInterval` 5 dtk + abort di `useEffect` cleanup; berhenti ketika draft baru muncul atau timeout.
- Lifecycle generate dari Drafts:
  ```
  user pilih keyword → click Generate
    → optimistic toast "Sedang generate (±30 dtk)…"
    → invoke 'seo-agent-generate' { keyword_id }
    → on success: invalidateQueries(['seo-drafts','seo-agent-runs','seo-keywords'])
    → auto-open SeoDraftPreviewDialog untuk draft baru
  ```
- Tombol Regenerate: konfirmasi via `window.confirm` (atau AlertDialog) — passes `keyword_id` & `force: true` (param sudah didukung edge function; bila belum, fallback ke generate baru — perlu cek di implementasi runtime).
- Format tanggal tetap `dd/MM/yyyy HH:mm` sesuai memory rule global.

## Files yang akan diubah/ditambah

- `src/hooks/useSeoAgent.ts` — tambah `useSeoLatestRunByAttraction`, `useQualifiedKeywordsWithoutDraft`.
- `src/pages/admin/AdminSeoAgent.tsx` — perbarui `DraftsTab`, integrasi auto-preview dari `KeywordsTab`.
- `src/components/admin/seo/SeoDraftPreviewDialog.tsx` — **(baru)** komponen dialog preview artikel dengan markdown + meta SEO.

## Out of scope

- Editor markdown inline (cukup tombol "Edit di Admin City Attractions" → link).
- Perubahan skema DB / edge function generate (gunakan apa adanya).
- A/B test atau scheduling generate.
