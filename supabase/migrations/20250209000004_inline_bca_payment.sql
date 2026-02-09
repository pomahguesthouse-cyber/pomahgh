-- Inline BCA VA Payment Migration
-- Created: 2025-02-09
-- Purpose: Setup inline payment system with BCA VA

-- 1. Extend bookings table untuk inline payment
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS va_number TEXT,
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bank_code TEXT DEFAULT 'BCA',
ADD COLUMN IF NOT EXISTS is_inline_payment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. Extend payment_transactions
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS is_inline BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS bank_code TEXT;

-- 3. Index untuk performance
CREATE INDEX IF NOT EXISTS idx_bookings_pending_payment 
ON bookings(payment_expires_at) 
WHERE payment_status = 'pending' AND status = 'pending_payment';

CREATE INDEX IF NOT EXISTS idx_bookings_va_number 
ON bookings(va_number) 
WHERE va_number IS NOT NULL;

-- 4. Update constraint
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS check_inline_payment_fields;

ALTER TABLE bookings 
ADD CONSTRAINT check_inline_payment_fields 
CHECK (
  (is_inline_payment = true AND va_number IS NOT NULL AND payment_expires_at IS NOT NULL) OR
  (is_inline_payment = false) OR
  (is_inline_payment IS NULL)
);

-- 5. Add comments
COMMENT ON COLUMN bookings.va_number IS 'BCA Virtual Account number untuk pembayaran inline';
COMMENT ON COLUMN bookings.payment_expires_at IS 'Waktu kadaluarsa pembayaran (1 jam dari booking)';
COMMENT ON COLUMN bookings.is_inline_payment IS 'Flag untuk menandai booking dengan inline payment';

-- 6. Verify
DO $$
BEGIN
  RAISE NOTICE '✅ Inline BCA Payment migration applied successfully';
END;
$$;
