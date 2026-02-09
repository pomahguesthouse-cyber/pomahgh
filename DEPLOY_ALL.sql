-- ============================================================================
-- INLINE BCA VA PAYMENT + USER MEMBER SYSTEM - COMPLETE DEPLOYMENT
-- ============================================================================
-- Run this in Supabase SQL Editor (in order)
-- Last Updated: 2025-02-09
-- ============================================================================

-- ============================================================================
-- PART 1: INLINE BCA PAYMENT SETUP
-- ============================================================================

-- 1.1 Extend bookings table untuk inline payment
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS va_number TEXT,
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bank_code TEXT DEFAULT 'BCA',
ADD COLUMN IF NOT EXISTS is_inline_payment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 1.2 Extend payment_transactions
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS is_inline BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS bank_code TEXT;

-- 1.3 Index untuk performance
CREATE INDEX IF NOT EXISTS idx_bookings_pending_payment 
ON bookings(payment_expires_at) 
WHERE payment_status = 'pending' AND status = 'pending_payment';

CREATE INDEX IF NOT EXISTS idx_bookings_va_number 
ON bookings(va_number) 
WHERE va_number IS NOT NULL;

-- 1.4 Comments
COMMENT ON COLUMN bookings.va_number IS 'BCA Virtual Account number untuk pembayaran inline';
COMMENT ON COLUMN bookings.payment_expires_at IS 'Waktu kadaluarsa pembayaran (1 jam dari booking)';
COMMENT ON COLUMN bookings.is_inline_payment IS 'Flag untuk menandai booking dengan inline payment';

-- ============================================================================
-- PART 2: USER MEMBER SYSTEM
-- ============================================================================

-- 2.1 Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 Relasi booking dengan user
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS guest_email_backup TEXT;

-- 2.3 Index untuk user bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id) WHERE user_id IS NOT NULL;

-- 2.4 Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 2.5 Policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 2.6 Trigger untuk updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2.7 Function untuk auto-create profile setelah user register
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.8 Trigger untuk auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 3: AUTO CANCEL CRON JOB
-- ============================================================================

-- 3.1 Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3.2 Function untuk auto-cancel
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

-- 3.3 Unschedule existing job if exists
SELECT cron.unschedule('auto-cancel-expired-bookings');

-- 3.4 Schedule cron job (setiap 5 menit)
SELECT cron.schedule(
  'auto-cancel-expired-bookings',
  '*/5 * * * *',
  'SELECT auto_cancel_expired_bookings()'
);

-- 3.5 Create function untuk manual trigger
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

-- ============================================================================
-- PART 4: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  booking_cols INTEGER;
  user_profiles_exists BOOLEAN;
  cron_job_exists BOOLEAN;
BEGIN
  -- Check bookings columns
  SELECT COUNT(*) INTO booking_cols
  FROM information_schema.columns
  WHERE table_name = 'bookings'
  AND column_name IN ('va_number', 'payment_expires_at', 'is_inline_payment');
  
  -- Check user_profiles
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_profiles'
  ) INTO user_profiles_exists;
  
  -- Check cron job
  SELECT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'auto-cancel-expired-bookings'
  ) INTO cron_job_exists;
  
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'DEPLOYMENT STATUS:';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE '✅ Bookings table extended: % columns added', booking_cols;
  RAISE NOTICE '✅ User profiles table: %', CASE WHEN user_profiles_exists THEN 'CREATED' ELSE 'FAILED' END;
  RAISE NOTICE '✅ Auto-cancel cron job: %', CASE WHEN cron_job_exists THEN 'SCHEDULED' ELSE 'FAILED' END;
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Deployment completed successfully!';
  RAISE NOTICE '=============================================================';
END;
$$;
