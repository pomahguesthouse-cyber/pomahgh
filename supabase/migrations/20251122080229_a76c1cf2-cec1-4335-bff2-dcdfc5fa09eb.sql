-- Create invoice_logs table for tracking invoice deliveries
CREATE TABLE IF NOT EXISTS invoice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_to_email TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  sent_to_whatsapp TEXT,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add invoice columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS last_invoice_sent_at TIMESTAMP WITH TIME ZONE;

-- Create function to generate sequential invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  today TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
  counter INTEGER;
BEGIN
  -- Get the highest counter for today, or start at 0
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO counter
  FROM bookings
  WHERE invoice_number LIKE 'INV-' || today || '-%';
  
  RETURN 'INV-' || today || '-' || LPAD(counter::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on invoice_logs
ALTER TABLE invoice_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all invoice logs
CREATE POLICY "Admins can view all invoice logs"
ON invoice_logs FOR SELECT
USING (is_admin());

-- Users can view their own invoice logs
CREATE POLICY "Users can view their own invoice logs"
ON invoice_logs FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE guest_email = (auth.jwt() ->> 'email')
  )
);

-- Admins can insert invoice logs
CREATE POLICY "Admins can insert invoice logs"
ON invoice_logs FOR INSERT
WITH CHECK (is_admin());

-- Add invoice settings to hotel_settings
ALTER TABLE hotel_settings 
ADD COLUMN IF NOT EXISTS auto_send_invoice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS invoice_footer_text TEXT DEFAULT 'Terima kasih telah memilih Pomah Guesthouse. Kami menantikan kedatangan Anda!',
ADD COLUMN IF NOT EXISTS payment_instructions TEXT DEFAULT 'Silakan transfer ke rekening BCA: 1234567890 a.n. Pomah Guesthouse';

-- Create index for faster invoice lookups
CREATE INDEX IF NOT EXISTS idx_bookings_invoice_number ON bookings(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_logs_booking_id ON invoice_logs(booking_id);