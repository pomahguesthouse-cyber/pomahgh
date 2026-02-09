-- User Member System Migration
-- Created: 2025-02-09
-- Purpose: Setup user authentication dan booking history tracking

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Relasi booking dengan user
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS guest_email_backup TEXT;

-- 3. Index untuk user bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id) WHERE user_id IS NOT NULL;

-- 4. Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Policies
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

-- 6. Trigger untuk updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Function untuk auto-create profile setelah user register
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

-- 8. Trigger untuk auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 9. Comments
COMMENT ON TABLE user_profiles IS 'Profil user/member untuk tracking booking dan history';
COMMENT ON COLUMN bookings.user_id IS 'Relasi ke user_profiles jika booking dibuat oleh member yang login';
COMMENT ON COLUMN bookings.guest_email_backup IS 'Backup email guest untuk tracking jika user dihapus';

-- 10. Verify
DO $$
BEGIN
  RAISE NOTICE '✅ User Member System migration applied successfully';
END;
$$;
