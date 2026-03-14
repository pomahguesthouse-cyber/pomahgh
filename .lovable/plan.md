

# Plan: Perbaiki Rendering Landing Page — Pisahkan Page Editor vs Legacy

## Masalah
Saat ini ada **dua sistem** untuk mengelola landing page yang saling konflik:

1. **Legacy System** (`LandingPageFormDialog`) — menggunakan field `hero_headline`, `page_content`, `hero_slides`, dll
2. **Visual Page Editor** (`PageEditorPage`) — menyimpan desain ke field `page_schema` sebagai JSON

Masalahnya:
- `LandingPage.tsx` (halaman publik) **hanya merender field legacy** (hero_headline, page_content, dll) dan **mengabaikan `page_schema`** sepenuhnya
- Saat menyimpan dari Page Editor, field `hero_headline` di-overwrite dengan `pageSettings.title`, merusak konten legacy
- Tidak ada logika untuk mendeteksi halaman mana yang dibuat via editor vs form

## Solusi

### 1. Deteksi Mode Rendering di `LandingPage.tsx`
Tambahkan logika: jika `page_schema` ada dan berisi elemen, render menggunakan visual editor output. Jika tidak, render layout legacy seperti sekarang.

```text
if (page.page_schema && page.page_schema.length > 0) → render visual elements
else → render legacy layout (hero + rooms + facilities + markdown)
```

### 2. Buat Komponen `PublicPageRenderer.tsx`
Komponen baru yang merender `page_schema` elements secara read-only (tanpa editor UI, drag-drop, selection). Akan re-use element components yang sudah ada (`HeadingElement`, `ParagraphElement`, `ImageElement`, dll) dengan prop `isPreview={true}`.

### 3. Update `LandingPage.tsx`
- Tambah `page_schema` ke query select
- Cek apakah `page_schema` punya elemen
- Jika ya, render `<PublicPageRenderer elements={page.page_schema} />`
- Jika tidak, render layout legacy yang sudah ada (tidak berubah)
- SEO metadata (Helmet, JSON-LD) tetap dirender dari field yang tersedia

### 4. Fix Save Logic di `PageEditorPage.tsx`
- Jangan overwrite `hero_headline` dengan generic title saat save dari editor
- Hanya simpan field yang relevan untuk editor: `page_title`, `slug`, `meta_description`, `page_schema`, `status`

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/page-editor/PublicPageRenderer.tsx` | **Baru** — render page_schema elements secara read-only |
| `src/pages/LandingPage.tsx` | Deteksi `page_schema` dan pilih mode rendering |
| `src/pages/PageEditorPage.tsx` | Fix save agar tidak overwrite field legacy |

