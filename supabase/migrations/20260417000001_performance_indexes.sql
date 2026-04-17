-- ============================================================
-- Performance Indexes
-- Add missing indexes on frequently queried columns
-- ============================================================

-- chat_messages: queried by conversation_id + created_at on EVERY WhatsApp message
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created 
  ON public.chat_messages(conversation_id, created_at);

-- bookings: queried by guest_phone for pending payment checks & context extraction
CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone 
  ON public.bookings(guest_phone);

-- bookings: queried by booking_code for get_booking_details tool
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code 
  ON public.bookings(booking_code);

-- chat_conversations: queried by session_id for learning agent (wa_* pattern)
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id 
  ON public.chat_conversations(session_id text_pattern_ops);
