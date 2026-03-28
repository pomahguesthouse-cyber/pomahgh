

# Analisis & Saran Optimasi - Hotel Booking System

## Status Saat Ini

Proyek ini adalah sistem booking hotel yang cukup besar dengan 370+ komponen, 50+ edge functions, dan 80+ hooks. Beberapa optimasi sudah dilakukan (code splitting dengan `lazyRetry`, beberapa `useMemo`/`memo`), namun masih ada ruang signifikan untuk perbaikan.

---

## Temuan & Rekomendasi

### 1. BUNDLE SIZE — Prioritas Tinggi

**Masalah:** 6 file menggunakan `import * as Icons from "lucide-react"` yang memuat **seluruh library** (~1000+ icon) ke bundle.

**File terdampak:**
- `AdminRooms.tsx`, `AdminRoomFeatures.tsx`, `AdminFacilities.tsx`
- `RoomFeatures.tsx`, `NearbyFromHotel.tsx`, `AttractionCard.tsx`

**Solusi:** Ganti wildcard import dengan dynamic icon rendering:
```typescript
// Buat utility: src/utils/DynamicIcon.tsx
import { lazy } from "react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
// Render icon berdasarkan nama string tanpa import seluruh library
```

**Estimasi dampak:** Pengurangan bundle ~300-500KB

---

### 2. FILE DUPLIKAT & BACKUP — Prioritas Sedang

**Masalah:** Ada file duplikat/backup yang masuk ke bundle:
- `src/hooks/useRooms.tsx` + `useRooms.tsx.backup` + `useRoomsFixed.tsx` + `useRoomsOptimized.ts`
- `src/App.tsx.backup`
- `src/stores/editorStore.ts.backup`
- `src/hooks/useBooking.tsx` + `src/features/booking/hooks/useBooking.ts` (duplikat)

**Solusi:** Hapus semua `.backup` dan file duplikat yang tidak digunakan.

---

### 3. CONSOLE.LOG DI PRODUKSI — Prioritas Sedang

**Masalah:** 92 `console.log` ditemukan di 9 file, termasuk file produksi seperti:
- `useWhatsAppSessions.tsx` — log setiap pesan masuk
- `useAdminNotifications.tsx` — log setiap booking baru
- `RoomAvailabilityCalendar.tsx` — log setiap subscription event
- `useChatbot.tsx`, `useBooking.tsx`

**Solusi:** Ganti semua `console.log` produksi dengan conditional logger yang hanya aktif di development mode, atau hapus sepenuhnya.

---

### 4. MEMOIZATION — Prioritas Sedang

**Masalah:** Hanya ~10 komponen menggunakan `memo()`. Komponen list/grid berat seperti kalender booking, daftar kamar, dan chat sessions tidak di-memo.

**Solusi prioritas** — tambahkan `memo()` pada:
- Komponen list item (booking cards, room cards, chat session items)
- Komponen kalender grid cells
- Header & Footer (jarang berubah)

---

### 5. EDGE FUNCTIONS — Prioritas Rendah

**Masalah:** Ada 50+ edge functions. Beberapa kemungkinan tidak aktif digunakan (misalnya `test-channel-manager`, `test-bookingcom-connection`).

**Saran:** Audit dan hapus edge functions yang hanya untuk testing/development.

---

### 6. DEPENDENCY BESAR YANG JARANG DIPAKAI — Prioritas Sedang

**Masalah:** Beberapa dependency berat hanya digunakan di halaman tertentu:
- `fabric` (~500KB) — hanya untuk page editor
- `pannellum-react` — hanya untuk 360° viewer
- `recharts` — hanya untuk admin dashboard
- `xlsx` — hanya untuk export

**Status:** Sudah menggunakan `lazyRetry()` untuk code splitting halaman. Namun pastikan dependency ini tidak di-import di komponen yang dimuat secara eager.

---

### 7. UI COMPONENT YANG TIDAK TERPAKAI — Prioritas Rendah

**Masalah:** 50 shadcn/ui components terpasang. Beberapa kemungkinan tidak digunakan (misalnya `menubar`, `context-menu`, `hover-card`, `input-otp`, `toggle-group`).

**Saran:** Audit dan hapus komponen UI yang tidak digunakan dari `src/components/ui/`.

---

## Ringkasan Prioritas Implementasi

| # | Optimasi | Dampak | Effort |
|---|----------|--------|--------|
| 1 | Hapus `import * as Icons` | Bundle -300KB | Rendah |
| 2 | Hapus file duplikat/backup | Kebersihan kode | Rendah |
| 3 | Hapus console.log produksi | Performa & keamanan | Rendah |
| 4 | Tambah memo() pada list components | Re-render -30% | Sedang |
| 5 | Audit unused dependencies & UI | Bundle -200KB | Sedang |

**Rekomendasi:** Mulai dari item 1-3 (quick wins, effort rendah, dampak langsung terasa).

