

# Redesign: Tab-based Multi-Agent Dashboard dengan Agent Cards

## Ringkasan

Redesign total `AdminChatbotDashboard` menggunakan **sistem tab card** (Home, Manager, WhatsApp Log, Analytics) sesuai gambar referensi, dengan visual agent flow diagram yang menampilkan routing Orchestrator → agents, dan conversation cards yang menampilkan nama tamu + nomor HP.

## Perubahan

### 1. Dashboard utama → Tab system
Ganti layout grid 3-kolom dengan **Tabs** (shadcn Tabs component):
- **Home** — Agent Flow Diagram (visual besar) + Live sessions cards
- **Manager** — Manager Agent sessions (filter `session_type = 'admin'`)  
- **WhatsApp Log** — Full conversation list + detail viewer (decision log, tool log, context)
- **Analytics** — Stat cards + analytics section

### 2. Agent Flow Diagram — Redesign visual
Sesuai gambar referensi:
- User icon → Intent Agent → Booking Agent (highlighted hijau saat aktif)
- Orchestrator di atas tengah, panah ke bawah
- Booking Agent → FAQ Agent, Pricing Agent, Payment Agent (panah hijau/abu)
- Badge "Intent: BOOKING / Confidence Score: 98%" di bawah Intent Agent
- Menggunakan SVG lines/arrows untuk koneksi antar agent (bukan grid sederhana)

### 3. Conversation Cards — Nama + HP
Update `LiveConversationList` menjadi **card grid** (bukan list):
- Setiap session ditampilkan sebagai card
- Format: **Nama Tamu** (bold) + nomor HP di bawahnya
- Jika `guest_name` belum diketahui, tampilkan hanya nomor HP
- Jika `guest_name` sudah ada (dari context atau session), tampilkan: `"Ahmad Rizki" — +62 856-xxxx-xxxx`
- Badge intent, waktu terakhir, status takeover/blocked

### 4. TopBar — AI Auto / Manual toggle visual
Sesuai gambar: indikator hijau "AI Auto" dan merah "Manual" di kanan atas

### 5. File yang diubah

| File | Perubahan |
|------|-----------|
| `AdminChatbotDashboard.tsx` | Restructure ke Tabs layout (Home/Manager/WhatsApp Log/Analytics) |
| `AgentFlowDiagram.tsx` | Redesign total: SVG arrows, visual flow sesuai gambar, confidence badge |
| `LiveConversationList.tsx` | Card grid layout, tampilkan nama + HP, filter by tab |
| `TopBar.tsx` | Tambah AI Auto/Manual visual indicator |
| `ContextViewer.tsx` | Tetap, dipindah ke tab WhatsApp Log |
| `AgentDecisionLog.tsx` | Tetap, dipindah ke tab WhatsApp Log |
| `ToolExecutionLog.tsx` | Tetap, dipindah ke tab WhatsApp Log |
| `AnalyticsSection.tsx` | Dipindah ke tab Analytics |

### 6. Layout per Tab

**Tab Home:**
```text
┌──────────────────────────────────────┐
│ Agent Flow Diagram (full width)      │
│ User → Intent → Booking → FAQ/etc   │
├──────────────────────────────────────┤
│ Session Cards (grid 2-3 cols)        │
│ [Card: Nama+HP] [Card] [Card]       │
└──────────────────────────────────────┘
```

**Tab Manager:**
```text
│ Manager sessions cards (filtered)    │
│ Context viewer for selected session  │
```

**Tab WhatsApp Log:**
```text
│ Conversation list │ Decision Log     │
│ (left column)     │ Tool Log         │
│                   │ Context + Pricing│
```

**Tab Analytics:**
```text
│ Stat cards (6 metrics)               │
│ Error panel                          │
```

## Yang Tidak Berubah
- Data hook `useChatbotDashboard.ts` — tidak diubah
- Backend / edge functions — tidak diubah
- Database schema — tidak ada migrasi

