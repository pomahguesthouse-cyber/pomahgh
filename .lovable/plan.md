

# Dashboard Multi-Agent WhatsApp Chatbot AI

## Ringkasan

Membuat halaman dashboard baru `/admin/chatbot-dashboard` yang menampilkan monitoring real-time sistem multi-agent WhatsApp chatbot, menggantikan halaman konfigurasi chatbot lama (`/admin/chatbot/guest`). Dashboard mengikuti layout dari gambar referensi dengan 7 section utama.

## Sections dari Gambar Referensi

### Section A — AI Orchestration (Visualisasi Agent Flow)
- Diagram visual agent routing: Orchestrator → Intent → Booking/FAQ/Pricing/Payment
- Status aktif agent saat ini ("Dispatched Booking Agent")
- Animasi sederhana untuk menunjukkan flow aktif

### Section B — Live Conversation Inspector
- Daftar percakapan WhatsApp aktif real-time (dari `whatsapp_sessions`)
- Preview pesan terakhir per user, badge intent (BOOKING, FAQ, dll)
- Klik untuk melihat detail percakapan termasuk agent decision trail

### Section C — Context & Memory Viewer
- JSON viewer menampilkan konteks percakapan yang dipilih dari Section B
- Fields: intent, checkin, checkout, guests, room_type, last_agent
- Badge besar untuk intent (BOOKING, FAQ, dll)

### Section D — Agent Decision Log
- Timeline keputusan orchestrator: agent mana dipilih, alasan, confidence score
- Filter by time range dan agent type
- Data diambil dari edge function logs + chat_messages metadata

### Section E — Tool Execution Log
- Daftar tool calls yang dijalankan: `check_availability()`, `create_booking()`, dll
- Status per tool: success (hijau), pending (kuning), failed (merah)
- Data dari `chat_messages` yang berisi tool_calls

### Section F — Pricing & Payment Info
- Detail harga dan pembayaran untuk percakapan terpilih
- Expiry timer untuk pending payments
- Data dari booking terkait percakapan

### Section G — Analytics
- Stat cards: Total Chat, Booking Conversion, Drop-off Rate, Revenue Today
- Mini sparkline charts per metric
- Data dari `chat_conversations` aggregation

### Top Bar
- System Status (AI Active/Manual), Total Active Users, Waktu WIB, tombol Restart/Clear Cache

### Error Handling UI
- Toast/panel untuk error dari agent (payment gateway fail, dll)
- Retry button

## Perubahan Teknis

### File Baru
1. **`src/pages/admin/AdminChatbotDashboard.tsx`** — Halaman utama dashboard
2. **`src/components/admin/chatbot-dashboard/`** — Folder komponen:
   - `TopBar.tsx` — Status bar atas
   - `AgentFlowDiagram.tsx` — Section A visualisasi routing
   - `LiveConversationList.tsx` — Section B daftar percakapan
   - `ContextViewer.tsx` — Section C JSON context
   - `AgentDecisionLog.tsx` — Section D timeline keputusan
   - `ToolExecutionLog.tsx` — Section E status tool calls
   - `PricingPaymentPanel.tsx` — Section F detail harga
   - `AnalyticsSection.tsx` — Section G stat cards + charts
   - `ErrorPanel.tsx` — Error handling UI
3. **`src/hooks/useChatbotDashboard.ts`** — Hook untuk fetch data dashboard (sessions, conversations, analytics)

### Routing & Sidebar
- Tambah route `/admin/chatbot-dashboard` di `App.tsx`
- Update `AdminSidebar.tsx`: ganti "Guest Chatbot" → "AI Dashboard" mengarah ke `/admin/chatbot-dashboard`
- Halaman konfigurasi lama tetap bisa diakses dari link di dalam dashboard (Settings icon)

### Data Sources
- **Real-time sessions**: `whatsapp_sessions` table (sudah ada realtime subscription)
- **Conversations**: `chat_conversations` + `chat_messages` tables
- **Analytics**: Aggregasi dari `chat_conversations` (booking_created, message_count, duration, dll)
- **Agent logs**: Edge function logs via analytics query (opsional, bisa jadi placeholder dulu)
- **Tool execution**: Parse `chat_messages` content yang mengandung tool calls

### Design
- Warna warm tone (coklat/krem) sesuai gambar referensi, menggunakan CSS variables custom
- Grid layout responsive: desktop 3 kolom, tablet 2 kolom, mobile 1 kolom
- Dark/light mode support

## Yang Tidak Berubah
- Backend edge functions (whatsapp-webhook, chatbot, admin-chatbot) — tidak diubah
- Database schema — tidak ada migrasi baru
- Halaman konfigurasi lama masih bisa diakses sebagai sub-page "Settings"

## Fitur Tambahan yang Disarankan (Butuh Konfirmasi)
Berikut fitur yang mungkin bermanfaat tapi belum ada di gambar:
1. **Agent Performance Metrics** — Response time per agent, success rate per agent
2. **Conversation Replay** — Replay percakapan lengkap step-by-step termasuk keputusan AI
3. **Manual Override dari Dashboard** — Tombol takeover langsung dari Section B tanpa harus ke WhatsApp sessions tab

Apakah ada dari 3 fitur tambahan di atas yang ingin ditambahkan?

