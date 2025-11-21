-- Add RLS policy to allow public booking creation through chatbot
CREATE POLICY "Anyone can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (true);