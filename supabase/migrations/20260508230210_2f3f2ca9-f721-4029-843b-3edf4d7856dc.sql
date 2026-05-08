-- 1. Drop unused secondary index — all reads/writes happen via PK (dedup_key).
--    Removing it reduces write amplification on every webhook hit.
DROP INDEX IF EXISTS public.idx_whatsapp_webhook_dedup_phone;

-- 2. Keep range index on expires_at, but make sure it exists (idempotent).
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_dedup_expires
  ON public.whatsapp_webhook_dedup (expires_at);

-- 3. Replace cleanup with a batched, lock-friendly version.
--    Deletes up to p_batch rows per call so it never blocks live upserts for long.
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
      SELECT dedup_key
      FROM public.whatsapp_webhook_dedup
      WHERE expires_at < now() - interval '1 minute'
      ORDER BY expires_at
      LIMIT p_batch
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.whatsapp_webhook_dedup d
    USING victims v
    WHERE d.dedup_key = v.dedup_key;
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    total_deleted := total_deleted + batch_deleted;
    EXIT WHEN batch_deleted < p_batch;
  END LOOP;
  RETURN total_deleted;
END;
$function$;

-- 4. Schedule cleanup every 5 minutes via pg_cron (idempotent).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-whatsapp-webhook-dedup') THEN
    PERFORM cron.unschedule('cleanup-whatsapp-webhook-dedup');
  END IF;
  PERFORM cron.schedule(
    'cleanup-whatsapp-webhook-dedup',
    '*/5 * * * *',
    $cron$ SELECT public.cleanup_whatsapp_webhook_dedup(5000); $cron$
  );
END$$;