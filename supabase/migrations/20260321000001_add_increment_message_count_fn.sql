-- Atomic message count increment for chat_conversations
-- Used by whatsapp-webhook logMessage helper to avoid SELECT+UPDATE race condition
CREATE OR REPLACE FUNCTION increment_conversation_message_count(conv_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE chat_conversations
  SET message_count = COALESCE(message_count, 0) + 1
  WHERE id = conv_id;
$$;
