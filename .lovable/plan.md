## Tujuan
Halaman admin baru `/admin/chatbot-tester` di mana admin bisa:
1. **Skenario tersimpan** — kelola library skenario booking (mis. "Tamu booking 1 kamar 17–18 Mei + ada add-on") dengan langkah pesan & expected outcome.
2. **Live Sim** — ketik pesan tamu satu-per-satu seolah WhatsApp, lihat balasan bot real-time.
3. **Replay log** — pilih conversation lama dari `chat_messages`, jalankan ulang, agent AI menilai kualitas tiap balasan.

Semua mode memanggil **`whatsapp-webhook` penuh** (production flow) supaya hasilnya 100% representatif. Untuk mencegah WA asli terkirim ke tamu, ditambahkan **mode test** yang men-skip `sendWhatsApp` (Fonnte) dan mengembalikan reply lewat response body.

## Cakupan V1
**Booking flow normal saja**: tanggal → cek availability → pilih kamar → konfirmasi data tamu → instruksi pembayaran. (Eskalasi multi-room/refund dipersiapkan strukturnya tapi belum jadi skenario default — bisa ditambah admin manual.)

## Arsitektur

```text
┌──────────────────────┐    invoke     ┌──────────────────────┐
│  /admin/chatbot-     │──────────────▶│  chatbot-test-runner │
│  tester (UI)         │               │  (edge function)     │
└──────────────────────┘               └──────┬───────────────┘
                                              │ POST + X-Test-Mode: 1
                                              ▼
                                       ┌──────────────────────┐
                                       │  whatsapp-webhook    │
                                       │  (skip Fonnte send,  │
                                       │  return reply JSON)  │
                                       └──────┬───────────────┘
                                              │ writes to
                                              ▼
                                       ┌──────────────────────┐
                                       │ chat_test_runs       │
                                       │ chat_test_messages   │
                                       └──────────────────────┘
                                              │
                                              ▼ Lovable AI eval
                                       ┌──────────────────────┐
                                       │ skor + assertions    │
                                       └──────────────────────┘
```

## Database (1 migrasi baru)

- **`chat_test_scenarios`** — library skenario.
  - `name`, `description`, `category` (`booking_normal` | `escalation` | `faq` | `edge_case`)
  - `steps` (jsonb): `[{ user_message, expected_assertions: ["mentions_check_in_date", "asks_room_choice", "no_escalation"] }, ...]`
  - `expected_final_outcome` (text bebas), `is_active`, `created_by`
- **`chat_test_runs`** — eksekusi 1 skenario / live sim / replay.
  - `scenario_id` (nullable), `mode` (`scenario` | `live` | `replay`), `source_conversation_id` (nullable, untuk replay)
  - `status` (`running` | `passed` | `failed` | `error`)
  - `overall_score` (0–100), `accuracy_score`, `tone_score`, `escalation_score`
  - `summary`, `recommendations` (text), `started_at`, `finished_at`, `triggered_by`
- **`chat_test_messages`** — transcript per langkah.
  - `run_id`, `step_index`, `role` (`user` | `bot` | `system`), `content`
  - `assertions` (jsonb): `[{ name, passed, reason }]`
  - `latency_ms`
- RLS: hanya admin/super_admin (pakai `has_role`).

## Edge function baru: `chatbot-test-runner`

Endpoints (POST dengan `action`):
- `start_scenario` — buat run, eksekusi semua steps berurutan, tunggu balasan, simpan. Setelah selesai panggil evaluator.
- `live_step` — kirim 1 pesan untuk run mode `live`, kembalikan balasan bot ke UI segera.
- `start_replay` — ambil semua user message dari `source_conversation_id`, jalankan urut, evaluator menilai bot baru vs bot lama.
- `evaluate_run` — kirim transcript ke Lovable AI (`google/gemini-2.5-pro`) dengan prompt evaluator → mengisi skor + saran + assertion technical.

Memanggil `whatsapp-webhook` dengan:
- header `X-Test-Mode: 1` + `X-Internal-Secret: CHATBOT_TOOLS_INTERNAL_SECRET`
- nomor telepon test khusus prefix `99999` (mis. `9999900001`) supaya tidak menabrak nomor tamu sungguhan.

