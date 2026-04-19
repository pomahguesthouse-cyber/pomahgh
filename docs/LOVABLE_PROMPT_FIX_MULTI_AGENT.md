# PROMPT LOVABLE — Fix Multi-Agent WhatsApp System

Perbaiki 6 bug kritis pada sistem multi-agent WhatsApp chatbot hotel. Semua perubahan harus dilakukan pada file yang sudah ada — jangan buat komponen atau halaman baru kecuali migration SQL.

---

## BUG 1: messageBatcher Duplicate Processing on RPC Error

**File:** `supabase/functions/whatsapp-webhook/middleware/messageBatcher.ts`

**Masalah:** Ketika `append_pending_message` RPC gagal, fallback langsung return `[newMessage]` tanpa cek apakah invokasi lain sudah memasukkan pesan yang sama ke buffer. Akibatnya pesan diproses 2x (duplikat).

**Fix:** Setelah RPC error, query `whatsapp_sessions.pending_messages` untuk phone number tersebut. Jika `newMessage` sudah ada di array `pending_messages`, return `null` (defer ke invokasi lain). Hanya return `[newMessage]` jika pesan benar-benar belum ada di buffer.

```typescript
// Setelah rpcError:
const { data: existing } = await supabase
  .from('whatsapp_sessions')
  .select('pending_messages')
  .eq('phone_number', phone)
  .maybeSingle();

const pending = existing?.pending_messages as string[] | null;
if (pending && pending.includes(newMessage)) {
  console.log(`📦 RPC failed but message already in pending buffer, deferring`);
  return null;
}
return [newMessage];
```

---

## BUG 2: Admin Chatbot Forced Tool Execution Logs `arguments: {}` Instead of Actual Args

**File:** `supabase/functions/admin-chatbot/index.ts`

**Masalah:** Di block forced execution untuk `get_room_prices` (sekitar baris 230-250), `logToolExecution` dan `executedTools.push` keduanya pakai `arguments: {}` hardcoded, padahal args sebenarnya sudah di-extract ke variabel `forcedArgs`.

**Fix:** Ganti semua `arguments: {}` di block forced execution menjadi `arguments: forcedArgs`. Contoh:

```typescript
const roomNameMatch = userMessage.match(/(?:kamar|room|tipe|type)\s+(\w+)/i);
const forcedArgs = roomNameMatch ? { room_name: roomNameMatch[1] } : {};
const roomToolResult = await executeToolWithValidation(supabase, 'get_room_prices', forcedArgs, auth.managerRole);

logToolExecution(supabase, {
  trace_id: trace.traceId,
  tool_name: 'get_room_prices',
  arguments: forcedArgs,  // ← BUKAN {} tapi forcedArgs
  ...
});

executedTools.push({
  tool_name: 'get_room_prices',
  arguments: forcedArgs,  // ← BUKAN {} tapi forcedArgs
  ...
});
```

---

## BUG 3: Dashboard Multi-Agent — Response Time Semua Agent Sama

**File:** `src/hooks/useMultiAgentDashboard.ts`

**Masalah:** `avgResponseTime` di setiap agent card menampilkan angka yang sama (global average) karena tidak dihitung per-agent.

**Fix:** Di `statsQuery`, hitung response time per-agent dari `agent_routing_logs.duration_ms` berdasarkan `to_agent`:

```typescript
// Di statsQuery queryFn, setelah load todayRoutings:
const agentDurations: Record<string, number[]> = {};
todayRoutings?.forEach(r => {
  if (r.to_agent && r.duration_ms && r.duration_ms > 0) {
    if (!agentDurations[r.to_agent]) agentDurations[r.to_agent] = [];
    agentDurations[r.to_agent].push(r.duration_ms);
  }
});

const agentAvgResponseMs: Record<string, number> = {};
for (const [agentId, durations] of Object.entries(agentDurations)) {
  agentAvgResponseMs[agentId] = durations.reduce((a, b) => a + b, 0) / durations.length;
}
```

Return `agentAvgResponseMs` dari statsQuery. Lalu di mapping agent, gunakan per-agent value dulu, fallback ke global:

