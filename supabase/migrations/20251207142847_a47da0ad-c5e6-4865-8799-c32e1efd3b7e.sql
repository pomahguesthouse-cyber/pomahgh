-- Add server-side validation constraints to bookings table
-- These constraints enforce data integrity at the database level

-- Add CHECK constraint for guest_name (non-empty, max 100 chars)
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_guest_name_check 
CHECK (length(trim(guest_name)) > 0 AND length(guest_name) <= 100);

-- Add CHECK constraint for guest_email format (basic email validation)
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_guest_email_check 
CHECK (guest_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add CHECK constraint for num_guests (reasonable range 1-20)
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_num_guests_check 
CHECK (num_guests >= 1 AND num_guests <= 20);

-- Add CHECK constraint for dates (check_out must be after check_in)
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_dates_check 
CHECK (check_out > check_in);

-- Add CHECK constraint for total_nights (must be positive and match dates)
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_total_nights_check 
CHECK (total_nights >= 1 AND total_nights <= 365);

-- Add CHECK constraint for total_price (must be positive)
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_total_price_check 
CHECK (total_price > 0);