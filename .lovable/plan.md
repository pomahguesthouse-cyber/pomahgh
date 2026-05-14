## Tujuan

Buat satu halaman terpusat **AI Lab** (`/admin/ai-lab`) yang menggabungkan semua fitur peningkatan kemampuan chatbot AI ke dalam tab-tab terstruktur, lalu **hapus halaman lama** (Guest Chatbot, Admin Chatbot, Tester AI) dari sidebar agar tidak ada duplikasi.

## Struktur Halaman `/admin/ai-lab`

Halaman tunggal dengan dua level navigasi: **Section grup** di kiri (vertical pills) dan **Tabs** di dalamnya. Layout responsif: di mobile jadi accordion/select.

```text
AI Lab
├── 🎓 Training & Evaluasi
│   ├── Training Examples (Guest)        ← TrainingTab
│   ├── Training Examples (Admin)        ← AdminTrainingTab
│   ├── Embedding Status                 ← TrainingEmbeddingStatus
│   ├── AI Tester (run + history)        ← AdminChatbotTester konten
│   └── AI Training Generator            ← komponen baru tipis (panggil edge function existing)
│
├── 📚 Knowledge & Konteks
│   ├── Knowledge Base (PDF/URL)         ← KnowledgeBaseTab
│   └── WhatsApp Auto-Learning           ← WhatsAppLearningTab
│
├── 🤖 Persona & Gaya
│   ├── Persona Guest                    ← PersonaSettingsTab
│   ├── Persona Admin                    ← konten persona dari AdminAdminChatbot
│   └── Perilaku & Lanjutan              ← form behavior + advanced dari AdminGuestChatbot
│
├── 💬 Templates & Pesan
│   ├── Message Templates                ← komponen templates dari AdminAdminChatbot
│   └── WhatsApp Settings (kontak, whitelist) ← form WhatsApp dari AdminGuestChatbot
│
└── 📊 Logs & Monitoring
    ├── Conversation Logs                ← konten logs dari AdminAdminChatbot
    └── Multi-Agent Dashboard (link)     ← tetap di /admin/multi-agent (link saja)
```

`AdminChatbotTesterRunDetail` (`/admin/chatbot/tester/:runId`) **tetap sebagai route detail** karena dibuka per-run; hanya entry-point pindah ke tab AI Lab.

## Perubahan Sidebar

Grup `Virtual Assistant` jadi:

```text
Virtual Assistant
├── Multi-Agent          /admin/multi-agent       (tetap)
├── Web Chatbot          /admin/chat              (tetap — UI chat live)
└── AI Lab               /admin/ai-lab            (BARU, ikon Sparkles/Brain)
```

Dihapus dari sidebar:
- Guest Chatbot (`/admin/chatbot/guest`)
- Admin Chatbot (`/admin/chatbot/admin`)
- Tester AI (`/admin/chatbot/tester`)

Route lama tetap terdaftar di `App.tsx` agar bookmark/redirect lama tidak 404, tapi melakukan `<Navigate to="/admin/ai-lab?section=...">`.

## File yang Disentuh

**Baru**
- `src/pages/admin/AdminAILab.tsx` — shell halaman, baca `?section=` & `?tab=` dari query string untuk deep-link.
- `src/components/admin/ai-lab/AILabNav.tsx` — vertical section nav (sidebar dalam halaman).
- `src/components/admin/ai-lab/sections/TrainingSection.tsx` — kombinasi 5 sub-tab training/tester.
- `src/components/admin/ai-lab/sections/KnowledgeSection.tsx`
- `src/components/admin/ai-lab/sections/PersonaSection.tsx`
- `src/components/admin/ai-lab/sections/TemplatesSection.tsx`
- `src/components/admin/ai-lab/sections/LogsSection.tsx`
- `src/components/admin/ai-lab/AITesterPanel.tsx` — extract isi `AdminChatbotTester.tsx` jadi panel reusable (route detail tetap pakai komponen yang sama).

**Diedit**
- `src/components/admin/AdminSidebar.tsx` — ganti 3 entri jadi 1 `AI Lab`, update `routePrefetchMap`.
- `src/App.tsx` — daftarkan route `/admin/ai-lab` lazy; ubah 3 route lama jadi `<Navigate>` ke section yang sesuai.
- `src/pages/admin/AdminGuestChatbot.tsx` & `AdminAdminChatbot.tsx` & `AdminChatbotTester.tsx` — disederhanakan jadi re-export `<Navigate>` (atau dihapus jika tidak diimpor lagi). Komponen tab existing (PersonaSettingsTab, TrainingTab, dst.) **tidak diubah** — hanya dipindah lokasinya di tree.

**Tidak disentuh**
- Edge functions, hooks (`useChatbot*`), tipe, dan tab-component itu sendiri (TrainingTab, KnowledgeBaseTab, PersonaSettingsTab, WhatsAppLearningTab, AdminTrainingTab, TrainingEmbeddingStatus, dst.) — agar perubahan murni UI/komposisi.

## Detail Teknis

- **Deep-link**: `/admin/ai-lab?section=training&tab=tester` → useSearchParams, default `section=training&tab=guest-examples`.
- **Lazy render**: section yang tidak aktif tidak dimount untuk hemat query (penting karena Tester & Logs cukup berat).
- **Mobile (<768px)**: AILabNav berubah jadi `<Select>` dropdown di atas konten.
- **Konsistensi**: tetap pakai semantic tokens dari `index.css`; section nav memakai `Card` + `SidebarMenuButton`-style aktif state.
- **Migrasi data**: tidak ada — semua hooks & tabel existing tetap dipakai apa adanya.

## Yang Tidak Termasuk

- Tidak menambah fitur AI baru.
- Tidak mengubah perilaku edge function chatbot/embedding.
- Tidak menyentuh layout `/admin/chat` (Web Chatbot live).
