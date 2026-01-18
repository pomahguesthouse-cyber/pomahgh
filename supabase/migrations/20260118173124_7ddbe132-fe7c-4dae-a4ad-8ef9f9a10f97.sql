-- Add remark column for internal booking notes
ALTER TABLE public.bookings 
ADD COLUMN remark TEXT;

COMMENT ON COLUMN public.bookings.remark IS 'Keterangan/catatan internal untuk booking (contoh: Acara Wisuda, Anniversary)';