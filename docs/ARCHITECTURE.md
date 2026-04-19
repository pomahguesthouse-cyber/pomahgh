# Pomah Guesthouse - System Architecture

## Overview

Pomah Guesthouse adalah aplikasi hotel management system yang dibangun dengan:
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: Lovable AI Gateway (OpenAI/Gemini)

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  React App (Vite)                                                │
│  ├─ Public Pages (Index, Rooms, Explore)                        │
│  ├─ Admin Panel (Dashboard, Bookings, Multi-Agent Dashboard)    │
│  └─ Chatbot Widget (Guest & Admin)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                            │
├─────────────────────────────────────────────────────────────────┤
│  Edge Functions                    │  Database (PostgreSQL)     │
│  ├─ whatsapp-webhook (Multi-Agent) │  ├─ bookings               │
│  │   ├─ Orchestrator               │  ├─ rooms                  │
│  │   ├─ Intent Agent (name coll.)  │  ├─ hotel_settings         │
│  │   ├─ Booking Agent (+ Payment)  │  ├─ chat_conversations     │
│  │   ├─ FAQ Agent                  │  ├─ agent_configs          │
│  │   ├─ Complaint Agent            │  ├─ escalation_rules       │
│  │   ├─ Pricing Agent              │  ├─ agent_routing_logs     │
│  │   └─ Manager Agent              │  ├─ whatsapp_faq_patterns  │
│  │   └─ Manager Agent              │  ├─ whatsapp_conv_insights │
│  ├─ chatbot (Guest AI)            │  └─ ...                    │
│  ├─ admin-chatbot (Admin AI)      │                             │
│  ├─ chatbot-tools                 │                             │
│  ├─ whatsapp-learning-agent       │                             │
│  ├─ generate-invoice              │                             │
│  ├─ notify-new-booking            │                             │
│  ├─ send-whatsapp                 │                             │
│  └─ ...                           │                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│  ├─ Lovable AI Gateway (OpenAI/Gemini)                          │
│  ├─ Fonnte WhatsApp API                                         │
│  └─ Channel Managers (OTA integrations)                         │
└─────────────────────────────────────────────────────────────────┘
```

## Multi-Agent AI System

### Agent Architecture (Target)

```
                         ┌──────────────────────────────────────────────────────┐
                         │               WhatsApp (Fonnte API)                  │
                         └────────────────────────┬─────────────────────────────┘
                                                  ▼
                         ┌──────────────────────────────────────────────────────┐
                         │              whatsapp-webhook (Entry)                │
                         │   Auth → Rate Limiter → Message Batcher → Sentiment │
                         └────────────────────────┬─────────────────────────────┘
                                                  ▼
                    ┌─────────────────────────────────────────────────────────────────┐
                    │                     ORCHESTRATOR                                │
                    │                                                                 │
                    │  1. Normalize phone & message (slang → formal)                  │
                    │  2. Session management (new guest → Name Collection)             │
                    │  3. Fast-paths:                                                  │
                    │     • "foto kamar / brosur" → FAQ Agent                         │
                    │     • "berapa harga" → Price List Agent (daftar harga langsung)  │
                    │     • Manager phone → Manager Agent                             │
                    │     • Pricing approval reply → Pricing Agent                    │
                    │  4. Intent detection (keyword): faq | booking | complaint        │
                    │  5. Agent active check → fallback via escalation_rules           │
                    │  6. Error catch → Human Staff Escalation                        │
                    └──────┬──────────────────────┬───────────────────────┬────────────┘
                           │                      │                       │
                 ┌─────────▼──────────┐ ┌────────▼─────────┐  ┌─────────▼──────────┐
                 │    FAQ Agent       │ │  Booking Agent    │  │  Complaint Agent   │
                 │  (AI, no tools)    │ │  (AI + 12 tools)  │  │  (empathy + alert) │
                 │                    │ │                    │  │                    │
                 │ • Knowledge base   │ │ • check_avail     │  │ • Detect severity  │
                 │ • FAQ patterns     │ │ • create_booking   │  │ • Send empathy     │
                 │ • Room brochure    │ │ • get_bank_accts   │  │ • Log to DB        │
                 │                    │ │ • check_payment    │  │ • Notify manager   │
                 │ Escalation:        │ │ • cancel_booking   │  │   (always)         │
                 │ Can't answer →     │ │ • ...              │  │                    │
                 │  → Orchestrator    │ │                    │  │ Escalation:        │
                 │  → re-route       │ │  Sub-flows:        │  │ Severe/failed →    │
                 │    (via esc_rules) │ │  ┌──────────────┐  │  │  → Manager Agent   │
                 └────────────────────┘ │  │ Pricing      │  │  └────────────────────┘
                                        │  │ (need price) │  │
                                        │  ├──────────────┤  │
                                        │  │ Payment      │  │
                                        │  │ (user bayar) │  │
                                        │  │  ↓           │  │
                                        │  │ PaymentProof │  │
                                        │  │ (OCR foto)   │  │
                                        │  │  ↓           │  │
                                        │  │ PaymentAppr. │  │
                                        │  │ (mgr Y/N)   │  │
                                        │  └──────────────┘  │
                                        └────────────────────┘
                                                  │
                                          ┌───────▼────────┐
                                          │ Booking DB     │
                                          │ (bookings,     │
                                          │  rooms, etc.)  │
                                          └────────────────┘

