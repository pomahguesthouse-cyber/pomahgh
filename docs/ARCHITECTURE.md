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
│  ├─ Admin Panel (Dashboard, Bookings, Settings)                 │
│  └─ Chatbot Widget (Guest & Admin)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                            │
├─────────────────────────────────────────────────────────────────┤
│  Edge Functions                    │  Database (PostgreSQL)     │
│  ├─ chatbot (Guest AI)            │  ├─ bookings               │
│  ├─ admin-chatbot (Admin AI)      │  ├─ rooms                  │
│  ├─ chatbot-tools                 │  ├─ hotel_settings         │
│  ├─ generate-invoice              │  ├─ room_promotions        │
│  ├─ notify-new-booking            │  ├─ chat_conversations     │
│  ├─ send-whatsapp                 │  └─ ...                    │
│  └─ ...                           │                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│  ├─ Lovable AI Gateway (OpenAI/Gemini)                          │
│  ├─ WhatsApp Business API                                       │
│  └─ Channel Managers (OTA integrations)                         │
└─────────────────────────────────────────────────────────────────┘
```

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
├─ _shared/            # Shared edge function utilities
├─ chatbot/            # Guest chatbot
├─ admin-chatbot/      # Admin chatbot
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
