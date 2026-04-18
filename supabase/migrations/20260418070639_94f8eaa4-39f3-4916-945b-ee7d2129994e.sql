
CREATE TABLE public.payment_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  phone TEXT,
  image_url TEXT NOT NULL,
  is_payment_proof BOOLEAN DEFAULT true,
  confidence TEXT,
  amount NUMERIC,
  sender_name TEXT,
  bank_name TEXT,
  transfer_date TEXT,
  reference_number TEXT,
  notes TEXT,
  raw_extraction JSONB,
  source TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_proofs_booking_id ON public.payment_proofs(booking_id);
CREATE INDEX idx_payment_proofs_created_at ON public.payment_proofs(created_at DESC);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment proofs"
ON public.payment_proofs FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can insert payment proofs"
ON public.payment_proofs FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update payment proofs"
ON public.payment_proofs FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete payment proofs"
ON public.payment_proofs FOR DELETE
USING (is_admin());

CREATE POLICY "Service role can insert payment proofs"
ON public.payment_proofs FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_payment_proofs_updated_at
BEFORE UPDATE ON public.payment_proofs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
