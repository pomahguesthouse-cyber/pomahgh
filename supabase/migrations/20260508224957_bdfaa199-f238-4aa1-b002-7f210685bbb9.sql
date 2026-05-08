-- Persistent webhook deduplication store for WhatsApp messages.
-- Used by whatsapp-webhook edge function to suppress retries / repeated identical text
-- across worker isolates and cold starts.

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_dedup (
  dedup_key TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_dedup_expires
  ON public.whatsapp_webhook_dedup (expires_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_dedup_phone
  ON public.whatsapp_webhook_dedup (phone_number, expires_at DESC);

ALTER TABLE public.whatsapp_webhook_dedup ENABLE ROW LEVEL SECURITY;

-- No public policies: only service role (used by edge function) may access this table.
-- This is a system-internal table, never read by client apps.

-- Cleanup helper: remove expired rows. Edge function calls this opportunistically.
CREATE OR REPLACE FUNCTION public.cleanup_whatsapp_webhook_dedup()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.whatsapp_webhook_dedup
  WHERE expires_at < now() - INTERVAL '1 minute';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;