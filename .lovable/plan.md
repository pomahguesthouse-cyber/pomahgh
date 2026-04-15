

# Dashboard Multi-Agent WhatsApp Chatbot

## Ringkasan

Membuat dashboard multi-agent di `/admin/multi-agent` berdasarkan layout HTML yang dikirim, dengan 6 tab: **Semua Agent**, **Live Chat**, **Jadwal & Log**, **Prompt Studio**, **Alur Eskalasi**, **Pengaturan**. Dashboard menggunakan data real dari `whatsapp_sessions`, `chat_conversations`, dan `chat_messages`.

## Arsitektur

Dashboard akan terdiri dari **1 halaman utama** + **9 komponen modular** + **1 data hook**.

### Agents yang ditampilkan (mapping ke multi-agent backend)

| Agent Card | Backend Agent | Status Source |
|---|---|---|
| Reservasi Bot | `booking.ts` | Real-time dari sessions |
| CS & FAQ Bot | `faq.ts` | Real-time dari sessions |
| Intent Router | `intent.ts` | Always active |
| Pricing Bot | `pricing.ts` | Real-time dari sessions |
| Manager Bot | `manager.ts` | Real-time dari sessions |
| Orchestrator | `orchestrator.ts` | Always active |

### File Baru

```text
src/pages/admin/AdminMultiAgentDashboard.tsx        — Halaman utama + tab switching
src/components/admin/multi-agent/
  ├── TopBar.tsx                    — Brand + WhatsApp status + tombol tambah agent
  ├── AgentMetrics.tsx              — 4 metric cards (chat aktif, reservasi, respons, eskalasi)
  ├── AgentGrid.tsx                 — Grid 3 kolom agent cards + filter (semua/aktif/idle/sibuk)
  ├── AgentConfigPanel.tsx          — Panel konfigurasi per agent (nama, role, prompt, toggles)
  ├── LiveChatView.tsx              — Chat list + chat window + takeover/eskalasi buttons
  ├── ActivityLog.tsx               — Tabel log real-time (waktu, agent, tamu, aktivitas, status)
  ├── PromptStudio.tsx              — Editor system prompt per agent + temperature + max turn
  ├── EscalationFlow.tsx            — Alur eskalasi antar agent (dari → ke + kondisi)
  ├── SettingsPanel.tsx             — Koneksi WA, jam operasional, notifikasi staf
  └── index.ts                     — Barrel exports
src/hooks/useMultiAgentDashboard.ts — Data hook: sessions, conversations, messages, stats
```

### Perubahan File Existing

| File | Perubahan |
|---|---|
| `src/App.tsx` | Tambah lazy import + route `/admin/multi-agent` |
| `src/components/admin/AdminSidebar.tsx` | Tambah menu "Multi-Agent" di group Virtual Assistant |

### Tab Layout

**Tab 1 — Semua Agent:**
- 4 metric cards (data dari aggregasi `whatsapp_sessions` + `chat_conversations`)
- Filter tabs: Semua / Aktif / Idle / Sibuk
- Grid 3 kolom agent cards (icon, nama, role, status dot, stats, progress bar, tags)
- Klik agent → config panel (nama, role, prompt, temperature, toggles, eskalasi target)

**Tab 2 — Live Chat:**
- Left: daftar percakapan aktif dari `whatsapp_sessions` (nama tamu + HP + agent badge + preview)
- Right: chat window dengan message bubbles dari `chat_messages`
- Tombol "Ambil alih" (takeover) dan "Eskalasi"
- Input untuk balas sebagai staf

**Tab 3 — Jadwal & Log:**
- Tabel log real-time dari `chat_messages` + `whatsapp_sessions`
- Kolom: Waktu, Agent, Tamu, Aktivitas, Status badge

**Tab 4 — Prompt Studio:**
- Left: list agent (selectable)
- Right: textarea system prompt + temperature + max turn + save/reset

**Tab 5 — Alur Eskalasi:**
- Flow cards: Agent A → dropdown target → kondisi text
- Tombol tambah/hapus alur

**Tab 6 — Pengaturan:**
- Koneksi WhatsApp (nomor, provider, API key, webhook)
- Jam operasional (mulai/selesai, pesan di luar jam, zona waktu)
- Notifikasi staf (toggles)

### Data Sources
- **Sessions**: `whatsapp_sessions` real-time subscription
- **Messages**: `chat_messages` per conversation
- **Stats**: Aggregasi dari `chat_conversations` (hari ini)
- **Agent config**: Stored di `chatbot_settings` atau local state (untuk prompt/temperature per agent — saat ini placeholder karena backend menyimpan prompt di edge function code)

### Fitur Tambahan (tidak ada di HTML)
1. **Real-time dot indicator** — blinking dot pada log table header
2. **Guest name display** — Tampilkan `guest_name` dari session context jika tersedia, fallback ke phone number
3. **Takeover integration** — Tombol "Ambil alih" langsung memanggil existing `useWhatsAppSessions` takeover mutation
4. **Message count badge** — Badge jumlah pesan pada setiap chat row

### Design
- Mengikuti persis style dari HTML: warna hijau `#1D9E75` sebagai primary, card borders tipis, font size compact (11-13px)
- Responsive: grid agent 3→2→1 kolom, chat layout stack di mobile
- Menggunakan shadcn Tabs untuk navigasi tab

## Yang Tidak Berubah
- Backend edge functions — tidak diubah
- Database schema — tidak ada migrasi
- Existing WhatsApp sessions hook — digunakan langsung

