-- Bookings: filter & sort hot paths
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings (payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_source ON public.bookings (booking_source);
-- Composite for the most common admin query (room + date overlap + active status)
CREATE INDEX IF NOT EXISTS idx_bookings_room_checkin_checkout
  ON public.bookings (room_id, check_in, check_out)
  WHERE status NOT IN ('cancelled', 'rejected');

-- Chat messages: fetch by conversation, ordered by time
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id
  ON public.chat_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON public.chat_messages (created_at DESC);

-- Chat conversations: session lookup and analytics
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id
  ON public.chat_conversations (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_started_at
  ON public.chat_conversations (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_analyzed
  ON public.chat_conversations (analyzed_for_training)
  WHERE analyzed_for_training = false;