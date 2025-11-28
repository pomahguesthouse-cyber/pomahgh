-- Add UPDATE policy for room_unavailable_dates to support upsert operations
CREATE POLICY "Admin can update unavailable dates"
ON public.room_unavailable_dates
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());