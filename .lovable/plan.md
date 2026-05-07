# Plan: Harga Full Guesthouse Rp 3.000.000/malam

## Tujuan
Saat tamu menanyakan booking 1 guesthouse / rumah full (semua kamar), chatbot WhatsApp & web harus menjawab dengan harga **Rp 3.000.000 per malam**. Harga editable oleh admin di settings.

## Perubahan

### 1. Database (migration)
Tambah kolom di `hotel_settings`:
- `full_house_price` numeric default `3000000`
- `full_house_enabled` boolean default `true`
- `full_house_description` text default `'Sewa seluruh guesthouse (semua kamar aktif) — cocok untuk acara keluarga, gathering, atau rombongan.'`

Update `get_public_hotel_settings()` agar 3 field ini ikut terekspos (publik, agar chatbot web bisa baca).

### 2. Admin UI
`src/pages/admin/AdminSettings.tsx` (atau section terkait): tambah card "Full House / Sewa Guesthouse" dengan toggle enable, input harga (rupiah), dan deskripsi.

### 3. Chatbot detection (WhatsApp + Web)
Buat helper baru `supabase/functions/_shared/fullHousePricing.ts`:
- `isFullHouseQuestion(message)` — regex: `sewa.?(rumah|guesthouse|seluruh)`, `(booking|pesan).?(satu|1).?(rumah|guesthouse)`, `full.?(house|guesthouse)`, `semua kamar`, `seluruh kamar`, `rumah(nya)?.?full`, `private`, `borong`, dll.
- `getFullHouseInfo(supabase)` — baca settings + hitung total kamar aktif via `rooms.available=true`, return `{ price, totalRooms, description, totalCapacity }`.
- `formatFullHouseReply(info, nights?)` — pesan WhatsApp.

### 4. WhatsApp orchestrator
`supabase/functions/whatsapp-webhook/agents/orchestrator.ts`: setelah cek `isGenericPriceQuestion`, tambahkan early-branch `isFullHouseQuestion`. Kalau cocok → kirim balasan format dd/MM/yyyy aware, max 1 emoji, sesuai persona. Log via `logAgentDecision` dengan `to_agent: 'full_house'`.

Buat agent baru `supabase/functions/whatsapp-webhook/agents/fullHouse.ts` (mirip `priceList.ts`).

### 5. Web chatbot tools
`supabase/functions/chatbot-tools/`:
- Tambah tool `getFullHousePrice` di registry (`chatbot-tools/tools/getFullHousePrice.ts` + register di `index.ts`).
- Update `supabase/functions/chatbot/ai/tools.ts` & `promptBuilder.ts` agar AI tahu kapan memanggilnya (deskripsi: "Gunakan saat tamu menanyakan harga sewa seluruh guesthouse / full house / semua kamar").

### 6. Sample reply
```
Untuk sewa seluruh guesthouse (full house) tarifnya *Rp3.000.000/malam* ya kak 🏡
Sudah termasuk semua kamar aktif (X kamar, total kapasitas Y tamu).
Mau saya cek ketersediaan untuk tanggal tertentu?
```

### 7. Tests
- `supabase/functions/_shared/fullHousePricing.test.ts` untuk regex `isFullHouseQuestion` (positif & negatif false-trigger seperti "kamar deluxe full bed").
- Smoke test orchestrator branch.

## Tidak diubah
- Flow booking aktual / pembayaran (di luar scope — saat ini hanya jawaban harga).
- RLS lain.

## File terpengaruh
- migration baru
- `supabase/functions/_shared/fullHousePricing.ts` (new)
- `supabase/functions/whatsapp-webhook/agents/fullHouse.ts` (new)
- `supabase/functions/whatsapp-webhook/agents/orchestrator.ts`
- `supabase/functions/chatbot-tools/tools/getFullHousePrice.ts` (new) + `chatbot-tools/index.ts`
- `supabase/functions/chatbot/ai/tools.ts`, `promptBuilder.ts`
- Admin settings page (UI)
- Test file (new)
