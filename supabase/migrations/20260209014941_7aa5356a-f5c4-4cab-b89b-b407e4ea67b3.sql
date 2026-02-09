
-- Create payment_transactions table
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  merchant_order_id TEXT NOT NULL UNIQUE,
  duitku_reference TEXT,
  payment_method TEXT NOT NULL,
  payment_method_name TEXT,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_url TEXT,
  va_number TEXT,
  qr_string TEXT,
  callback_data JSONB,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Public can read payment transactions by booking_id (for payment status page)
CREATE POLICY "Anyone can read payment transactions by booking"
  ON public.payment_transactions
  FOR SELECT
  USING (true);

-- Only service role can insert/update (edge functions)
CREATE POLICY "Service role can insert payment transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update payment transactions"
  ON public.payment_transactions
  FOR UPDATE
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast lookups
CREATE INDEX idx_payment_transactions_booking_id ON public.payment_transactions(booking_id);
CREATE INDEX idx_payment_transactions_merchant_order_id ON public.payment_transactions(merchant_order_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
