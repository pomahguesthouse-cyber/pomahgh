UPDATE public.whatsapp_sessions
SET is_takeover = false,
    takeover_at = NULL
WHERE phone_number = '6282226749990';