```typescript
avgResponseTime: statsQuery.data?.agentAvgResponseMs?.[config.agent_id]
  ? `${(statsQuery.data.agentAvgResponseMs[config.agent_id] / 1000).toFixed(1)}s`
  : statsQuery.data?.avgResponseMs
    ? `${(statsQuery.data.avgResponseMs / 1000).toFixed(1)}s`
    : '-',
```

---

## BUG 4: Dashboard Multi-Agent — Success Rate Selalu 100%

**File:** `src/hooks/useMultiAgentDashboard.ts`

**Masalah:** Success rate di-filter dengan `l.from_agent === config.agent_id`, tapi semua routing selalu punya `from_agent = 'orchestrator'`. Jadi agent lain tidak pernah match → success rate selalu 100%.

**Fix:** Ganti filter menjadi:
```typescript
const agentLogs = todayLogs.filter(l => l.to_agent === config.agent_id || l.from_agent === config.agent_id);
```

---

## BUG 5: Dashboard Multi-Agent — 2 Agent Hilang, Payment Sub-Agent Salah Struktur, Label Salah

**File:** `src/hooks/useMultiAgentDashboard.ts`, `src/components/admin/multi-agent/AgentGrid.tsx`, `src/components/admin/multi-agent/AgentMetrics.tsx`

**Masalah:**
1. Agent `price_list` dan `room_brochure` tidak muncul di dashboard karena belum ada di `agent_configs` table dan belum ada switch case di hook.
2. Agent `payment_proof` dan `payment_approval` ditampilkan sebagai agent terpisah, padahal seharusnya adalah **sub-agent dari Payment Agent**. Di backend, orchestrator route langsung ke `payment_proof` (gambar masuk) dan `payment_approval` (manager YA/TIDAK) tanpa melewati payment agent, sehingga Payment Agent chatCount = 0. Semua aktivitas payment seharusnya diagregasi ke Payment Agent.
3. Label "Respons Hari Ini" di `AgentMetrics` menyesatkan — seharusnya "Pesan Hari Ini" karena menghitung total pesan, bukan respons.

### Arsitektur Sub-Agent Payment

Backend routing yang terjadi di `orchestrator.ts`:
```
Gambar masuk (bukti transfer)  → to_agent: 'payment_proof'     → OCR → notify manager
Manager reply YA/TIDAK         → to_agent: 'payment_approval'  → approve/reject
Pesan teks soal pembayaran     → to_agent: 'payment'           → info bank, cara bayar
```

Semua itu adalah satu **payment flow**. Di dashboard, `payment_proof` dan `payment_approval` TIDAK boleh tampil sebagai card terpisah. Sebaliknya, chatCount, successRate, dan avgResponseTime Payment Agent harus **mengagregasi** data dari `payment` + `payment_proof` + `payment_approval`.

**Fix A:** Tambahkan SEMUA agent ke `BACKEND_FILES` map (termasuk sub-agents, untuk referensi file backend):
```typescript
const BACKEND_FILES: Record<string, string> = {
  orchestrator: 'orchestrator.ts',
  intent: 'intent.ts',
  booking: 'booking.ts',
  faq: 'faq.ts',
  payment: 'payment.ts',
  complaint: 'complaint.ts',
  pricing: 'pricing.ts',
  manager: 'manager.ts',
  payment_proof: 'paymentProof.ts',
  payment_approval: 'paymentApproval.ts',
  price_list: 'priceList.ts',
  room_brochure: 'roomBrochure.ts',
};
```

**Fix B — Agregasi sub-agent payment:** Di switch case `payment`, gabungkan chatCount dari ketiga routing:
```typescript
case 'payment':
  status = guestSessions.length > 0 ? 'active' : 'idle';
  chatCount = (routingCounts['payment'] || 0) 
            + (routingCounts['payment_proof'] || 0) 
            + (routingCounts['payment_approval'] || 0);
  break;
```

