-- Auto Cancel Cron Job Migration
-- Created: 2025-02-09
-- Purpose: Setup cron job untuk auto-cancel expired bookings

-- 1. Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Function untuk auto-cancel
CREATE OR REPLACE FUNCTION auto_cancel_expired_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  UPDATE bookings 
  SET 
    status = 'cancelled',
    payment_status = 'expired',
    cancellation_reason = 'Payment timeout - 1 hour expired',
    updated_at = NOW()
  WHERE 
    payment_status = 'pending'
    AND payment_expires_at < NOW()
    AND status = 'pending_payment';
  
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  
  -- Log untuk monitoring
  INSERT INTO payment_security_logs (event_type, details)
  VALUES ('auto_cancel_expired', jsonb_build_object(
    'cancelled_count', cancelled_count,
    'executed_at', NOW()
  ));
  
  RETURN cancelled_count;
END;
$$;

-- 3. Unschedule existing job if exists (untuk avoid duplicate)
SELECT cron.unschedule('auto-cancel-expired-bookings');

-- 4. Schedule cron job (setiap 5 menit)
SELECT cron.schedule(
  'auto-cancel-expired-bookings',
  '*/5 * * * *',
  'SELECT auto_cancel_expired_bookings()'
);

-- 5. Create function untuk manual trigger (untuk admin)
CREATE OR REPLACE FUNCTION trigger_manual_cancel_check()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count INTEGER;
BEGIN
  count := auto_cancel_expired_bookings();
  RETURN format('Checked and cancelled %s expired bookings', count);
END;
$$;

-- 6. Verify cron job
DO $$
DECLARE
  job_record RECORD;
BEGIN
  SELECT * INTO job_record 
  FROM cron.job 
  WHERE jobname = 'auto-cancel-expired-bookings';
  
  IF job_record IS NOT NULL THEN
    RAISE NOTICE '✅ Cron job scheduled successfully: %', job_record.schedule;
  ELSE
    RAISE EXCEPTION '❌ Failed to schedule cron job';
  END IF;
END;
$$;

-- 7. Comments
COMMENT ON FUNCTION auto_cancel_expired_bookings() IS 'Auto-cancel booking yang payment-nya expired lebih dari 1 jam';
COMMENT ON FUNCTION trigger_manual_cancel_check() IS 'Manual trigger untuk testing auto-cancel';
