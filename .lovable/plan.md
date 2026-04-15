

# Plan: Tambah Manager Agent (Pengelola)

## Situasi Saat Ini

Pesan dari pengelola/manager saat ini ditangani oleh `faq.ts` yang sebenarnya bukan FAQ — file ini me-route pesan manager ke `admin-chatbot` edge function. Penamaan dan tanggung jawab tidak sesuai.

## Perubahan

### 1. Buat `agents/manager.ts` — Agent Khusus Pengelola

File baru yang menangani semua logika khusus manager:
- Routing ke `admin-chatbot` edge function
- Conversation history management untuk manager
- Deteksi konteks manager (laporan, operasional, pertanyaan staf)
- Handoff ke Pricing Agent jika pesan berisi command APPROVE/REJECT
- Session management khusus manager (session_type = 'admin')

### 2. Update `agents/orchestrator.ts`

- Import `handleManagerChat` dari `manager.ts` (menggantikan `handleManagerMessage` dari `faq.ts`)
- Routing: manager terdeteksi → Pricing Agent (command) → Manager Agent (semua lain)

### 3. Update `agents/faq.ts` → Murni untuk FAQ tamu

- Hapus `handleManagerMessage` dari `faq.ts`
- `faq.ts` kini hanya berisi logic FAQ untuk tamu (greeting, fallback, pertanyaan umum)
- Tambahkan fungsi `handleGuestFAQ` sebagai fallback dari Booking Agent jika intent bukan booking

### 4. Update `types.ts`

- Tambahkan interface `ManagerAgentResult` yang extend `AgentResult` dengan `manager_name` dan `manager_role`

## Arsitektur Akhir

```text
agents/
├── orchestrator.ts  ← Route: manager? → manager.ts / guest? → intent.ts → booking.ts
├── manager.ts       ← NEW: Khusus pengelola (admin-chatbot gateway)
├── intent.ts        ← Guest intent detection
├── booking.ts       ← Guest booking flow
├── pricing.ts       ← Price approval (manager command)
└── faq.ts           ← Guest FAQ fallback
```

## Yang Tidak Berubah
- `admin-chatbot` edge function — tetap sama, manager.ts hanya me-route ke sana
- Database schema — tidak ada migrasi
- Guest flow — tidak terpengaruh
- Pricing agent — tetap handle APPROVE/REJECT command

