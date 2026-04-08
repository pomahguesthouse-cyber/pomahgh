CREATE OR REPLACE FUNCTION public.append_pending_message(p_phone text, p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE whatsapp_sessions
  SET 
    pending_messages = array_append(COALESCE(pending_messages, '{}'), p_message),
    pending_since = COALESCE(pending_since, now())
  WHERE phone_number = p_phone;
END;
$$;