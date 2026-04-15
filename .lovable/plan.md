

# Refactor: Explicit Multi-Agent Architecture

## Situasi Saat Ini

Sistem chatbot WhatsApp sudah berjalan dengan **1570 baris** di `whatsapp-webhook/index.ts` (monolitik) dan AI tool-calling pattern di `chatbot/index.ts`. Semua logic tercampur dalam satu file besar.

## Tujuan

Memecah arsitektur menjadi **explicit multi-agent** dengan file terpisah, tanpa mengubah behavior yang sudah berjalan. Ini adalah **refactor internal** — user experience tetap sama.

## Arsitektur Baru

```text
whatsapp-webhook/
├── index.ts              ← Entry point (slim ~100 lines)
├── agents/
│   ├── orchestrator.ts   ← Routing logic, session management
│   ├── intent.ts         ← Intent detection + context extraction  
│   ├── booking.ts        ← Booking creation/update flow
│   ├── pricing.ts        ← Price calculation, long-stay
│   ├── payment.ts        ← Payment status, proof, methods
│   └── faq.ts            ← FAQ, facilities, general questions
├── middleware/
│   ├── auth.ts           ← Webhook token validation
│   ├── rateLimiter.ts    ← Rate limiting logic
│   ├── messageBatcher.ts ← Message batching/debounce
│   └── sentiment.ts      ← Negative sentiment detection
├── services/
│   ├── fonnte.ts         ← WhatsApp send via Fonnte API
│   ├── session.ts        ← Session CRUD operations
│   ├── conversation.ts   ← Conversation logging, history
│   └── context.ts        ← Context extraction from history
└── utils/
    ├── phone.ts          ← Phone normalization
    ├── slang.ts          ← Indonesian slang normalizer
    └── format.ts         ← WhatsApp formatting

chatbot/
├── index.ts              ← AI gateway (unchanged behavior)
├── agents/               ← NEW: Agent-specific prompts
│   ├── intentPrompt.ts   ← Intent-focused system prompt section
│   ├── bookingPrompt.ts  ← Booking rules prompt section
│   └── paymentPrompt.ts  ← Payment rules prompt section
├── ai/
│   ├── promptBuilder.ts  ← Assembles prompts from agent sections
│   └── tools.ts          ← Tool definitions (unchanged)
├── lib/                  ← Types, constants (unchanged)
├── services/             ← Data loaders (unchanged)
└── utils/                ← Time utils (unchanged)
```

## Perubahan Detail

### 1. `whatsapp-webhook/index.ts` → Slim entry point
- Hanya serve() handler, parse body, delegate ke orchestrator
- ~100 baris vs 1570 baris saat ini

### 2. `agents/orchestrator.ts` — Pusat Kontrol
- Pindahkan routing logic (manager/guest/takeover/manual mode)
- Session timeout check
- Price approval handling
- Memanggil `intent.ts` untuk klasifikasi, lalu route ke agent yang sesuai

### 3. `agents/intent.ts` — Deteksi Maksud
- Pindahkan `extractConversationContext()` (line 251-423)
- Pindahkan `isLikelyPersonName()` (line 196-213)
- Name collection flow (new session, awaiting_name)
- Return: `{ intent, context, nextAgent }`

### 4. `agents/booking.ts` — Handle Booking
- Booking context from DB (`getLatestBookingContextByPhone`)
- Stuck response detector + retry logic
- Post-booking correction flow

### 5. `agents/pricing.ts` — Harga
- Long-stay inquiry detection
- Price approval (APPROVE/REJECT command parsing, line 740-953)

### 6. `agents/payment.ts` — Pembayaran
- Payment proof notification routing
- Payment status check delegation

### 7. `agents/faq.ts` — FAQ
- Greeting/fallback responses
- Generic question handling

### 8. `middleware/` — Cross-cutting concerns
- `auth.ts`: Token validation (line 556-604)
- `rateLimiter.ts`: Rate limit map (line 9-125)
- `messageBatcher.ts`: Batch logic (line 14-100)
- `sentiment.ts`: Negative detection + alert (line 488-536)

### 9. `services/` — Shared services
- `fonnte.ts`: Single `sendWhatsApp(phone, message)` function
- `session.ts`: Session upsert, update, ensure conversation
- `conversation.ts`: `logMessage()`, get history
- `context.ts`: Context extraction consolidated

### 10. `chatbot/agents/` — Prompt sections
- Split `buildBookingFlowRules()` into dedicated agent prompt files
- `promptBuilder.ts` assembles them (same output, cleaner code)

## Yang TIDAK Berubah
- `chatbot-tools/` — Tool handlers tetap sama
- `chatbot/ai/tools.ts` — Tool definitions tetap sama
- Database schema — Tidak ada migrasi
- AI model & gateway — Tetap google/gemini-2.5-flash
- User experience — Response quality & behavior identik

## Urutan Implementasi
1. Extract utilities (phone, slang, format) ke `utils/`
2. Extract middleware (auth, rate limiter, batcher, sentiment) ke `middleware/`
3. Extract services (fonnte, session, conversation, context) ke `services/`
4. Extract agents (orchestrator, intent, booking, pricing, payment, faq) ke `agents/`
5. Rewrite `index.ts` sebagai slim entry point
6. Split chatbot prompt sections ke `chatbot/agents/`
7. Deploy & test via curl

## Catatan Teknis
- Semua file baru adalah **Deno modules** (`*.ts`) dengan import relatif
- Type definitions dipindah ke `types.ts` di root function
- Setiap agent memiliki interface `AgentResult { response?: string; nextAgent?: string; context: Record }`
- Orchestrator loop max 3 hops antar agent untuk mencegah infinite routing