## Perubahan kecil di `whatsapp-webhook`
- Validasi header `X-Test-Mode: 1` + secret internal → set `env.testMode = true`.
- `services/fonnte.ts` `sendWhatsApp` → kalau `testMode`, skip HTTP ke Fonnte, hanya kembalikan `{ ok: true, simulated: true }`.
- `chat_messages` & `whatsapp_sessions` insert dipisah dengan flag `is_test = true` agar tidak mencemari analytics produksi.
- Reply text terakhir dikembalikan di response JSON (`{ status, last_reply }`) supaya runner bisa langsung tampilkan.

## Evaluator (Lovable AI)
Prompt sistem mendefinisikan rubrik:
- **Akurasi** (tanggal benar, harga benar, nama kamar benar)
- **Tone** (sesuai persona: max 1 emoji, ringkas, sopan)
- **Eskalasi** (apakah bot tepat eskalasi/lanjutkan flow)
- **Format** (dd/MM/yyyy, Rp dengan separator ID)
- **Konteks** (tidak bertanya ulang info yang sudah disebut tamu)

Output JSON: `{ overall_score, accuracy_score, tone_score, escalation_score, summary, recommendations, per_step_assertions: [{ step_index, assertions: [{ name, passed, reason }] }] }`.

Untuk **assertions teknis** (deterministik) jalan duluan tanpa AI:
- Regex check `mentions_check_in_date`, `mentions_room_name`, `contains_price_rupiah`, `escalated_to_admin`, dll.
- Hasil deterministik + skor AI digabung jadi pass/fail final.

## UI: `/admin/chatbot-tester`

Halaman dengan 3 tab (`Tabs` shadcn) + sticky header "Chatbot Tester":

**Tab 1 — Skenario**
- Daftar skenario (DataTable). Tombol **+ Skenario baru** (atas) → dialog dengan: nama, kategori, langkah-langkah (drag/reorder), assertion teknis per langkah.
- Action per row: **Run** (jalankan, redirect ke detail run), Edit, Duplicate, Hapus.
- Filter kategori, search.

**Tab 2 — Live Sim**
- Layout chat 2-kolom: kiri "Tamu" (input), kanan "Bot" (balasan). Tombol "Reset session" hapus state test.
- Tampilkan latency + assertion teknis instan di bawah tiap balasan.

**Tab 3 — Replay**
- Search conversation_id atau pilih dari dropdown 50 percakapan terbaru.
- Tombol **Replay** → buat run mode replay, tampilkan side-by-side: balasan bot lama vs bot baru, dengan diff.

**Halaman detail run** `/admin/chatbot-tester/runs/:id`
- Header: skor besar (0–100) + breakdown per kategori, badge pass/fail.
- Transcript tamu↔bot dengan badge assertion per balasan.
- Section "Rekomendasi" dari evaluator AI.
- Tombol "Re-run" & "Export markdown".

## Hooks & services frontend
- `src/hooks/useChatbotTester.tsx`: `useScenarios`, `useScenarioRuns`, `useRunDetail`, `useStartScenario`, `useLiveStep`, `useStartReplay`.
- `src/features/chatbot-tester/` folder: types, services (panggil edge function), components (`ScenarioForm`, `LiveSimChat`, `ReplayPicker`, `RunScoreCard`, `TranscriptViewer`, `AssertionBadge`).

## Routing & navigasi
- Tambah route di `src/App.tsx`: `/admin/chatbot-tester` & `/admin/chatbot-tester/runs/:id`.
- Tambah menu item di sidebar admin di bawah grup "Chatbot": "Tester AI".
- Lindungi route dengan `useAdminCheck`.

## Keamanan
- Edge function `chatbot-test-runner` cek `Authorization: Bearer <jwt>` user + role admin via `has_role`.
- Header `X-Test-Mode: 1` hanya diterima `whatsapp-webhook` jika juga ada `X-Internal-Secret` cocok dengan `CHATBOT_TOOLS_INTERNAL_SECRET`.
- Test phone harus prefix `99999` — webhook reject kalau prefix bukan itu saat testMode aktif.
- Insert ke `chat_test_*` tidak menyentuh `whatsapp_sessions` produksi.

## Setelah V1 (di luar scope, untuk roadmap)
- Skenario eskalasi (multi-room, refund, update PMH-) sebagai preset
- Skenario edge case tanggal & slang
- Cron menjalankan suite skenario tiap deploy → regression alerts
- Compare 2 versi bot (A/B) di run yang sama
