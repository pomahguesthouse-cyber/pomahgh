# Edge Functions Catalog

## Overview

Daftar semua Supabase Edge Functions dan purpose-nya.

## Function Categories

### 🤖 AI & Chatbot

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `chatbot` | Guest-facing AI assistant | No |
| `admin-chatbot` | Admin AI with tool calling | Yes (Admin) |
| `chatbot-tools` | Tool execution for chatbot | No |

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
| `send-whatsapp` | Send WhatsApp message via API | No (Internal) |
| `whatsapp-webhook` | Receive WhatsApp webhook events | No (Webhook) |

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
├─ cors.ts       # CORS headers
├─ auth.ts       # Auth helpers
├─ error.ts      # Error response builder
├─ cache.ts      # Memory cache service
├─ logger.ts     # Structured logging
└─ supabase.ts   # Supabase client factory
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `OPENAI_API_KEY` | OpenAI API key (optional) |
| `WHATSAPP_TOKEN` | WhatsApp Business API token |
| `WHATSAPP_PHONE_ID` | WhatsApp phone number ID |

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