Special Agents (not intent-routed):
  • Intent Agent     — Name collection for new/unknown guests
  • Price List Agent — Fast-path: generic price questions → room price table
  • Pricing Agent    — Manager APPROVE/REJECT price change requests
  • Manager Agent    — Routes manager messages to admin-chatbot

Web Chat → chatbot edge function → AI + tool calls → chatbot-tools
```

### Top-Level Intent Routing (3 intents)

| Intent | Keywords | Agent | Fallback |
|--------|----------|-------|----------|
| `faq` | tanya, info, jam, wifi, ... | FAQ Agent | → Booking (via escalation_rules) |
| `booking` | pesan, book, kamar, checkin, bayar, transfer, ... | Booking Agent | — (default) |
| `complaint` | keluhan, komplain, kecewa, kotor, ... | Complaint Agent | → Booking |

### Routing Flow

1. **Orchestrator** receives WhatsApp message, normalizes phone/message, applies rate limiting
2. Loads `agent_configs` and `escalation_rules` from DB (cached per-request)
3. Fast-paths checked first (room photo, generic price, manager, pricing approval)
4. Detects intent via keyword matching: `faq | booking | complaint`
5. Payment keywords (`bayar`, `transfer`, `rekening`) → **Booking Agent** (handles payment sub-flow via tools)
6. Agent active check → fallback via `escalation_rules` → default: Booking
7. FAQ escalation: FAQ can't answer → re-routed by Orchestrator via `escalation_rules`
8. On errors → escalates to human staff via WhatsApp notification

### Middleware Pipeline

- **Auth**: Validates `WHATSAPP_WEBHOOK_TOKEN` via headers/query params
- **Rate Limiter**: DB-backed rate limit (10 messages/60s per phone)
- **Message Batcher**: Batches rapid consecutive messages (3-10s window)
- **Sentiment Monitor**: Fire-and-forget negative sentiment alerts to Super Admins

### Learning Pipeline (CRON daily 03:00 WIB)

```
whatsapp-learning-agent (Gemini 2.5 Flash)
  ├→ deep_analyze    — Analyze unanalyzed conversations (parallel chunks of 3)
  ├→ detect_faq      — Cluster questions into FAQ patterns via AI
  ├→ detect_slang    — Find new Indonesian abbreviations/slang
  ├→ promote_faq     — Auto-promote top FAQ to training examples (10+ occurrences)
  └→ learning_report — Aggregate stats for dashboard
```

### Safety Guards

- **Hallucination Guard**: Post-AI validation catches fabricated prices, booking codes, URLs, unknown rooms
- **Stuck Response Detector**: Retries if AI returns "mohon tunggu" without calling tools
- **Trace Context**: Unified trace ID propagation across webhook → chatbot → chatbot-tools

## Directory Structure

```
src/
├─ features/           # Feature-based modules (booking, rooms, chatbot)
├─ shared/             # Reusable UI components
├─ admin/              # Admin-specific features
├─ pages/              # Route pages (thin)
├─ lib/                # Core utilities
├─ types/              # Shared TypeScript types
├─ contexts/           # React contexts
└─ integrations/       # External service integrations

supabase/functions/
├─ _shared/            # Shared utilities (traceContext, aiProvider, hallucinationGuard, agentLogger)
├─ whatsapp-webhook/   # Multi-agent WhatsApp entry point
│  ├─ agents/          # Orchestrator + 6 specialized agents (FAQ, Booking, Complaint, Pricing, Manager, Intent)
│  ├─ middleware/       # Auth, rate limiter, message batcher, sentiment
│  ├─ services/        # Session, conversation, fonnte, context
│  └─ utils/           # Slang normalization, phone, formatting
├─ chatbot/            # Guest AI chatbot (prompt builder, tools, example selector)
├─ admin-chatbot/      # Admin AI chatbot with role-based tools
├─ chatbot-tools/      # Tool execution endpoint (12 tool handlers)
├─ whatsapp-learning-agent/  # Learning pipeline (CRON daily)
└─ ...                 # Other functions
```

## Key Design Principles

### 1. Feature-Based Organization
- Each feature (booking, rooms, chatbot) is self-contained
- Components, hooks, services, and types colocated
- Easy to find, test, and maintain

### 2. Separation of Concerns
- UI components don't access Supabase directly
- Business logic in hooks and services
- Edge functions for server-side operations

### 3. Caching Strategy
- Edge function memory cache (TTL-based)
- Frontend React Query cache
- Conversation context persistence

### 4. Security
- Row Level Security (RLS) on all tables
- JWT validation in edge functions
- Admin role verification

## Data Flow

### Guest Booking Flow
```
User → BookingDialog → useBooking hook → Supabase insert
                                       → notify-new-booking function
                                       → WhatsApp notification
```

### Chatbot Flow
```
User message → useChatbot hook → chatbot edge function
                               → AI Gateway (OpenAI/Gemini)
                               → Tool calls (availability, booking)
                               → Response stream
```

## Performance Optimizations

1. **Database Caching**: Hotel data cached 10 minutes in edge functions
2. **Parallel Queries**: Multiple DB queries executed simultaneously
3. **Lazy Loading**: Components loaded on demand
4. **Image Optimization**: Supabase storage with transformations
