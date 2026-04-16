# Edge Functions Catalog

## Overview

Daftar semua Supabase Edge Functions dan purpose-nya.

## Function Categories

### 🤖 AI & Chatbot

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `chatbot` | Guest-facing AI assistant with tool calling | No |
| `admin-chatbot` | Admin AI with role-based tool calling (SSE streaming) | Yes (Admin) |
| `chatbot-tools` | Tool execution endpoint (12 tools) — internal only | Yes (Internal Secret) |

### 🤖 Multi-Agent WhatsApp System

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `whatsapp-webhook` | Multi-agent WhatsApp entry point with orchestrator | Yes (Webhook Token) |
| `whatsapp-learning-agent` | Learning pipeline: analyze, FAQ, slang, promote | Yes (JWT / CRON_SECRET) |
| `validate-manager-token` | Validate manager WhatsApp tokens | Yes (Admin) |

### 🧠 AI Training & Knowledge

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `parse-knowledge` | Parse uploaded documents for guest chatbot KB | No |
| `parse-admin-knowledge` | Parse documents for admin chatbot KB | No |
| `extract-training-data` | Extract training examples from conversations | Yes (Admin) |
| `ai-trainer-coach` | AI-assisted training example improvement | Yes (Admin) |
| `ai-training-generator` | Generate training examples via AI | Yes (Admin) |
| `prompt-consultant` | AI prompt optimization consultant | Yes (Admin) |

### 📅 Booking & Availability

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `check-room-availability` | Check if room is available for dates | No |
| `notify-new-booking` | Send notifications on new booking | No (Internal) |
| `daily-checkin-reminder` | Send check-in reminders (CRON) | No |
| `push-availability` | Push availability to channel managers | No (Internal) |
| `sync-availability` | Sync availability with OTAs | No (Internal) |
| `retry-failed-syncs` | Retry failed availability syncs | No (CRON) |

### 💰 Invoice & Payment

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `generate-invoice` | Generate PDF invoice for booking | No |

### 📱 Communication

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `send-whatsapp` | Send WhatsApp message via Fonnte API | No (Internal) |
| `whatsapp-webhook` | Multi-agent WhatsApp processing (orchestrator + 7 agents) | Yes (Webhook Token) |

### 🔍 External Data

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `get-google-rating` | Fetch Google Maps rating | No |
| `scrape-competitor-prices` | Scrape competitor room prices | No (CRON) |
| `check-price-changes` | Detect competitor price changes | No (CRON) |

### 📊 SEO & Analytics

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `generate-sitemap` | Generate XML sitemap | No |
| `sitemap` | Serve sitemap.xml | No |

### 🧠 Knowledge Base

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `parse-knowledge` | Parse uploaded documents for chatbot | No |
| `parse-admin-knowledge` | Parse documents for admin chatbot | No |

### ⚙️ Channel Manager

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `test-channel-manager` | Test channel manager connection | Yes (Admin) |

### 💰 Pricing

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `auto-pricing` | Automatic price adjustments | No (CRON) |

---

## Function Details

### whatsapp-webhook (Multi-Agent System)

**Path**: `supabase/functions/whatsapp-webhook/`

**Structure**:
```
whatsapp-webhook/
├─ index.ts              # Slim entry point (CORS, auth, delegates to orchestrator)
├─ types.ts              # Shared types (EnvConfig, WhatsAppSession, ToolCall)
├─ agents/
│  ├─ orchestrator.ts    # Central routing hub (intent detection, context-aware routing)
│  ├─ intent.ts          # Name collection for new guests
│  ├─ booking.ts         # Full AI conversation with tool calling
│  ├─ faq.ts             # Tool-free FAQ via chatbot (faq_mode)
│  ├─ payment.ts         # Payment flow (bukti transfer, status)
│  ├─ complaint.ts       # 4-level urgency, empathy + staff notification
│  ├─ pricing.ts         # APPROVE/REJECT price changes (manager-only)
│  └─ manager.ts         # Routes to admin-chatbot
├─ middleware/
│  ├─ auth.ts            # Webhook token validation
│  ├─ rateLimiter.ts     # DB-backed rate limiting (10 msg/60s per phone)
│  ├─ messageBatcher.ts  # Batch rapid consecutive messages (3-10s window)
│  └─ sentiment.ts       # Negative sentiment alerts to Super Admins
├─ services/
│  ├─ session.ts         # Hotel settings cache, session management
│  ├─ conversation.ts    # Message logging, history retrieval (smart truncation)
│  ├─ fonnte.ts          # Fonnte WhatsApp API wrapper
│  └─ context.ts         # Extract booking codes, rooms, dates from history
└─ utils/
   ├─ slang.ts           # 40+ Indonesian slang/abbreviation normalization
   ├─ phone.ts           # Phone number normalization
   └─ format.ts          # WhatsApp formatting, name validation
```

**Agent Routing Flow**:
1. Orchestrator receives message, normalizes phone/message
2. Applies rate limiting (DB-backed) and message batching
3. Loads `agent_configs` + `escalation_rules` from DB
4. Detects intent via keyword matching
5. Routes to specialized agent based on intent + context
6. On error → escalates to human staff via WhatsApp

