-- Add UPDATE and DELETE RLS policies for bookings
-- Allow authenticated guests to modify or cancel their own bookings

-- Policy for updating own bookings
CREATE POLICY "Users can update their own bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (guest_email = (auth.jwt() ->> 'email'))
WITH CHECK (guest_email = (auth.jwt() ->> 'email'));

-- Policy for deleting own bookings
CREATE POLICY "Users can delete their own bookings"
ON public.bookings
FOR DELETE
TO authenticated
USING (guest_email = (auth.jwt() ->> 'email'));