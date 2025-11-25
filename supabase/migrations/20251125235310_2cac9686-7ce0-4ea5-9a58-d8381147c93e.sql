-- Add CHECK constraints for server-side validation on bookings table
ALTER TABLE public.bookings 
  ADD CONSTRAINT chk_guest_name_length 
  CHECK (length(guest_name) > 0 AND length(guest_name) <= 100);

ALTER TABLE public.bookings 
  ADD CONSTRAINT chk_guest_email_format 
  CHECK (guest_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.bookings 
  ADD CONSTRAINT chk_num_guests_range 
  CHECK (num_guests >= 1 AND num_guests <= 20);

ALTER TABLE public.bookings 
  ADD CONSTRAINT chk_valid_dates 
  CHECK (check_out > check_in);

ALTER TABLE public.bookings 
  ADD CONSTRAINT chk_positive_price 
  CHECK (total_price >= 0);