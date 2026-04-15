-- =====================================================
-- Fix #4: Session cleanup cron job
-- Fix #9: Orphaned chat_messages cascade on conversation delete
-- =====================================================

-- 1. Add ON DELETE CASCADE to chat_messages → chat_conversations FK
-- Drop existing FK (unnamed default) and re-add with cascade
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_conversation_id_fkey;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id)
  ON DELETE CASCADE;

-- 2. Session cleanup function
-- Marks stale sessions as inactive, cleans up old ended conversations
CREATE OR REPLACE FUNCTION cleanup_stale_sessions() RETURNS void AS $$
BEGIN
  -- Mark sessions inactive if no activity for 24 hours
  UPDATE public.whatsapp_sessions
  SET is_active = false
  WHERE is_active = true
    AND last_message_at < now() - interval '24 hours';

  -- Clear pending message buffers older than 1 hour (stuck batches)
  UPDATE public.whatsapp_sessions
  SET pending_messages = '{}', pending_since = null
  WHERE pending_since IS NOT NULL
    AND pending_since < now() - interval '1 hour';

  -- Archive/delete very old inactive sessions (90 days)
  DELETE FROM public.whatsapp_sessions
  WHERE is_active = false
    AND last_message_at < now() - interval '90 days';

  -- Clean up conversations with no messages older than 7 days
  DELETE FROM public.chat_conversations
  WHERE message_count = 0
    AND started_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule session cleanup daily at 05:00 WIB (22:00 UTC)
SELECT cron.schedule(
  'cleanup-stale-sessions-daily',
  '0 22 * * *',
  'SELECT cleanup_stale_sessions()'
);
