-- Fix search_path for allocate_room_number function
CREATE OR REPLACE FUNCTION allocate_room_number(p_room_id uuid, p_check_in date, p_check_out date)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_room_number text;
  v_available_numbers text[];
BEGIN
  -- Get all room numbers for this room type
  SELECT room_numbers INTO v_available_numbers
  FROM rooms
  WHERE id = p_room_id;
  
  -- Find a room number that is not booked for the given dates
  SELECT rn INTO v_room_number
  FROM unnest(v_available_numbers) AS rn
  WHERE rn NOT IN (
    SELECT allocated_room_number
    FROM bookings
    WHERE room_id = p_room_id
      AND allocated_room_number IS NOT NULL
      AND status NOT IN ('cancelled', 'rejected')
      AND (
        (check_in <= p_check_in AND check_out > p_check_in)
        OR (check_in < p_check_out AND check_out >= p_check_out)
        OR (check_in >= p_check_in AND check_out <= p_check_out)
      )
  )
  LIMIT 1;
  
  RETURN v_room_number;
END;
$$;

-- Fix search_path for auto_allocate_room_number trigger function
CREATE OR REPLACE FUNCTION auto_allocate_room_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.allocated_room_number IS NULL THEN
    NEW.allocated_room_number := allocate_room_number(NEW.room_id, NEW.check_in, NEW.check_out);
  END IF;
  RETURN NEW;
END;
$$;