---

### whatsapp-learning-agent

**Path**: `supabase/functions/whatsapp-learning-agent/`

**Modes**:
| Mode | Purpose |
|------|---------|
| `deep_analyze` | Analyze unanalyzed WhatsApp conversations (parallel chunks of 3) |
| `detect_faq` | Cluster questions into FAQ patterns via AI |
| `detect_slang` | Find new Indonesian abbreviations/slang |
| `promote_faq` | Auto-promote top FAQ to training examples (10+ occurrences = auto-approve) |
| `learning_report` | Aggregate learning progress stats |
| `analyze_single` | Analyze a single conversation by ID |
| `auto_pipeline` | Run all modes sequentially (CRON daily 03:00 WIB) |

**AI Model**: Gemini 2.5 Flash via Lovable AI Gateway

**Database Tables**:
- `whatsapp_conversation_insights` — Per-conversation analysis results
- `whatsapp_faq_patterns` — Aggregated FAQ patterns
- `whatsapp_learning_metrics` — Daily learning progress metrics

---

### chatbot

**Path**: `supabase/functions/chatbot/`

**Structure**:
```
chatbot/
├─ index.ts           # Entry point
├─ lib/
│  ├─ cache.ts        # Memory caching
│  ├─ constants.ts    # Configuration
│  └─ types.ts        # TypeScript types
├─ services/
│  ├─ dataLoader.ts   # Load hotel data
│  ├─ dateParser.ts   # Parse date strings
│  ├─ exampleSelector.ts # Select training examples
│  ├─ greetingService.ts # Handle greetings
│  └─ settingsLoader.ts  # Load chatbot settings
├─ ai/
│  ├─ promptBuilder.ts # Build system prompt
│  └─ tools.ts        # AI tool definitions
└─ utils/
   └─ time.ts         # Time utilities
```

**Key Features**:
- Streaming responses (SSE)
- Memory caching for hotel data
- Context-aware conversations
- Tool calling for availability/booking

---

### admin-chatbot

**Path**: `supabase/functions/admin-chatbot/`

**Structure**:
```
admin-chatbot/
├─ index.ts
├─ lib/
│  ├─ auth.ts         # JWT validation
│  ├─ cache.ts        # Memory caching
│  ├─ constants.ts
│  ├─ dateHelpers.ts
│  ├─ knowledgeContext.ts
│  ├─ roleRestrictions.ts
│  ├─ roomMatcher.ts
│  ├─ streamResponse.ts
│  ├─ systemPrompt.ts
│  ├─ toolFilter.ts
│  ├─ types.ts
│  └─ auditLog.ts     # Audit logging
└─ tools/
   ├─ definitions.ts  # Tool schemas
   ├─ executor.ts     # Tool execution
   ├─ availability.ts
   ├─ bookingMutations.ts
   ├─ bookingStats.ts
   ├─ notifications.ts
   └─ roomManagement.ts
```

**Available Tools**:
1. `get_bookings` - Query bookings with filters
2. `create_booking` - Create new booking
3. `update_booking` - Update booking details
4. `cancel_booking` - Cancel a booking
5. `get_room_availability` - Check availability
6. `get_booking_stats` - Get statistics
7. `send_whatsapp` - Send notification
8. `get_today_arrivals` - Today's check-ins
9. `get_today_departures` - Today's check-outs

---

## Shared Utilities

**Path**: `supabase/functions/_shared/`

```
_shared/
├─ cors.ts              # CORS headers
├─ auth.ts              # Auth helpers
├─ error.ts             # Error response builder
├─ cache.ts             # Memory cache service
├─ logger.ts            # Structured logging
├─ supabase.ts          # Supabase client factory
├─ aiProvider.ts        # Lovable AI Gateway wrapper (Gemini/OpenAI/Claude)
├─ traceContext.ts      # Unified trace ID propagation across functions
├─ hallucinationGuard.ts # Post-AI validation (prices, codes, URLs, rooms)
├─ agentLogger.ts       # Fire-and-forget logging to agent_routing_logs
└─ agentConfigCache.ts  # In-memory cache for agent_configs & escalation_rules
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `LOVABLE_API_KEY` | Lovable AI Gateway key (Gemini/OpenAI) |
| `WHATSAPP_WEBHOOK_TOKEN` | Webhook auth token for Fonnte |
| `FONNTE_TOKEN` | Fonnte WhatsApp API token |
| `CRON_SECRET` | Secret for CRON-triggered functions |

---

## Deployment

Edge functions are automatically deployed by Lovable when changes are made to files in `supabase/functions/`.

To manually deploy:
```bash
supabase functions deploy <function-name>
```

---

## Logging

All functions log to Supabase Edge Function logs with structured format:
```typescript
console.log(JSON.stringify({
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: any,
  timestamp: string
}));
```

Access logs via:
1. Lovable Cloud panel
2. Supabase Dashboard → Edge Functions → Logs
