-- Fix search_path for generate_invoice_number function
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
  counter INTEGER;
BEGIN
  -- Get the highest counter for today, or start at 0
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO counter
  FROM bookings
  WHERE invoice_number LIKE 'INV-' || today || '-%';
  
  RETURN 'INV-' || today || '-' || LPAD(counter::TEXT, 4, '0');
END;
$$;