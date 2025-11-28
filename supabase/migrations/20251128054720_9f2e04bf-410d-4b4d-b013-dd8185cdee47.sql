-- Add DEFAULT to booking_code column so it becomes optional in TypeScript
ALTER TABLE bookings 
ALTER COLUMN booking_code SET DEFAULT generate_booking_code();