-- Remove the public booking creation policy as we'll use service role instead
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;