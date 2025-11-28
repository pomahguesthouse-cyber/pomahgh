-- Add booking_code column to bookings table
ALTER TABLE bookings ADD COLUMN booking_code TEXT UNIQUE;

-- Function to generate simple 6-character alphanumeric booking code
CREATE OR REPLACE FUNCTION generate_booking_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Avoid I, O, 0, 1 for clarity
  new_code TEXT;
  i INTEGER;
BEGIN
  LOOP
    -- Generate PMH-XXXXXX format
    new_code := 'PMH-';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM bookings WHERE booking_code = new_code) THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- Trigger function to auto-generate booking_code on insert
CREATE OR REPLACE FUNCTION auto_generate_booking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.booking_code IS NULL THEN
    NEW.booking_code := generate_booking_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_auto_booking_code
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_booking_code();

-- Generate codes for existing bookings
UPDATE bookings SET booking_code = generate_booking_code() WHERE booking_code IS NULL;

-- Make booking_code NOT NULL
ALTER TABLE bookings ALTER COLUMN booking_code SET NOT NULL;