-- Optimize cleanup: match victims by ctid (physical row id) instead of re-joining
-- the text PK. Keeps the same FOR UPDATE SKIP LOCKED batching semantics.
CREATE OR REPLACE FUNCTION public.cleanup_whatsapp_webhook_dedup(p_batch integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_deleted integer := 0;
  batch_deleted integer := 0;
BEGIN
  LOOP
    WITH victims AS (
      SELECT ctid
      FROM public.whatsapp_webhook_dedup
      WHERE expires_at < now() - interval '1 minute'
      ORDER BY expires_at
      LIMIT p_batch
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.whatsapp_webhook_dedup d
    USING victims v
    WHERE d.ctid = v.ctid;
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    total_deleted := total_deleted + batch_deleted;
    EXIT WHEN batch_deleted < p_batch;
  END LOOP;
  RETURN total_deleted;
END;
$function$;

-- Rebuild expires_at index as a covering index so the victim-selection step is
-- index-only (no heap fetch) until the FOR UPDATE row lock is taken. Also adds
-- a NOT NULL guard so the planner can skip null-checks.
ALTER TABLE public.whatsapp_webhook_dedup
  ALTER COLUMN expires_at SET NOT NULL;

DROP INDEX IF EXISTS public.idx_whatsapp_webhook_dedup_expires;
CREATE INDEX idx_whatsapp_webhook_dedup_expires
  ON public.whatsapp_webhook_dedup (expires_at);