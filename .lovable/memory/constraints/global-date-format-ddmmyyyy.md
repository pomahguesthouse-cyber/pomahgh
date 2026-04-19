---
name: Global Date Format dd/MM/yyyy
description: Format tanggal global seluruh sistem (UI, invoice, WhatsApp, chatbot) wajib dd/MM/yyyy — bukan format Indonesia panjang
type: constraint
---

Seluruh tampilan tanggal di sistem (UI website & admin, PDF/email invoice, notifikasi WhatsApp manager, chatbot tamu & WhatsApp) WAJIB pakai format **dd/MM/yyyy** (contoh: `15/01/2025`).

**Helper canonical:**
- Frontend: `formatDateID` (`src/utils/indonesianFormat.ts`) dan `formatDate` (`src/lib/format/date.ts`) → default sudah `dd/MM/yyyy`.
- Edge functions chatbot: `formatDateIndonesian` di `chatbot-tools/lib/dateUtils.ts`, `admin-chatbot/lib/dateHelpers.ts`, `admin-chatbot/lib/responseTemplates.ts` → semua return `dd/MM/yyyy` (admin-chatbot menambahkan nama hari di depan).
- Notifikasi & invoice: `notify-new-booking`, `notify-payment-decision`, `generate-invoice`, `daily-checkin-reminder` → output `dd/MM/yyyy`.

**Aturan AI prompt:**
- `chatbot/ai/promptBuilder.ts` & `chatbot/agents/paymentPrompt.ts` instruksikan model untuk SELALU output `dd/mm/yyyy`. Jangan pernah pakai "15 Januari 2025".

**Why:** Permintaan user untuk standardisasi format tanggal global agar konsisten dan ringkas.

**How to apply:** Saat menambah tampilan/notifikasi tanggal baru, gunakan helper canonical di atas. Jangan hardcode `dd MMMM yyyy` atau `EEEE, dd MMMM yyyy` lagi.
