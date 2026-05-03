---
name: whatsapp-human-handover-trigger
description: Pre-routing pattern di orchestrator yang otomatis mematikan AI dan alert super-admin saat tamu minta admin asli/bukan bot.
type: feature
---
Lokasi: `supabase/functions/whatsapp-webhook/agents/orchestrator.ts` section 5d.2.

Pattern yang diterima sebagai handover request (regex case-insensitive):
- `admin (yang) asli|manusia|beneran|sungguhan`
- `(bukan|stop|matikan|jangan) (bot|chatbot|ai)`
- `(masih|ini) bot`
- `tolong (panggil|hubungi) admin`
- `chat (sama|ke) admin (asli|manusia)`
- `bicara (sama|ke|dengan) (admin|manusia)`

Aksi saat match:
1. `updateSession(..., is_takeover=true)` — AI dimatikan untuk session ini.
2. Kirim balasan ke tamu: "Baik kak, saya teruskan ke admin kami ya. Mohon ditunggu sebentar 🙏".
3. Catat system note `🆘 [HANDOVER]` di chat_messages.
4. Panggil `escalateToHumanStaff` → notif WhatsApp ke semua super_admin/admin.
5. Log agent decision (`reason: human_handover_requested`).

Dijalankan SETELAH session/memory audit, SEBELUM agent classification, supaya conversationId sudah pasti ada.
