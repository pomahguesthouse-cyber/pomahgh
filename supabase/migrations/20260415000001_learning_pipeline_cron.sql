-- Enable pg_cron and pg_net extensions (required for HTTP-based cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add pipeline tracking columns to whatsapp_learning_metrics (safe: IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_learning_metrics' AND column_name = 'pipeline_run_id') THEN
    ALTER TABLE whatsapp_learning_metrics ADD COLUMN pipeline_run_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_learning_metrics' AND column_name = 'pipeline_duration_ms') THEN
    ALTER TABLE whatsapp_learning_metrics ADD COLUMN pipeline_duration_ms integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_learning_metrics' AND column_name = 'pipeline_success') THEN
    ALTER TABLE whatsapp_learning_metrics ADD COLUMN pipeline_success boolean;
  END IF;
END $$;

-- Schedule: Run learning pipeline daily at 03:00 WIB (20:00 UTC)
-- Uses pg_net to call the edge function with CRON_SECRET auth
SELECT cron.schedule(
  'learning-pipeline-daily',
  '0 20 * * *',  -- 03:00 WIB = 20:00 UTC
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/whatsapp-learning-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    ),
    body := '{"mode": "auto_pipeline"}'::jsonb
  );
  $$
);
