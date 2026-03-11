
-- Create enum for OTA providers
CREATE TYPE public.ota_provider AS ENUM ('booking_com', 'agoda', 'traveloka', 'expedia', 'tiket_com', 'other');

-- Create ota_connections table
CREATE TABLE public.ota_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider ota_provider NOT NULL UNIQUE,
  provider_name TEXT NOT NULL DEFAULT '',
  hotel_id TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  password_encrypted TEXT NOT NULL DEFAULT '',
  api_endpoint TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  last_test_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ota_connections ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage OTA connections"
  ON public.ota_connections
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Updated_at trigger
CREATE TRIGGER update_ota_connections_updated_at
  BEFORE UPDATE ON public.ota_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
