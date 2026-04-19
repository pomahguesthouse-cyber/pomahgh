CREATE OR REPLACE FUNCTION public.sync_payment_amount_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Saat payment_status berubah ke 'paid' dan amount masih 0/null, isi dengan total_price
  IF NEW.payment_status = 'paid' 
     AND (NEW.payment_amount IS NULL OR NEW.payment_amount = 0)
     AND NEW.total_price > 0 THEN
    NEW.payment_amount := NEW.total_price;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payment_amount_on_paid ON public.bookings;

CREATE TRIGGER trg_sync_payment_amount_on_paid
BEFORE INSERT OR UPDATE OF payment_status, payment_amount ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.sync_payment_amount_on_paid();