## Tujuan
Skip prompt "Boleh saya tahu nama Anda?" jika webhook Fonnte sudah membawa pushname WA yang valid, lalu sapa tamu langsung dengan namanya.

## Catatan
Nomor telepon tidak menyimpan nama. Yang dipakai adalah field `name` (pushname) yang dikirim Fonnte di payload webhook — yaitu nama profil WhatsApp yang user set sendiri.

## Perubahan

### 1. `supabase/functions/whatsapp-webhook/agents/orchestrator.ts`
Pada blok first-message (sekitar line 530–608), sebelum logika intent matching:

- Ekstrak pushname dari body: `body.name` atau `body.pushname` (fallback antar key Fonnte).
- Validasi pakai `isLikelyPersonName` yang sudah ada.
- Jika valid:
  - Set `guest_name = pushname`, `awaiting_name = false`.
  - Update `chat_conversations.guest_email = "{pushname} (WA: {phone})"`.
  - Log user message + greeting `Halo Kak {pushname}! 👋 Saya {personaName} dari Pomah Guesthouse. Ada yang bisa saya bantu?`.
  - Kirim greeting via `sendWhatsApp`, lalu **lanjutkan flow** ke agent routing biasa (jangan return) supaya pesan pertama tamu tetap diproses jika sudah berisi intent. Atau jika pesan pertama hanya sapaan ("halo"), cukup return greeting.
  - Tambah `session_intent_logs` entry dengan flag baru `name_source: 'pushname'`.
- Jika pushname tidak valid → fallback ke flow existing (intent match → bypass / ask name).

### 2. `supabase/functions/whatsapp-webhook/types.ts`
Tambah `name?: string; pushname?: string;` di tipe webhook body parsing (kalau ada).

### 3. (Opsional) `session_intent_logs`
Tambah kolom `name_source TEXT` (values: `pushname` | `prompt` | `generic`) untuk dashboard analytics — biar tahu berapa % skip prompt karena pushname.

### 4. Test
Tambah case di `orchestrator.test.ts`:
- Body dengan `name: "Budi Santoso"` → tidak ada prompt nama, session tersimpan dengan `guest_name: "Budi Santoso"`.
- Body dengan `name: "🛍️ Toko ABC"` → fallback ke flow existing.
- Body tanpa `name` → flow existing.

## Yang TIDAK berubah
- Logika `awaiting_name` untuk session lama.
- Intent matching & greeting bypass.
- Fallback `Tamu WA xxxx`.