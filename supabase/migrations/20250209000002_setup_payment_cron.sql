-- Setup Cron Job for Payment Expiry Checker
-- This will run every 5 minutes to check and expire old pending payments

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if exists (to avoid duplicates)
SELECT cron.unschedule('payment-expiry-checker');

-- Schedule the cron job
-- Runs every 5 minutes
SELECT cron.schedule(
  'payment-expiry-checker',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/payment-expiry-checker',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
        'Content-Type', 'application/json'
      )
    )
  $$
);

-- Verify cron job was created
SELECT 
  jobname,
  schedule,
  active,
  jobid
FROM cron.job 
WHERE jobname = 'payment-expiry-checker';

-- Create function to manually trigger expiry check (for admin use)
CREATE OR REPLACE FUNCTION trigger_payment_expiry_check()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result TEXT;
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/payment-expiry-checker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
      'Content-Type', 'application/json'
    )
  );
  
  RETURN 'Payment expiry check triggered successfully';
END;
$$;

COMMENT ON FUNCTION trigger_payment_expiry_check() IS 'Manually trigger the payment expiry checker';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Cron job scheduled: payment-expiry-checker (runs every 5 minutes)';
END;
$$;
