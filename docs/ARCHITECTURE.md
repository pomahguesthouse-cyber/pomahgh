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
│  │   ├─ Intent Agent               │  ├─ hotel_settings         │
│  │   ├─ Booking Agent              │  ├─ chat_conversations     │
│  │   ├─ FAQ Agent                  │  ├─ agent_configs          │
│  │   ├─ Payment Agent              │  ├─ escalation_rules       │
│  │   ├─ Complaint Agent            │  ├─ agent_routing_logs     │
│  │   ├─ Pricing Agent              │  ├─ whatsapp_faq_patterns  │
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

### Agent Architecture

```
WhatsApp (Fonnte) → whatsapp-webhook → Orchestrator
                                         ├→ Intent Agent    (name collection for new guests)
                                         ├→ Booking Agent   (AI + 12 tools via chatbot-tools)
                                         ├→ FAQ Agent       (AI, no tools - faq_mode)
                                         ├→ Payment Agent   (payment flow + bukti transfer)
                                         ├→ Complaint Agent (empathy + escalation to staff)
                                         ├→ Pricing Agent   (APPROVE/REJECT price changes)
                                         └→ Manager Agent   (routes to admin-chatbot)

Web Chat → chatbot edge function → AI + tool calls → chatbot-tools
```

### Agent Routing

1. **Orchestrator** receives WhatsApp messages, normalizes phone/message, applies rate limiting
2. Loads `agent_configs` and `escalation_rules` from DB (cached per-request)
3. Detects intent via keyword matching (`faq|booking|complaint|payment`)
4. Context-aware routing: ambiguous messages + pending payment → Payment Agent
5. Falls back to Booking Agent as default
6. On errors → escalates to human staff via WhatsApp notification

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
│  ├─ agents/          # Orchestrator + 7 specialized agents
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
