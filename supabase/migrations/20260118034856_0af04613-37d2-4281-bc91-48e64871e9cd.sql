-- Fix search_console_credentials RLS policy to restrict to admins only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated access" ON public.search_console_credentials;

-- Create admin-only policies for search_console_credentials
CREATE POLICY "Admins can manage search console credentials"
  ON public.search_console_credentials
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Also fix search_console_rankings to be admin-only
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.search_console_rankings;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.search_console_rankings;
DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.search_console_rankings;

CREATE POLICY "Admins can manage search console rankings"
  ON public.search_console_rankings
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());