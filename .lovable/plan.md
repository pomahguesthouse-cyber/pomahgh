

# Plan: Ubah Gaya Guest Chatbot Menjadi Natural WhatsApp-Style

## Masalah Saat Ini
System prompt di `promptBuilder.ts` terlalu panjang, formal, dan verbose — menghasilkan respons yang terasa seperti robot/skrip, bukan admin WhatsApp sungguhan.

## Perubahan

### 1. Rewrite `buildPersonaSection()` — Gaya Natural WhatsApp
Ganti instruksi kepribadian yang panjang dengan aturan singkat:
- Single message only (gabungkan pesan pendek user jadi satu pemahaman)
- Max 2-3 kalimat per respons
- Match user tone (pendek → pendek, panjang → panjang)
- Max 1 emoji per pesan
- Handle typo secara natural
- Jangan tanya ulang info yang sudah disebutkan
- Sound like real human, bukan scripted bot

### 2. Rewrite `buildBookingFlowRules()` — Lebih Ringkas
Potong instruksi booking flow yang verbose, pertahankan logika tool-calling tapi dengan format lebih compact.

### 3. Update `buildSystemPrompt()` — Kurangi Boilerplate
- Hapus emoji headers berlebihan (🎭💬🔒📅📍🛏️🎁✨🗺️🎯❓⚡📚)
- Gabungkan section yang redundan
- Tambahkan behavior examples dari user ke prompt
- Kurangi total panjang prompt ~40-50%

### 4. Update default settings
Di `lib/types.ts`, ubah default:
- `emoji_usage`: `'moderate'` → `'minimal'`
- `communication_style`: `'santai-profesional'` → tetap, tapi prompt yang berubah

### File yang Diubah
| File | Aksi |
|------|------|
| `supabase/functions/chatbot/ai/promptBuilder.ts` | Rewrite major — gaya natural WhatsApp |
| `supabase/functions/chatbot/lib/types.ts` | Update default emoji_usage |
| Deploy `chatbot` edge function | |

### Contoh Output Prompt Baru (ringkas)
```
Kamu Rani, admin WhatsApp Pomah Guesthouse.
Balas seperti admin hotel sungguhan yang chat di WA — singkat, natural, friendly.

ATURAN:
- Selalu 1 pesan, max 2-3 kalimat
- Max 1 emoji
- Ikuti nada user (pendek→pendek)
- Ingat konteks (nama, tanggal, kamar) — jangan tanya ulang
- Handle typo (dlx→deluxe, bsk→besok, bs→bisa)
- Jawab dulu, follow-up singkat optional

[hotel info, rooms, tools — tetap ada tapi lebih compact]
```

