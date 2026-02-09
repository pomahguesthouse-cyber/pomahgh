-- Create payment_refunds table for tracking refunds
-- Migration: 20250209000003_payment_refunds

CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  refund_id TEXT NOT NULL UNIQUE,
  merchant_order_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  duitku_response JSONB,
  processed_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access payment_refunds"
  ON payment_refunds
  FOR ALL
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_payment_refunds_updated_at
  BEFORE UPDATE ON payment_refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_refunds_transaction 
  ON payment_refunds(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_status 
  ON payment_refunds(status);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_created_at 
  ON payment_refunds(created_at DESC);

-- Add refunded_amount column to payment_transactions
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC DEFAULT 0;

-- Update constraint to allow partially_refunded status
ALTER TABLE payment_transactions 
DROP CONSTRAINT IF EXISTS payment_transactions_status_check;

ALTER TABLE payment_transactions 
ADD CONSTRAINT payment_transactions_status_check 
  CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded', 'partially_refunded'));

-- Add comments
COMMENT ON TABLE payment_refunds IS 'Stores refund records for payment transactions';
COMMENT ON COLUMN payment_refunds.refund_id IS 'Unique refund identifier from Duitku';
COMMENT ON COLUMN payment_refunds.status IS 'Refund status: pending, completed, or failed';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Payment refunds table and improvements created successfully';
END;
$$;
