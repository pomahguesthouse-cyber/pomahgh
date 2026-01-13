-- Drop the overly permissive policy that exposes phone numbers
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.whatsapp_sessions;

-- Create a more restrictive policy for authenticated admins only
-- The webhook will use supabase service role client which bypasses RLS
-- So we don't need a separate policy for webhook access

-- Ensure the admin policy is working correctly
DROP POLICY IF EXISTS "Admins can manage whatsapp sessions" ON public.whatsapp_sessions;

CREATE POLICY "Admins can manage whatsapp sessions"
ON public.whatsapp_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);