Untuk `avgResponseTime` payment agent, gabungkan juga durasi dari sub-agents. Di statsQuery, setelah menghitung `agentAvgResponseMs`, tambahkan aggregasi:
```typescript
// Aggregate payment sub-agent durations into payment agent
const paymentDurations = [
  ...(agentDurations['payment'] || []),
  ...(agentDurations['payment_proof'] || []),
  ...(agentDurations['payment_approval'] || []),
];
if (paymentDurations.length > 0) {
  agentAvgResponseMs['payment'] = paymentDurations.reduce((a, b) => a + b, 0) / paymentDurations.length;
}
```

Untuk `successRate` payment agent, gabungkan juga logs dari sub-agents:
```typescript
// In agent mapping, for success rate calculation:
const PAYMENT_SUB_AGENTS = ['payment', 'payment_proof', 'payment_approval'];
const agentLogs = config.agent_id === 'payment'
  ? todayLogs.filter(l => PAYMENT_SUB_AGENTS.includes(l.to_agent) || PAYMENT_SUB_AGENTS.includes(l.from_agent))
  : todayLogs.filter(l => l.to_agent === config.agent_id || l.from_agent === config.agent_id);
```

**Fix C — Sembunyikan sub-agent dari grid:** Filter agent list agar `payment_proof` dan `payment_approval` tidak ditampilkan sebagai card terpisah. Di `useMultiAgentDashboard`, setelah mapping agents, tambahkan filter:
```typescript
// Sub-agents yang diagregasi ke parent agent — jangan tampilkan sebagai card terpisah
const HIDDEN_SUB_AGENTS = ['payment_proof', 'payment_approval'];
const visibleAgents = agents.filter(a => !HIDDEN_SUB_AGENTS.includes(a.id));
```

Return `visibleAgents` sebagai property terpisah (misalnya `displayAgents`) atau ganti `agents` dengan yang sudah difilter. `AgentGrid` harus menerima list yang sudah difilter ini.

**Fix D:** Tambahkan switch case untuk `price_list` dan `room_brochure` (2 agent baru yang tampil sebagai card terpisah):
```typescript
case 'price_list':
  status = guestSessions.length > 0 ? 'active' : 'idle';
  chatCount = routingCounts['price_list'] || 0;
  break;
case 'room_brochure':
  status = guestSessions.length > 0 ? 'active' : 'idle';
  chatCount = routingCounts['room_brochure'] || 0;
  break;
```

**Fix E:** Buat migration SQL baru untuk seed 4 agent ke `agent_configs` (payment_proof & payment_approval tetap perlu ada di DB untuk `getEscalationTarget()` fallback, tapi hidden di UI):

```sql
INSERT INTO public.agent_configs (agent_id, name, role, icon, category, tags, temperature, escalation_target, auto_escalate)
VALUES
  ('payment_proof', 'Payment Proof Agent', 'Sub-agent: OCR bukti transfer, match ke booking', '🧾', 'specialist', '{"payment","ocr","proof"}', 0.1, 'payment_approval', false),
  ('payment_approval', 'Payment Approval Agent', 'Sub-agent: Proses YA/TIDAK manager untuk konfirmasi', '✅', 'manager', '{"manager","approval"}', 0.1, NULL, false),
  ('price_list', 'Price List Agent', 'Fast-path daftar harga semua kamar', '📋', 'specialist', '{"pricing","fast","info"}', 0.1, 'booking', false),
  ('room_brochure', 'Room Brochure Agent', 'Fast-path kirim foto kamar dan brosur', '🖼️', 'specialist', '{"media","brochure","fast"}', 0.1, 'booking', false)
ON CONFLICT (agent_id) DO NOTHING;
```

**Fix F:** Di `AgentMetrics.tsx`, ganti label `'Respons Hari Ini'` → `'Pesan Hari Ini'`.

---

## BUG 6: Escalation Rules Data Salah — Tidak Sesuai Backend

**Masalah:** Tabel `escalation_rules` berisi 5 seed rule dari migration awal, tapi 4 dari 5 SALAH:
- ❌ `intent → faq` — ini orchestrator routing, bukan eskalasi
- ❌ `intent → booking` — sama, orchestrator routing
- ❌ `booking → manager` — tidak ada di kode backend
- ❌ `pricing → booking` — tidak ada di kode backend
- ✅ `faq → booking` — satu-satunya yang benar

