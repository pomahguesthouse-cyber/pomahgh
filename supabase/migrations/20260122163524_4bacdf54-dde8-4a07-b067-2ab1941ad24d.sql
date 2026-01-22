-- Create manager_access_tokens table for token-based calendar access
CREATE TABLE public.manager_access_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for fast token lookups
CREATE INDEX idx_manager_access_tokens_token ON public.manager_access_tokens(token);
CREATE INDEX idx_manager_access_tokens_active ON public.manager_access_tokens(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.manager_access_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can validate tokens (needed for public access)
CREATE POLICY "Anyone can validate tokens"
ON public.manager_access_tokens
FOR SELECT
USING (true);

-- Policy: Only admins can manage tokens
CREATE POLICY "Admins can insert tokens"
ON public.manager_access_tokens
FOR INSERT
WITH CHECK (
  public.get_manager_role(auth.uid()) IN ('super_admin', 'admin')
);

CREATE POLICY "Admins can update tokens"
ON public.manager_access_tokens
FOR UPDATE
USING (
  public.get_manager_role(auth.uid()) IN ('super_admin', 'admin')
);

CREATE POLICY "Admins can delete tokens"
ON public.manager_access_tokens
FOR DELETE
USING (
  public.get_manager_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Function to generate secure random token
CREATE OR REPLACE FUNCTION public.generate_manager_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  new_token TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    new_token := new_token || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN new_token;
END;
$$;

-- Insert a default token for testing (can be removed in production)
INSERT INTO public.manager_access_tokens (token, name, is_active)
VALUES (public.generate_manager_token(), 'Default Manager Token', true);