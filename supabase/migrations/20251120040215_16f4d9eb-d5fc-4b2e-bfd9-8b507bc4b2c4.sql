-- Add payment tracking to bookings
ALTER TABLE bookings 
ADD COLUMN payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'down_payment', 'unpaid', 'pay_at_hotel')),
ADD COLUMN payment_amount numeric DEFAULT 0;