-- Fix booking PMH-9QBEJR: insert booking_rooms + booking_addons + correct total_price
DO $$
DECLARE
  v_booking_id UUID;
  v_room_id UUID;
  v_addon_id UUID := 'ba80ebb1-696e-48c9-9274-cfa45d416711'; -- Extra Bed for Deluxe
BEGIN
  SELECT id, room_id INTO v_booking_id, v_room_id
  FROM public.bookings
  WHERE booking_code = 'PMH-9QBEJR';

  IF v_booking_id IS NULL THEN
    RAISE NOTICE 'Booking PMH-9QBEJR not found, skipping';
    RETURN;
  END IF;

  -- Insert booking_rooms only if missing
  IF NOT EXISTS (SELECT 1 FROM public.booking_rooms WHERE booking_id = v_booking_id) THEN
    INSERT INTO public.booking_rooms (booking_id, room_id, room_number, price_per_night)
    VALUES (v_booking_id, v_room_id, '204', 260000);
  END IF;

  -- Insert booking_addons only if missing
  IF NOT EXISTS (SELECT 1 FROM public.booking_addons WHERE booking_id = v_booking_id AND addon_id = v_addon_id) THEN
    INSERT INTO public.booking_addons (booking_id, addon_id, quantity, unit_price, total_price)
    VALUES (v_booking_id, v_addon_id, 1, 100000, 100000);
  END IF;

  -- Correct total_price = 260.000 (room) + 100.000 (extra bed) = 360.000
  UPDATE public.bookings
  SET total_price = 360000,
      updated_at = NOW()
  WHERE id = v_booking_id;
END $$;