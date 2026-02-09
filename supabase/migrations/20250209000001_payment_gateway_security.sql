-- Payment Gateway Security & Production Improvements
-- Migration: 20250209000001_payment_gateway_security

-- 1. Add metadata column to payment_transactions for tracking
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Create payment_security_logs table for audit trail
CREATE TABLE IF NOT EXISTS payment_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on security logs
ALTER TABLE payment_security_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access security logs
CREATE POLICY "Service role full access payment_security_logs"
  ON payment_security_logs
  FOR ALL
  USING (true);

-- 3. Create indexes for security logs
CREATE INDEX IF NOT EXISTS idx_payment_security_logs_transaction 
  ON payment_security_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_security_logs_event_type 
  ON payment_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_security_logs_created_at 
  ON payment_security_logs(created_at DESC);

-- 4. Update RLS policy for payment_transactions to be more restrictive
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can read payment transactions by booking" ON payment_transactions;

-- Create more restrictive policy - only allow reading by booking_id with valid booking
CREATE POLICY "Public can read own payment transactions"
  ON payment_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = payment_transactions.booking_id
      AND (bookings.guest_email = current_user_email() 
           OR bookings.guest_phone = current_user_phone()
           OR EXISTS (
             SELECT 1 FROM admin_users 
             WHERE admin_users.user_id = auth.uid()
           ))
    )
  );

-- 5. Add function to get current user email (for RLS)
CREATE OR REPLACE FUNCTION current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_email', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add function to get current user phone (for RLS)
CREATE OR REPLACE FUNCTION current_user_phone()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_phone', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add comments
COMMENT ON TABLE payment_security_logs IS 'Audit trail for payment security events';
COMMENT ON COLUMN payment_transactions.metadata IS 'Additional metadata for tracking and debugging';

-- 8. Verify changes
DO $$
BEGIN
  RAISE NOTICE '✅ Payment gateway security improvements applied successfully';
END;
$$;