**Fix:** Buat migration SQL baru yang:
1. DELETE 4 rule yang salah:
```sql
DELETE FROM public.escalation_rules 
WHERE (from_agent = 'intent' AND to_agent = 'faq')
   OR (from_agent = 'intent' AND to_agent = 'booking')
   OR (from_agent = 'booking' AND to_agent = 'manager')
   OR (from_agent = 'pricing' AND to_agent = 'booking');
```

2. UPDATE deskripsi rule yang benar:
```sql
UPDATE public.escalation_rules
SET condition_text = 'FAQ butuh tools (cek ketersediaan, harga) → eskalasi ke booking agent', priority = 1
WHERE from_agent = 'faq' AND to_agent = 'booking';
```

3. INSERT rule baru yang sesuai backend:
```sql
INSERT INTO public.escalation_rules (from_agent, to_agent, condition_text, priority, is_active)
VALUES
  ('complaint', 'human_staff', 'Semua keluhan tamu otomatis di-eskalasi ke manager via WhatsApp', 2, true),
  ('payment_proof', 'payment_approval', 'OCR bukti transfer selesai → kirim ke manager untuk konfirmasi YA/TIDAK', 3, true),
  ('payment', 'booking', 'Info pembayaran diberikan, tamu mungkin perlu lanjut ke proses booking', 4, true),
  ('price_list', 'booking', 'Tamu sudah lihat daftar harga → lanjut tanya ketersediaan/booking', 5, true),
  ('room_brochure', 'booking', 'Tamu sudah lihat foto/brosur kamar → lanjut booking', 6, true),
  ('booking', 'human_staff', 'Error atau tamu stuck berulang → eskalasi ke staff manusia', 7, true),
  ('payment_approval', 'booking', 'Pembayaran dikonfirmasi manager → kirim booking order ke tamu', 8, true)
ON CONFLICT DO NOTHING;
```

---

## RINGKASAN PERUBAHAN

| # | File | Tipe Fix |
|---|------|----------|
| 1 | `supabase/functions/whatsapp-webhook/middleware/messageBatcher.ts` | Dedup check sebelum fallback |
| 2 | `supabase/functions/admin-chatbot/index.ts` | `arguments: {}` → `arguments: forcedArgs` |
| 3 | `src/hooks/useMultiAgentDashboard.ts` | Per-agent response time dari routing logs |
| 4 | `src/hooks/useMultiAgentDashboard.ts` | Success rate filter `to_agent \|\| from_agent` |
| 5a | `src/hooks/useMultiAgentDashboard.ts` | Payment sub-agent agregasi (chatCount, successRate, avgResponseTime) |
| 5b | `src/hooks/useMultiAgentDashboard.ts` | Hide payment_proof & payment_approval dari grid (diagregasi ke payment) |
| 5c | `src/hooks/useMultiAgentDashboard.ts` | BACKEND_FILES + switch case price_list & room_brochure |
| 5d | `src/components/admin/multi-agent/AgentMetrics.tsx` | Label "Pesan Hari Ini" |
| 5e | Migration SQL baru | Seed 4 agent configs (2 hidden sub-agent + 2 visible) |
| 6 | Migration SQL baru | Delete 4 wrong rules, insert 7 correct rules |

### Konsep Sub-Agent

```
Payment Agent (card di dashboard)
  ├── payment.ts        — info bank, cara bayar (to_agent: 'payment')
  ├── paymentProof.ts   — OCR bukti transfer (to_agent: 'payment_proof')  [HIDDEN]
  └── paymentApproval.ts — YA/TIDAK manager (to_agent: 'payment_approval') [HIDDEN]
```

`payment_proof` dan `payment_approval` TETAP ada di `agent_configs` (dibutuhkan `getEscalationTarget()`) tapi **tidak ditampilkan** sebagai card terpisah di AgentGrid. Semua metrik mereka diagregasi ke Payment Agent card.

Semua fix harus idempotent — gunakan `ON CONFLICT DO NOTHING` di SQL dan jangan duplikasi logic yang sudah ada.
