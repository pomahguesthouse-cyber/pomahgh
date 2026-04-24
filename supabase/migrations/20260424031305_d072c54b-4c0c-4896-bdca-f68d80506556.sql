CREATE OR REPLACE FUNCTION public.increment_conversation_message_count(conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET message_count = COALESCE(message_count, 0) + 1
  WHERE id = conv_id;
END;
$$;

-- Berikan akses execute untuk service role dan authenticated agar webhook & UI bisa memanggilnya
GRANT EXECUTE ON FUNCTION public.increment_conversation_message_count(uuid) TO service_role, authenticated, anon;