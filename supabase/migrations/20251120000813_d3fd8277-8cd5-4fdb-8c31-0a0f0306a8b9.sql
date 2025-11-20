-- Fix the critical security flaw in bookings table RLS policy
-- Remove the 'OR true' condition that makes all bookings publicly readable

-- Drop the existing flawed policy
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;

-- Create a secure policy that only allows authenticated users to view their own bookings
CREATE POLICY "Users can view their own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (guest_email = (auth.jwt() ->> 'email'));
