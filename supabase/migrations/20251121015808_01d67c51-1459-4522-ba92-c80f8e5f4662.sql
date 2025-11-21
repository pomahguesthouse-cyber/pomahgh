-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can create their own bookings" ON bookings;

-- Create new policy for regular users (can only create bookings with their own email)
CREATE POLICY "Users can create their own bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (guest_email = (auth.jwt() ->> 'email'::text));

-- Create new policy for admins (can create any booking)
CREATE POLICY "Admins can create any booking"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (is_admin());