-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admin can view unavailable dates" ON public.room_unavailable_dates;

-- Create new permissive policy (default is PERMISSIVE)
CREATE POLICY "Admin can view unavailable dates"
ON public.room_unavailable_dates
FOR SELECT
TO authenticated
USING (is_admin());