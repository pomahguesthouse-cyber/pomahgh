-- Create bank_accounts table for multiple payment methods
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active bank accounts"
  ON public.bank_accounts
  FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert bank accounts"
  ON public.bank_accounts
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update bank accounts"
  ON public.bank_accounts
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete bank accounts"
  ON public.bank_accounts
  FOR DELETE
  USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();