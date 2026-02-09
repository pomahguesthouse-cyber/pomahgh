
-- 1. Add inline payment columns to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS va_number TEXT,
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bank_code TEXT DEFAULT 'BCA',
ADD COLUMN IF NOT EXISTS is_inline_payment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS guest_email_backup TEXT;

-- 2. Add inline columns to payment_transactions
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS is_inline BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_code TEXT;

-- 3. Create index for pending payment lookups
CREATE INDEX IF NOT EXISTS idx_bookings_pending_payment 
ON bookings(payment_expires_at) 
WHERE payment_status = 'pending' AND status = 'pending_payment';

-- 4. Create user_profiles table for member system
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Add foreign key from bookings to user_profiles
ALTER TABLE bookings 
ADD CONSTRAINT bookings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- 6. Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, phone_number)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Create payment_security_logs table
CREATE TABLE IF NOT EXISTS public.payment_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_security_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/read security logs
CREATE POLICY "Service role only for security logs"
  ON public.payment_security_logs FOR ALL
  USING (false);

-- 9. Auto-cancel function (database-level)
CREATE OR REPLACE FUNCTION public.auto_cancel_expired_bookings()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  UPDATE bookings 
  SET status = 'cancelled', 
      payment_status = 'expired', 
      cancellation_reason = 'Payment timeout - 1 hour expired',
      updated_at = now()
  WHERE payment_status = 'pending' 
    AND payment_expires_at < NOW() 
    AND status = 'pending_payment';
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RETURN cancelled_count;
END;
$$;
